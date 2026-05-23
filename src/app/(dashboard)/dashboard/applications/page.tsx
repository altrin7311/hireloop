import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import {
  ApplicationsView,
  type ApplicationListItem,
} from "@/components/applications/applications-view";
import type { TailoredCV } from "@/lib/ai/agents/types";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p>Not authorised.</p>;

  const rows = await db()
    .select({
      id: schema.applications.id,
      jobId: schema.applications.jobId,
      coverLetter: schema.applications.coverLetter,
      tailoredCv: schema.applications.tailoredCv,
      matchScore: schema.applications.matchScore,
      submissionStatus: schema.applications.submissionStatus,
      interviewStatus: schema.applications.interviewStatus,
      submittedAt: schema.applications.submittedAt,
      platform: schema.applications.platform,
      jobTitle: schema.jobListings.title,
      company: schema.jobListings.company,
      applicationUrl: schema.jobListings.applicationUrl,
      // applications has no created_at column, so use job scrapedAt as a fallback for sort.
      scrapedAt: schema.jobListings.scrapedAt,
    })
    .from(schema.applications)
    .innerJoin(schema.jobListings, eq(schema.jobListings.id, schema.applications.jobId))
    .where(eq(schema.applications.userId, user.id))
    .orderBy(desc(schema.applications.submittedAt))
    .limit(200);

  const items: ApplicationListItem[] = rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    company: row.company,
    platform: row.platform,
    applicationUrl: row.applicationUrl,
    matchScore: row.matchScore,
    submissionStatus: row.submissionStatus,
    interviewStatus: row.interviewStatus,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    createdAt: row.scrapedAt.toISOString(),
    coverLetterPreview: (row.coverLetter ?? "").slice(0, 1200),
    tailoredCV: (row.tailoredCv as TailoredCV | null) ?? null,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
            Applications
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5A9EA8" }}>
            Every submission with platform + status.
          </p>
        </div>
      </header>
      <ApplicationsView items={items} />
    </div>
  );
}
