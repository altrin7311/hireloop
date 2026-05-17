import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import { embedQuery } from "@/lib/rag/embeddings/google";

export const runtime = "nodejs";

const AUTOMATION_URL = process.env.AUTOMATION_SERVICE_URL ?? "http://localhost:8000";
const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY ?? "";

const PLATFORMS = ["linkedin", "indeed", "greenhouse", "lever", "workday"] as const;
type Platform = (typeof PLATFORMS)[number];

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
  greenhouse_slugs: z.array(z.string()).optional(),
  lever_slugs: z.array(z.string()).optional(),
  workday_urls: z.array(z.string()).optional(),
});

function log(stage: string, info: Record<string, unknown> = {}): void {
  console.log(`[jobs:${stage}]`, info);
}

function scoreFromSimilarity(similarity: number): number {
  // Cosine similarity ∈ [-1, 1] in theory; embeddings here ∈ [0, 1] typically.
  const clamped = Math.max(0, Math.min(1, similarity));
  return Math.round(clamped * 100);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID().slice(0, 8);
  log("start", { requestId });

  // STEP 1 — Auth
  let userId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error && error.name === "AuthSessionMissingError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error) throw error;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
    log("auth:ok", { requestId, userId });
  } catch (err) {
    console.error("[jobs:auth:ERROR]", err);
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }

  // STEP 2 — Parse body
  let body: z.infer<typeof RequestBodySchema>;
  try {
    const raw = await request.json();
    body = RequestBodySchema.parse(raw);
  } catch (err) {
    log("body:invalid", { requestId, err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // STEP 3 — Call Python /scrape
  if (!AUTOMATION_API_KEY) {
    log("config:missing-api-key", { requestId });
    return NextResponse.json({ error: "AUTOMATION_API_KEY not set" }, { status: 500 });
  }

  let scraped: z.infer<typeof ScrapeResponseSchema>;
  try {
    const resp = await fetch(`${AUTOMATION_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AUTOMATION_API_KEY,
      },
      body: JSON.stringify({
        platforms: body.platforms ?? PLATFORMS,
        query: body.query,
        location: body.location,
        greenhouse_slugs: body.greenhouse_slugs ?? [],
        lever_slugs: body.lever_slugs ?? [],
        workday_urls: body.workday_urls ?? [],
      }),
    });
    if (!resp.ok) {
      log("scrape:http-error", { requestId, status: resp.status });
      return NextResponse.json(
        { error: `Automation service returned ${resp.status}` },
        { status: 502 },
      );
    }
    scraped = ScrapeResponseSchema.parse(await resp.json());
    log("scrape:ok", {
      requestId,
      jobs: scraped.jobs.length,
      ghosts: scraped.ghost_count,
    });
  } catch (err) {
    console.error("[jobs:scrape:ERROR]", err);
    return NextResponse.json(
      { error: `Automation call failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  if (scraped.jobs.length === 0) {
    return NextResponse.json({ jobs: [], ghost_count: scraped.ghost_count, scored: 0 });
  }

  // STEP 4 — Upsert into job_listings
  const insertRows: (typeof schema.jobListings.$inferInsert)[] = scraped.jobs.map((job) => ({
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
  }));

  let persistedIds: Map<string, string>;
  try {
    const upserted = await db()
      .insert(schema.jobListings)
      .values(insertRows)
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

    persistedIds = new Map(
      upserted.map((row) => [`${row.platform}|${row.externalId}`, row.id]),
    );
    log("db:upsert", { requestId, inserted: upserted.length });
  } catch (err) {
    console.error("[jobs:db:ERROR]", err);
    return NextResponse.json(
      { error: `Job persist failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  // STEP 5 — Match scoring via pgvector cosine.
  // Embed each job's title + description, then take cosine similarity to the
  // user's nearest document chunk. Cheap & per-job so a partial failure of one
  // scoring call does not corrupt the rest.
  const scoreRows: (typeof schema.userJobScores.$inferInsert)[] = [];

  for (const job of scraped.jobs) {
    const jobId = persistedIds.get(`${job.platform}|${job.external_id}`);
    if (!jobId) continue;

    try {
      const jobText = `${job.title}\n${job.description ?? ""}`.trim();
      if (!jobText) continue;
      const jobEmbedding = await embedQuery(jobText);
      const jobVectorLiteral = `[${jobEmbedding.join(",")}]`;

      const rows = await db().execute(sql`
        SELECT 1 - (embedding <=> ${jobVectorLiteral}::vector) AS similarity
        FROM document_chunks
        WHERE user_id = ${userId}::uuid
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${jobVectorLiteral}::vector
        LIMIT 1
      `);

      const row = rows[0] as { similarity: number | string } | undefined;
      if (!row) continue;

      const similarity = Number(row.similarity);
      if (!Number.isFinite(similarity)) continue;

      scoreRows.push({
        userId,
        jobId,
        matchScore: scoreFromSimilarity(similarity),
        matchedSkills: null,
        missingSkills: null,
      });
    } catch (err) {
      console.error("[jobs:score:ERROR]", err, { external_id: job.external_id });
    }
  }

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
      log("score:upsert", { requestId, count: scoreRows.length });
    } catch (err) {
      console.error("[jobs:score-persist:ERROR]", err);
    }
  }

  // STEP 6 — Return jobs sorted by match score desc.
  const scoreById = new Map(scoreRows.map((r) => [r.jobId, r.matchScore ?? 0]));
  const responseJobs = scraped.jobs
    .map((job) => {
      const jobId = persistedIds.get(`${job.platform}|${job.external_id}`);
      const matchScore = jobId ? (scoreById.get(jobId) ?? null) : null;
      return { ...job, id: jobId, match_score: matchScore };
    })
    .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));

  log("done", {
    requestId,
    returned: responseJobs.length,
    scored: scoreRows.length,
  });

  return NextResponse.json({
    jobs: responseJobs,
    ghost_count: scraped.ghost_count,
    scored: scoreRows.length,
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    automation_service: AUTOMATION_URL,
    platforms: PLATFORMS,
    message: "POST to this endpoint to trigger scrape + score",
  });
}
