import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import { embedTexts } from "@/lib/rag/embeddings/google";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTOMATION_URL = process.env.AUTOMATION_SERVICE_URL ?? "http://localhost:8000";
const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY ?? "";

const PLATFORMS = ["linkedin", "indeed", "greenhouse", "lever", "workday"] as const;
type Platform = (typeof PLATFORMS)[number];

const EMBED_BATCH = 10;

const ScrapedJobSchema = z.object({
  platform: z.enum(PLATFORMS),
  external_id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullable().optional(),
  remote: z.boolean().default(false),
  salary_min: z.number().int().nullable().optional(),
  salary_max: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  application_url: z.string().min(1),
  posted_at: z.string().nullable().optional(),
  applicant_count: z.number().int().nullable().optional(),
});

const ScrapeResponseSchema = z.object({
  jobs: z.array(ScrapedJobSchema),
  ghost_count: z.number().int().nonnegative(),
  per_platform_counts: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

const RequestBodySchema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).optional(),
  query: z.string().default(""),
  location: z.string().default(""),
  company: z.string().optional(),
  greenhouse_slugs: z.array(z.string()).optional(),
  lever_slugs: z.array(z.string()).optional(),
  workday_urls: z.array(z.string()).optional(),
});

type ScrapedJob = z.infer<typeof ScrapedJobSchema>;

function scoreFromSimilarity(similarity: number): number {
  const clamped = Math.max(0, Math.min(1, similarity));
  return Math.round(clamped * 100);
}

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
    console.error("[jobs:auth:ERROR]", err);
    return { ok: false, response: NextResponse.json({ error: "Auth failure" }, { status: 500 }) };
  }
}

function toInsertRow(job: ScrapedJob): typeof schema.jobListings.$inferInsert {
  return {
    platform: job.platform,
    externalId: job.external_id,
    title: job.title,
    company: job.company,
    location: job.location ?? null,
    remote: job.remote,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    description: job.description ?? null,
    applicationUrl: job.application_url,
    postedAt: job.posted_at ? new Date(job.posted_at) : null,
    applicantCount: job.applicant_count ?? null,
  };
}

function jobEventPayload(
  scraped: ScrapedJob,
  jobId: string,
  matchScore: number | null,
): Record<string, unknown> {
  return {
    id: jobId,
    platform: scraped.platform,
    title: scraped.title,
    company: scraped.company,
    location: scraped.location ?? null,
    remote: scraped.remote,
    salaryMin: scraped.salary_min ?? null,
    salaryMax: scraped.salary_max ?? null,
    applicationUrl: scraped.application_url,
    matchScore,
    matchedSkills: null,
    missingSkills: null,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const rate = await consumeRateLimit(userId, "jobs_scrape");
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `You can run at most ${rate.limit} scrapes per hour. Try again in ~${Math.ceil(rate.retryAfter / 60)} minute(s).`,
        retryAfter: rate.retryAfter,
      },
      {
        status: 429,
        headers: { ...rateLimitHeaders(rate), "Retry-After": String(rate.retryAfter) },
      },
    );
  }

  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request body: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  if (!AUTOMATION_API_KEY) {
    return NextResponse.json({ error: "AUTOMATION_API_KEY not set" }, { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown): void => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const close = (): void => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        send({ type: "status", message: "Scraping listings…" });

        const platformsToScrape: Platform[] = body.platforms ?? [...PLATFORMS];
        const resp = await fetch(`${AUTOMATION_URL}/scrape`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": AUTOMATION_API_KEY,
          },
          body: JSON.stringify({
            platforms: platformsToScrape,
            query: body.query,
            location: body.location,
            company: body.company,
            greenhouse_slugs: body.greenhouse_slugs ?? [],
            lever_slugs: body.lever_slugs ?? [],
            workday_urls: body.workday_urls ?? [],
          }),
        });

        if (!resp.ok) {
          send({ type: "error", message: `Automation service returned ${resp.status}` });
          close();
          return;
        }

        const scraped = ScrapeResponseSchema.parse(await resp.json());

        if (scraped.jobs.length === 0) {
          send({ type: "start", total: 0, ghost_count: scraped.ghost_count });
          send({ type: "done", total: 0, ghost_count: scraped.ghost_count });
          close();
          return;
        }

        // UPSERT job_listings — single round trip.
        let upserted: { id: string; platform: string; externalId: string }[];
        try {
          upserted = await db()
            .insert(schema.jobListings)
            .values(scraped.jobs.map(toInsertRow))
            .onConflictDoUpdate({
              target: [schema.jobListings.platform, schema.jobListings.externalId],
              set: {
                title: sql`excluded.title`,
                company: sql`excluded.company`,
                location: sql`excluded.location`,
                remote: sql`excluded.remote`,
                salaryMin: sql`excluded.salary_min`,
                salaryMax: sql`excluded.salary_max`,
                description: sql`excluded.description`,
                applicationUrl: sql`excluded.application_url`,
                postedAt: sql`excluded.posted_at`,
                applicantCount: sql`excluded.applicant_count`,
                scrapedAt: sql`now()`,
              },
            })
            .returning({
              id: schema.jobListings.id,
              platform: schema.jobListings.platform,
              externalId: schema.jobListings.externalId,
            });
        } catch (err) {
          console.error("[jobs:db:ERROR]", err);
          send({
            type: "error",
            message: `Job persist failed: ${err instanceof Error ? err.message : "unknown"}`,
          });
          close();
          return;
        }

        const idMap = new Map(
          upserted.map((row) => [`${row.platform}|${row.externalId}`, row.id]),
        );

        send({
          type: "start",
          total: scraped.jobs.length,
          ghost_count: scraped.ghost_count,
        });

        // BATCH EMBED + SCORE — 10 jobs per batch, embed in one call, score in parallel.
        for (let i = 0; i < scraped.jobs.length; i += EMBED_BATCH) {
          const batch = scraped.jobs.slice(i, i + EMBED_BATCH);
          const texts = batch.map((j) =>
            `${j.title}\n${(j.description ?? "").slice(0, 500)}`.trim(),
          );

          let vectors: number[][];
          try {
            vectors = await embedTexts(texts, "RETRIEVAL_QUERY");
          } catch (err) {
            console.error("[jobs:embed:batch:ERROR]", err);
            // Emit unscored jobs so UI still progresses.
            for (const job of batch) {
              const jobId = idMap.get(`${job.platform}|${job.external_id}`);
              if (!jobId) continue;
              send({ type: "job", job: jobEventPayload(job, jobId, null) });
            }
            continue;
          }

          const scored = await Promise.all(
            batch.map(async (job, idx) => {
              const jobId = idMap.get(`${job.platform}|${job.external_id}`);
              if (!jobId) return null;
              const vec = vectors[idx];
              if (!vec) return { jobId, job, score: null as number | null };
              const vecLit = `[${vec.join(",")}]`;
              try {
                const rows = await db().execute(sql`
                  SELECT AVG(1 - (embedding <=> ${vecLit}::vector)) AS similarity
                  FROM (
                    SELECT embedding
                    FROM document_chunks
                    WHERE user_id = ${userId}::uuid
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> ${vecLit}::vector
                    LIMIT 5
                  ) AS top_chunks
                `);
                const row = rows[0] as { similarity: number | string | null } | undefined;
                if (!row || row.similarity === null) {
                  return { jobId, job, score: null as number | null };
                }
                const sim = Number(row.similarity);
                const score = Number.isFinite(sim) ? scoreFromSimilarity(sim) : null;
                return { jobId, job, score };
              } catch (err) {
                console.error("[jobs:score:ERROR]", err, { external_id: job.external_id });
                return { jobId, job, score: null as number | null };
              }
            }),
          );

          // Persist this batch's scores (only those with a score).
          const scoreRows = scored
            .filter(
              (r): r is { jobId: string; job: ScrapedJob; score: number } =>
                r !== null && r.score !== null,
            )
            .map((r) => ({
              userId,
              jobId: r.jobId,
              matchScore: r.score,
              matchedSkills: null,
              missingSkills: null,
            }));

          if (scoreRows.length > 0) {
            try {
              await db()
                .insert(schema.userJobScores)
                .values(scoreRows)
                .onConflictDoUpdate({
                  target: [schema.userJobScores.userId, schema.userJobScores.jobId],
                  set: {
                    matchScore: sql`excluded.match_score`,
                    scoredAt: sql`now()`,
                  },
                });
            } catch (err) {
              console.error("[jobs:score-persist:ERROR]", err);
            }
          }

          // Emit per-job events for this batch.
          for (const r of scored) {
            if (!r) continue;
            send({ type: "job", job: jobEventPayload(r.job, r.jobId, r.score) });
          }
        }

        send({
          type: "done",
          total: scraped.jobs.length,
          ghost_count: scraped.ghost_count,
        });
        close();
      } catch (err) {
        console.error("[jobs:stream:ERROR]", err);
        try {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "stream failed",
          });
        } catch {
          // controller may already be closed.
        }
        close();
      }
    },
    cancel() {
      // Client disconnected — nothing to clean up explicitly.
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform");
  const minScoreParam = url.searchParams.get("minScore");
  const limitParam = url.searchParams.get("limit");

  const platform =
    platformParam && (PLATFORMS as readonly string[]).includes(platformParam)
      ? (platformParam as Platform)
      : null;
  const minScore = (() => {
    const n = Number(minScoreParam);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.floor(n))) : 0;
  })();
  const limit = (() => {
    const n = Number(limitParam);
    if (!Number.isFinite(n)) return 20;
    return Math.max(1, Math.min(1000, Math.floor(n)));
  })();

  const filters = [
    eq(schema.userJobScores.userId, userId),
    gte(schema.userJobScores.matchScore, minScore),
  ];
  if (platform) filters.push(eq(schema.jobListings.platform, platform));

  try {
    const rows = await db()
      .select({
        id: schema.jobListings.id,
        platform: schema.jobListings.platform,
        externalId: schema.jobListings.externalId,
        title: schema.jobListings.title,
        company: schema.jobListings.company,
        location: schema.jobListings.location,
        remote: schema.jobListings.remote,
        salaryMin: schema.jobListings.salaryMin,
        salaryMax: schema.jobListings.salaryMax,
        description: schema.jobListings.description,
        applicationUrl: schema.jobListings.applicationUrl,
        postedAt: schema.jobListings.postedAt,
        scrapedAt: schema.jobListings.scrapedAt,
        applicantCount: schema.jobListings.applicantCount,
        matchScore: schema.userJobScores.matchScore,
        matchedSkills: schema.userJobScores.matchedSkills,
        missingSkills: schema.userJobScores.missingSkills,
      })
      .from(schema.userJobScores)
      .innerJoin(schema.jobListings, eq(schema.userJobScores.jobId, schema.jobListings.id))
      .where(and(...filters))
      .orderBy(desc(schema.userJobScores.matchScore))
      .limit(limit);

    return NextResponse.json({ jobs: rows, count: rows.length });
  } catch (err) {
    console.error("[jobs:list:ERROR]", err);
    return NextResponse.json(
      { error: `Job list failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }
}
