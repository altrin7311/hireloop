import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import type { TailoredCV } from "@/lib/ai/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AUTOMATION_URL = process.env.AUTOMATION_SERVICE_URL ?? "http://localhost:8000";
const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY ?? "";

const BodySchema = z.object({
  applicationId: z.string().uuid(),
});

const PythonApplyResponseSchema = z.object({
  success: z.boolean(),
  screenshot_b64: z.string().default(""),
  message: z.string().default(""),
  reason: z.string().nullable().optional(),
  fields_filled: z.number().int().nonnegative().default(0),
  dry_run: z.boolean().default(false),
  retry_after: z.number().int().nonnegative().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

async function requireUser(): Promise<
  | { ok: true; userId: string; email: string | null }
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
    return { ok: true, userId: user.id, email: user.email ?? null };
  } catch (err) {
    console.error("[apply:auth:ERROR]", err);
    return { ok: false, response: NextResponse.json({ error: "Auth failure" }, { status: 500 }) };
  }
}

interface CreditState {
  balance: number;
  rowExists: boolean;
}

async function loadCredits(userId: string): Promise<CreditState> {
  const [row] = await db()
    .select({ balance: schema.userCredits.balance })
    .from(schema.userCredits)
    .where(eq(schema.userCredits.userId, userId))
    .limit(1);
  if (!row) return { balance: 0, rowExists: false };
  return { balance: row.balance, rowExists: true };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  if (!AUTOMATION_API_KEY) {
    return NextResponse.json({ error: "AUTOMATION_API_KEY not set" }, { status: 500 });
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

  // 1. Application must exist + belong to this user, and not already submitted.
  const [application] = await db()
    .select()
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.id, body.applicationId),
        eq(schema.applications.userId, userId),
      ),
    )
    .limit(1);

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.submissionStatus === "submitted") {
    return NextResponse.json(
      { error: "Application already submitted" },
      { status: 409 },
    );
  }

  // 2. Credits — must have at least 1.
  const credits = await loadCredits(userId);
  if (credits.balance < 1) {
    return NextResponse.json(
      {
        success: false,
        reason: "insufficient_credits",
        message: "Insufficient credits. Purchase a credit pack to continue.",
        creditsRemaining: credits.balance,
      },
      { status: 402 },
    );
  }

  // 3. Job + preferences for the filler.
  const [job] = await db()
    .select()
    .from(schema.jobListings)
    .where(eq(schema.jobListings.id, application.jobId))
    .limit(1);
  if (!job) {
    return NextResponse.json({ error: "Linked job not found" }, { status: 404 });
  }

  const [prefs] = await db()
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);

  const preferences = {
    preferred_name: prefs?.preferredName ?? "",
    email: prefs?.contactEmail ?? auth.email ?? "",
    phone: prefs?.contactPhone ?? "",
    target_roles: prefs?.targetRoles ?? [],
    seniority_level: prefs?.seniorityLevel ?? "",
    tone_preference: prefs?.tonePreference ?? "",
    work_authorization: prefs?.workAuthorization ?? null,
    requires_sponsorship: prefs?.requiresSponsorship ?? null,
    notice_period: prefs?.noticePeriod ?? "",
    salary_expectation: prefs?.salaryExpectation ?? "",
  };

  // 4. Call the Python automation service.
  let pythonJson: z.infer<typeof PythonApplyResponseSchema>;
  try {
    const resp = await fetch(`${AUTOMATION_URL}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AUTOMATION_API_KEY,
      },
      body: JSON.stringify({
        application_url: job.applicationUrl,
        platform: application.platform,
        tailored_cv: (application.tailoredCv as TailoredCV | null) ?? {},
        cover_letter: application.coverLetter ?? "",
        user_preferences: preferences,
        user_id: userId,
        skip_delay: false,
      }),
    });
    const parsedBody: unknown = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[apply:python:HTTP_ERROR]", resp.status, parsedBody);
      return NextResponse.json(
        {
          success: false,
          reason: "automation_error",
          message: `Automation service returned ${resp.status}`,
          creditsRemaining: credits.balance,
        },
        { status: 502 },
      );
    }
    pythonJson = PythonApplyResponseSchema.parse(parsedBody);
  } catch (err) {
    console.error("[apply:python:ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        reason: "automation_unreachable",
        message: err instanceof Error ? err.message : "Automation service unreachable",
        creditsRemaining: credits.balance,
      },
      { status: 502 },
    );
  }

  // 5. On failure, do NOT debit credits. Echo back the reason.
  if (!pythonJson.success) {
    return NextResponse.json(
      {
        success: false,
        reason: pythonJson.reason ?? "submission_failed",
        message: pythonJson.message || "Submission failed",
        screenshot_b64: pythonJson.screenshot_b64 || null,
        retry_after: pythonJson.retry_after ?? null,
        creditsRemaining: credits.balance,
      },
      { status: 200 },
    );
  }

  // 6. Success — debit credits + log + mark application submitted.
  try {
    await db().transaction(async (tx) => {
      const [updatedCredits] = await tx
        .update(schema.userCredits)
        .set({
          balance: sql`${schema.userCredits.balance} - 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.userCredits.userId, userId),
            sql`${schema.userCredits.balance} > 0`,
          ),
        )
        .returning({ balance: schema.userCredits.balance });

      if (!updatedCredits) {
        // Concurrent debit drained the balance between the check above and this
        // transaction — bail out without recording the transaction so we don't
        // double-charge.
        throw new Error("credit_race");
      }

      await tx.insert(schema.creditTransactions).values({
        userId,
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
  } catch (err) {
    console.error("[apply:credit:ERROR]", err);
    return NextResponse.json(
      {
        success: false,
        reason: "credit_write_failed",
        message:
          err instanceof Error && err.message === "credit_race"
            ? "Credits drained mid-flight. Refresh and try again."
            : "Submission succeeded but credit accounting failed.",
        screenshot_b64: pythonJson.screenshot_b64 || null,
        creditsRemaining: credits.balance,
      },
      { status: 500 },
    );
  }

  const after = await loadCredits(userId);

  return NextResponse.json({
    success: true,
    message: pythonJson.message,
    screenshot_b64: pythonJson.screenshot_b64 || null,
    fields_filled: pythonJson.fields_filled,
    dry_run: pythonJson.dry_run,
    creditsRemaining: after.balance,
    metadata: pythonJson.metadata,
  });
}
