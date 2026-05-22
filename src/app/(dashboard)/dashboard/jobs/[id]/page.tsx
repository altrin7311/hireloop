import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { GenerationView } from "@/components/generation/generation-view";
import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function JobGenerationPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [job] = await db()
    .select({
      id: schema.jobListings.id,
      title: schema.jobListings.title,
      company: schema.jobListings.company,
    })
    .from(schema.jobListings)
    .where(eq(schema.jobListings.id, id))
    .limit(1);

  if (!job) notFound();

  const chunks = await db()
    .select({
      sourceFile: schema.documentChunks.sourceFile,
      chunkType: schema.documentChunks.chunkType,
      content: schema.documentChunks.content,
    })
    .from(schema.documentChunks)
    .where(eq(schema.documentChunks.userId, user.id))
    .orderBy(desc(schema.documentChunks.uploadedAt))
    .limit(20);

  return (
    <GenerationView
      jobId={job.id}
      jobTitle={job.title}
      company={job.company}
      originalChunks={chunks}
    />
  );
}
