import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runPipeline } from "@/lib/ai/agents/orchestrator";
import type { PipelineEvent } from "@/lib/ai/agents/types";
import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  jobId: z.string().uuid(),
});

async function requireUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error && error.name === "AuthSessionMissingError") {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    if (error) throw error;
    if (!user) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true, userId: user.id };
  } catch (err) {
    console.error("[generate:auth:ERROR]", err);
    return { ok: false, response: NextResponse.json({ error: "Auth failure" }, { status: 500 }) };
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const rate = await consumeRateLimit(userId, "generate");
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Rate limit reached. Try again in ~${Math.ceil(rate.retryAfter / 60)} minute(s).`,
        retryAfter: rate.retryAfter,
      },
      {
        status: 429,
        headers: { ...rateLimitHeaders(rate), "Retry-After": String(rate.retryAfter) },
      },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid body: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  // Fetch job + preferences upfront (outside the stream) so we can fail-fast with a clean error.
  let job: typeof schema.jobListings.$inferSelect | undefined;
  let prefs: typeof schema.userPreferences.$inferSelect | undefined;
  let matchScore: number | null = null;
  try {
    const [jobRow] = await db()
      .select()
      .from(schema.jobListings)
      .where(eq(schema.jobListings.id, body.jobId))
      .limit(1);
    job = jobRow;

    const [prefRow] = await db()
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
      .limit(1);
    prefs = prefRow;

    const [scoreRow] = await db()
      .select({ matchScore: schema.userJobScores.matchScore })
      .from(schema.userJobScores)
      .where(eq(schema.userJobScores.jobId, body.jobId))
      .limit(1);
    matchScore = scoreRow?.matchScore ?? null;
  } catch (err) {
    console.error("[generate:fetch:ERROR]", err);
    return NextResponse.json({ error: "Failed to load job or preferences" }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (!prefs) {
    return NextResponse.json(
      { error: "Complete the questionnaire in Profile before generating an application." },
      { status: 400 },
    );
  }
  if (!job.description) {
    return NextResponse.json({ error: "Job has no description to analyse" }, { status: 400 });
  }

  const jobDescription = job.description;
  const userPreferences = prefs;
  const jobRecord = job;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: PipelineEvent): void => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const close = (): void => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        const iter = runPipeline({
          userId,
          jobDescription,
          userPreferences,
          jobId: jobRecord.id,
          jobTitle: jobRecord.title,
          company: jobRecord.company,
        });

        let result: Awaited<ReturnType<typeof iter.next>>;
        let finalValue: Awaited<ReturnType<typeof iter.next>>["value"] = null;
        while (true) {
          result = await iter.next();
          if (result.done) {
            finalValue = result.value;
            break;
          }
          send(result.value);
        }

        if (!finalValue) {
          // Orchestrator already emitted a pipeline:error.
          close();
          return;
        }

        const { tailoredCV, coverLetter, qaReport } = finalValue;

        // Persist to applications table with submission_status = 'generated'.
        let applicationId = "";
        try {
          const [row] = await db()
            .insert(schema.applications)
            .values({
              userId,
              jobId: jobRecord.id,
              tailoredCv: tailoredCV,
              coverLetter,
              qaReport,
              matchScore,
              submissionStatus: "generated",
              interviewStatus: "pending",
              platform: jobRecord.platform,
            })
            .returning({ id: schema.applications.id });
          applicationId = row?.id ?? "";
        } catch (err) {
          console.error("[generate:persist:ERROR]", err);
          send({
            type: "pipeline:error",
            message: `Saved generation failed: ${err instanceof Error ? err.message : "unknown"}`,
          });
          close();
          return;
        }

        send({
          type: "pipeline:complete",
          qaReport,
          tailoredCV,
          coverLetter,
          applicationId,
        });
        close();
      } catch (err) {
        console.error("[generate:stream:ERROR]", err);
        try {
          send({
            type: "pipeline:error",
            message: err instanceof Error ? err.message : "stream failed",
          });
        } catch {
          // controller may already be closed.
        }
        close();
      }
    },
    cancel() {
      // Client disconnected mid-stream. Nothing to clean up explicitly.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
