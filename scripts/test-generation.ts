/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { sql } from "drizzle-orm";

import type { PipelineResult } from "../src/lib/ai/agents/orchestrator";

async function main(): Promise<void> {
  for (const key of ["DATABASE_URL", "GROQ_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) {
    if (!process.env[key]) {
      console.error(`Missing ${key} in .env.local`);
      process.exit(1);
    }
  }

  const { db, schema } = await import("../src/lib/db");
  const { runPipeline } = await import("../src/lib/ai/agents/orchestrator");
  const { eq } = await import("drizzle-orm");

  console.log("=== Locating eligible user ===");
  const userRow = (await db().execute(sql`
    SELECT dc.user_id
    FROM document_chunks dc
    JOIN user_preferences up ON up.user_id = dc.user_id
    WHERE dc.embedding IS NOT NULL
    GROUP BY dc.user_id
    HAVING COUNT(*) > 0
    LIMIT 1
  `)) as unknown as Array<{ user_id: string }>;
  if (userRow.length === 0) {
    console.error("No user has both document_chunks (with embeddings) and user_preferences.");
    process.exit(1);
  }
  const userId = userRow[0]!.user_id;
  console.log("userId:", userId);

  console.log("\n=== Locating job listing with description ===");
  const [job] = await db()
    .select()
    .from(schema.jobListings)
    .where(sql`${schema.jobListings.description} IS NOT NULL AND length(${schema.jobListings.description}) > 100`)
    .limit(1);
  if (!job) {
    console.error("No job_listings row with non-empty description found.");
    process.exit(1);
  }
  console.log(`jobId: ${job.id} — ${job.title} @ ${job.company}`);

  console.log("\n=== Loading preferences ===");
  const [prefs] = await db()
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);
  if (!prefs) {
    console.error("user_preferences row missing");
    process.exit(1);
  }

  console.log("\n=== Running pipeline ===\n");
  const iter = runPipeline({
    userId,
    jobDescription: job.description ?? "",
    userPreferences: prefs,
  });

  let cvDelta = 0;
  let clText = "";
  let finalResult: PipelineResult | null = null;

  while (true) {
    const { value, done } = await iter.next();
    if (done) {
      finalResult = value ?? null;
      break;
    }
    switch (value.type) {
      case "agent:start":
        console.log(`▶  ${value.agent}: start`);
        break;
      case "agent:complete":
        console.log(`✅ ${value.agent}: complete (${value.durationMs}ms)`);
        break;
      case "agent:error":
        console.log(`❌ ${value.agent}: ${value.message}`);
        break;
      case "content:delta":
        if (value.field === "coverLetter" && value.text) {
          clText += value.text;
          process.stdout.write(value.text);
        } else if (value.field === "cv" && value.cv) {
          cvDelta += 1;
          console.log(`\n[cv:object received]`);
        }
        break;
      case "pipeline:error":
        console.log(`\n💥 pipeline:error — ${value.message}`);
        process.exit(1);
    }
  }

  if (!finalResult) {
    console.error("\nPipeline returned null (no result).");
    process.exit(1);
  }

  console.log("\n\n=== Result summary ===");
  console.log("coverLetter length:", finalResult.coverLetter.length);
  console.log("cv delta events:", cvDelta);
  console.log("qaReport:", JSON.stringify(finalResult.qaReport, null, 2));

  console.log("\n=== Persisting application ===");
  const [row] = await db()
    .insert(schema.applications)
    .values({
      userId,
      jobId: job.id,
      tailoredCv: finalResult.tailoredCV as never,
      coverLetter: finalResult.coverLetter,
      qaReport: finalResult.qaReport as never,
      matchScore: null,
      submissionStatus: "generated",
      interviewStatus: "pending",
      platform: job.platform,
    })
    .returning({ id: schema.applications.id });
  console.log("applications row id:", row?.id);

  console.log("\n========================================");
  console.log("✅ ALL AGENTS PASSED");
  console.log("========================================");
  console.log("\nCover letter preview:\n");
  console.log(clText.slice(0, 1000));

  process.exit(0);
}

main().catch((err) => {
  console.error("\nUNCAUGHT:", err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
