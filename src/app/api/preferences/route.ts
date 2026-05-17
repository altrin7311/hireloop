import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";

export const runtime = "nodejs";

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
    console.error("[prefs:auth:ERROR]", err);
    return { ok: false, response: NextResponse.json({ error: "Auth failure" }, { status: 500 }) };
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const [row] = await db()
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
      .limit(1);
    return NextResponse.json({ preferences: row ?? null });
  } catch (err) {
    console.error("[prefs:get:ERROR]", err);
    return NextResponse.json({ error: "Read failed" }, { status: 500 });
  }
}

const PatchSchema = z.object({
  auto_apply: z.boolean().optional(),
  target_roles: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
  seniority_level: z.string().optional(),
  industries: z.array(z.string()).optional(),
  exclude_companies: z.array(z.string()).optional(),
  tone_preference: z.string().optional(),
  always_emphasize: z.array(z.string()).optional(),
  never_mention: z.array(z.string()).optional(),
  salary_expectation: z.string().optional(),
  notice_period: z.string().optional(),
  work_authorization: z.boolean().optional(),
  requires_sponsorship: z.boolean().optional(),
  preferred_name: z.string().optional(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  let patch: z.infer<typeof PatchSchema>;
  try {
    patch = PatchSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid body: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  const updateSet: Partial<typeof schema.userPreferences.$inferInsert> = {};
  if (patch.auto_apply !== undefined) updateSet.autoApply = patch.auto_apply;
  if (patch.target_roles !== undefined) updateSet.targetRoles = patch.target_roles;
  if (patch.target_locations !== undefined) updateSet.targetLocations = patch.target_locations;
  if (patch.seniority_level !== undefined) updateSet.seniorityLevel = patch.seniority_level;
  if (patch.industries !== undefined) updateSet.industries = patch.industries;
  if (patch.exclude_companies !== undefined) updateSet.excludeCompanies = patch.exclude_companies;
  if (patch.tone_preference !== undefined) updateSet.tonePreference = patch.tone_preference;
  if (patch.always_emphasize !== undefined) updateSet.alwaysEmphasize = patch.always_emphasize;
  if (patch.never_mention !== undefined) updateSet.neverMention = patch.never_mention;
  if (patch.salary_expectation !== undefined) updateSet.salaryExpectation = patch.salary_expectation;
  if (patch.notice_period !== undefined) updateSet.noticePeriod = patch.notice_period;
  if (patch.work_authorization !== undefined) updateSet.workAuthorization = patch.work_authorization;
  if (patch.requires_sponsorship !== undefined)
    updateSet.requiresSponsorship = patch.requires_sponsorship;
  if (patch.preferred_name !== undefined) updateSet.preferredName = patch.preferred_name;

  if (Object.keys(updateSet).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const insertRow: typeof schema.userPreferences.$inferInsert = {
      userId,
      ...updateSet,
    };
    const [row] = await db()
      .insert(schema.userPreferences)
      .values(insertRow)
      .onConflictDoUpdate({
        target: schema.userPreferences.userId,
        set: { ...updateSet, id: sql`user_preferences.id` },
      })
      .returning();
    return NextResponse.json({ preferences: row });
  } catch (err) {
    console.error("[prefs:patch:ERROR]", err);
    return NextResponse.json(
      { error: `Update failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }
}
