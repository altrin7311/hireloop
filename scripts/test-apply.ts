/* eslint-disable no-console */
/**
 * End-to-end exercise of the /apply path WITHOUT going through Next.js auth.
 *
 * Picks the most recent ``submissionStatus = 'generated'`` application and
 * mirrors the production /api/apply flow: load credits, call the Python
 * service, debit on success, log a transaction, mark the application
 * submitted. Asserts the credit-decrement only happens on a successful
 * Python response.
 *
 * Run: pnpm tsx scripts/test-apply.ts
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { and, desc, eq, sql } from "drizzle-orm";

interface PythonResp {
  success: boolean;
  message: string;
  reason: string | null;
  screenshot_b64: string;
  fields_filled: number;
  dry_run: boolean;
  retry_after: number | null;
  metadata: Record<string, unknown>;
}

async function main(): Promise<void> {
  for (const key of [
    "DATABASE_URL",
    "AUTOMATION_API_KEY",
    "AUTOMATION_SERVICE_URL",
  ]) {
    if (!process.env[key]) {
      console.error(`Missing ${key} in .env.local`);
      process.exit(1);
    }
  }

  const automationUrl =
    process.env.AUTOMATION_SERVICE_URL ?? "http://localhost:8000";
  const apiKey = process.env.AUTOMATION_API_KEY ?? "";

  const { db, schema } = await import("../src/lib/db");

  console.log("=== Locating eligible application ===");
  const [application] = await db()
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.submissionStatus, "generated"))
    .orderBy(desc(schema.applications.id))
    .limit(1);

  if (!application) {
    console.error(
      "No applications row with submissionStatus='generated'. Run /api/generate first.",
    );
    process.exit(1);
  }

  console.log(`applicationId: ${application.id} (user=${application.userId})`);

  const [job] = await db()
    .select()
    .from(schema.jobListings)
    .where(eq(schema.jobListings.id, application.jobId))
    .limit(1);
  if (!job) {
    console.error("Linked job_listings row missing");
    process.exit(1);
  }
  console.log(`job: ${job.title} @ ${job.company} (${job.platform})`);

  const [prefs] = await db()
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, application.userId))
    .limit(1);

  // Ensure a user_credits row exists. The test grants 2 credits if it
  // didn't already exist, mirroring the bootstrap behaviour of GET /api/credits.
  let [credits] = await db()
    .select({ balance: schema.userCredits.balance })
    .from(schema.userCredits)
    .where(eq(schema.userCredits.userId, application.userId))
    .limit(1);

  if (!credits) {
    console.log("Bootstrapping user_credits row with 2 credits");
    await db().insert(schema.userCredits).values({
      userId: application.userId,
      balance: 2,
    });
    await db().insert(schema.creditTransactions).values({
      userId: application.userId,
      amount: 2,
      type: "signup_bonus",
    });
    [credits] = await db()
      .select({ balance: schema.userCredits.balance })
      .from(schema.userCredits)
      .where(eq(schema.userCredits.userId, application.userId))
      .limit(1);
  }

  const startingBalance = credits?.balance ?? 0;
  console.log(`credits before: ${startingBalance}`);

  if (startingBalance < 1) {
    console.error("Insufficient credits to run the test (need 1).");
    process.exit(1);
  }

  console.log("\n=== Calling Python /apply ===");
  const payload = {
    application_url: job.applicationUrl,
    platform: application.platform,
    tailored_cv: application.tailoredCv ?? {},
    cover_letter: application.coverLetter ?? "",
    user_preferences: {
      preferred_name: prefs?.preferredName ?? "Test User",
      email: prefs?.contactEmail ?? "test@hireloop.dev",
      phone: prefs?.contactPhone ?? "+15555550100",
      seniority_level: prefs?.seniorityLevel ?? "",
      tone_preference: prefs?.tonePreference ?? "",
    },
    user_id: application.userId,
    skip_delay: false,
  };

  let pyResp: PythonResp;
  try {
    const resp = await fetch(`${automationUrl}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const json = (await resp.json()) as PythonResp;
    pyResp = json;
    console.log(`HTTP ${resp.status}`);
  } catch (err) {
    console.error("Python /apply unreachable:", err);
    process.exit(1);
  }

  console.log("response:", {
    success: pyResp.success,
    reason: pyResp.reason,
    dry_run: pyResp.dry_run,
    fields_filled: pyResp.fields_filled,
    message: pyResp.message?.slice(0, 200),
  });

  if (pyResp.screenshot_b64) {
    const fs = await import("node:fs/promises");
    const out = `/tmp/test-apply-${Date.now()}.png`;
    await fs.writeFile(out, Buffer.from(pyResp.screenshot_b64, "base64"));
    console.log(`screenshot saved → ${out}`);
  }

  if (!pyResp.success) {
    console.log("\n=== Failure path — credits MUST NOT decrement ===");
    const [after] = await db()
      .select({ balance: schema.userCredits.balance })
      .from(schema.userCredits)
      .where(eq(schema.userCredits.userId, application.userId))
      .limit(1);
    const afterBalance = after?.balance ?? 0;
    if (afterBalance !== startingBalance) {
      console.error(
        `❌ balance changed despite failure: ${startingBalance} → ${afterBalance}`,
      );
      process.exit(1);
    }
    console.log(`✅ balance unchanged at ${afterBalance}`);
    process.exit(0);
  }

  console.log("\n=== Success path — debiting 1 credit ===");
  await db().transaction(async (tx) => {
    const [debited] = await tx
      .update(schema.userCredits)
      .set({
        balance: sql`${schema.userCredits.balance} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userCredits.userId, application.userId),
          sql`${schema.userCredits.balance} > 0`,
        ),
      )
      .returning({ balance: schema.userCredits.balance });

    if (!debited) throw new Error("credit_race");

    await tx.insert(schema.creditTransactions).values({
      userId: application.userId,
      amount: -1,
      type: "spend",
      applicationId: application.id,
    });

    await tx
      .update(schema.applications)
      .set({
        submissionStatus: "submitted",
        submittedAt: new Date(),
        creditsUsed: 1,
      })
      .where(eq(schema.applications.id, application.id));
  });

  const [after] = await db()
    .select({ balance: schema.userCredits.balance })
    .from(schema.userCredits)
    .where(eq(schema.userCredits.userId, application.userId))
    .limit(1);
  const afterBalance = after?.balance ?? 0;

  if (afterBalance !== startingBalance - 1) {
    console.error(
      `❌ expected balance ${startingBalance - 1}, got ${afterBalance}`,
    );
    process.exit(1);
  }
  console.log(`✅ balance ${startingBalance} → ${afterBalance}`);

  const [updated] = await db()
    .select({
      submissionStatus: schema.applications.submissionStatus,
      submittedAt: schema.applications.submittedAt,
    })
    .from(schema.applications)
    .where(eq(schema.applications.id, application.id))
    .limit(1);
  console.log("application:", updated);

  process.exit(0);
}

main().catch((err) => {
  console.error("\nUNCAUGHT:", err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
