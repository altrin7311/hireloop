import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import {
  StatsView,
  type DailyBucket,
  type MatchBucket,
  type RecentApplicationItem,
} from "@/components/dashboard/stats-view";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function bucketFor(score: number): MatchBucket["band"] {
  if (score >= 85) return "85–100";
  if (score >= 70) return "70–84";
  if (score >= 50) return "50–69";
  return "0–49";
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p>Not authorised.</p>;

  const userId = user.id;

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [statusCounts, creditsRows, submitted30, recent] = await Promise.all([
    db()
      .select({
        status: schema.applications.submissionStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.applications)
      .where(eq(schema.applications.userId, userId))
      .groupBy(schema.applications.submissionStatus),
    db()
      .select({ balance: schema.userCredits.balance })
      .from(schema.userCredits)
      .where(eq(schema.userCredits.userId, userId))
      .limit(1),
    db()
      .select({
        submittedAt: schema.applications.submittedAt,
        matchScore: schema.applications.matchScore,
      })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.userId, userId),
          eq(schema.applications.submissionStatus, "submitted"),
          gte(schema.applications.submittedAt, since30),
        ),
      ),
    db()
      .select({
        id: schema.applications.id,
        title: schema.jobListings.title,
        company: schema.jobListings.company,
        platform: schema.applications.platform,
        status: schema.applications.submissionStatus,
        matchScore: schema.applications.matchScore,
        submittedAt: schema.applications.submittedAt,
      })
      .from(schema.applications)
      .innerJoin(schema.jobListings, eq(schema.jobListings.id, schema.applications.jobId))
      .where(eq(schema.applications.userId, userId))
      .orderBy(desc(schema.applications.submittedAt))
      .limit(8),
  ]);

  const totalSubmitted = statusCounts
    .filter((r) => r.status === "submitted")
    .reduce((s, r) => s + Number(r.count), 0);
  const totalGenerated = statusCounts
    .filter((r) => r.status === "generated")
    .reduce((s, r) => s + Number(r.count), 0);

  // Build 30-day daily buckets.
  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dailyMap.set(dayKey(d), 0);
  }
  for (const row of submitted30) {
    if (!row.submittedAt) continue;
    const key = dayKey(row.submittedAt);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const daily: DailyBucket[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    daily.push({ label: dayLabel(d), count: dailyMap.get(k) ?? 0 });
  }

  const appsThisWeek = submitted30.filter(
    (r) => r.submittedAt && r.submittedAt >= since7,
  ).length;

  // Match-score buckets across ALL applications (not just last 30 days).
  const matchRows = await db()
    .select({ matchScore: schema.applications.matchScore })
    .from(schema.applications)
    .where(eq(schema.applications.userId, userId));

  const bucketCounts: Record<string, number> = {
    "85–100": 0,
    "70–84": 0,
    "50–69": 0,
    "0–49": 0,
  };
  for (const r of matchRows) {
    if (r.matchScore === null) continue;
    bucketCounts[bucketFor(r.matchScore)] = (bucketCounts[bucketFor(r.matchScore)] ?? 0) + 1;
  }
  const matchBuckets: MatchBucket[] = (["85–100", "70–84", "50–69", "0–49"] as const).map(
    (band) => ({ band, count: bucketCounts[band] ?? 0 }),
  );

  const recentList: RecentApplicationItem[] = recent.map((r) => ({
    id: r.id,
    title: r.title,
    company: r.company,
    platform: r.platform,
    status: r.status,
    matchScore: r.matchScore,
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
          Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#5A9EA8" }}>
          Submission volume, match score quality, and credit usage at a glance.
        </p>
      </header>
      <StatsView
        totalSubmitted={totalSubmitted}
        totalGenerated={totalGenerated}
        creditsRemaining={creditsRows[0]?.balance ?? 0}
        appsThisWeek={appsThisWeek}
        daily={daily}
        matchBuckets={matchBuckets}
        recent={recentList}
      />
    </div>
  );
}
