import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export type RateLimitBucket = "generate" | "apply" | "jobs_scrape";

export interface RateLimitOk {
  ok: true;
  bucket: RateLimitBucket;
  limit: number;
  remaining: number;
  hits: number;
  retryAfter: number;
}

export interface RateLimitBlocked {
  ok: false;
  bucket: RateLimitBucket;
  limit: number;
  remaining: 0;
  hits: number;
  retryAfter: number;
}

export type RateLimitResult = RateLimitOk | RateLimitBlocked;

const LIMITS: Record<RateLimitBucket, number> = {
  generate: 10,
  apply: 5,
  jobs_scrape: 3,
};

const WINDOW_SECONDS = 60 * 60; // 1 hour

function currentWindowStart(now = new Date()): Date {
  const date = new Date(now);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

function retryAfterSeconds(windowStart: Date, now = new Date()): number {
  const end = windowStart.getTime() + WINDOW_SECONDS * 1000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

/**
 * Atomically increment-and-check a per-user fixed-window counter.
 *
 * The first call in a window inserts a row with hits=1; subsequent calls
 * `UPDATE … SET hits = hits + 1` and re-read the value via RETURNING. If the
 * post-increment count exceeds the limit we still return the blocked result
 * (the increment is fine — the row resets at the next hour boundary).
 *
 * Limits live in `LIMITS` above. Edit there to change quotas; do not expose
 * to users.
 */
export async function consumeRateLimit(
  userId: string,
  bucket: RateLimitBucket,
): Promise<RateLimitResult> {
  const limit = LIMITS[bucket];
  const windowStart = currentWindowStart();
  const now = new Date();

  const [row] = await db()
    .insert(schema.rateLimits)
    .values({
      userId,
      bucket,
      windowStart,
      hits: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        schema.rateLimits.userId,
        schema.rateLimits.bucket,
        schema.rateLimits.windowStart,
      ],
      set: {
        hits: sql`${schema.rateLimits.hits} + 1`,
        updatedAt: now,
      },
    })
    .returning({ hits: schema.rateLimits.hits });

  const hits = row?.hits ?? 1;
  const retryAfter = retryAfterSeconds(windowStart, now);

  if (hits > limit) {
    return { ok: false, bucket, limit, remaining: 0, hits, retryAfter };
  }
  return {
    ok: true,
    bucket,
    limit,
    remaining: Math.max(0, limit - hits),
    hits,
    retryAfter,
  };
}

/**
 * Read-only check — useful for serving "you have N requests left" badges
 * without consuming a hit. Returns the current count in the active window.
 */
export async function peekRateLimit(
  userId: string,
  bucket: RateLimitBucket,
): Promise<{ hits: number; limit: number; remaining: number; retryAfter: number }> {
  const limit = LIMITS[bucket];
  const windowStart = currentWindowStart();

  const [row] = await db()
    .select({ hits: schema.rateLimits.hits })
    .from(schema.rateLimits)
    .where(
      and(
        eq(schema.rateLimits.userId, userId),
        eq(schema.rateLimits.bucket, bucket),
        eq(schema.rateLimits.windowStart, windowStart),
      ),
    )
    .limit(1);

  const hits = row?.hits ?? 0;
  return {
    hits,
    limit,
    remaining: Math.max(0, limit - hits),
    retryAfter: retryAfterSeconds(windowStart),
  };
}

/**
 * Convert a {@link RateLimitResult} into the standard 429 Response.
 * Returns `null` when the request is allowed.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Bucket": result.bucket,
  };
}
