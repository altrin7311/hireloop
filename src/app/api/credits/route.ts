import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser(): Promise<
  | { ok: true; userId: string; emailVerified: boolean }
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
    return {
      ok: true,
      userId: user.id,
      emailVerified: Boolean(user.email_confirmed_at) || Boolean(user.confirmed_at),
    };
  } catch (err) {
    console.error("[credits:auth:ERROR]", err);
    return { ok: false, response: NextResponse.json({ error: "Auth failure" }, { status: 500 }) };
  }
}

async function ensureCreditRow(userId: string, emailVerified: boolean): Promise<number> {
  const [existing] = await db()
    .select({ balance: schema.userCredits.balance })
    .from(schema.userCredits)
    .where(eq(schema.userCredits.userId, userId))
    .limit(1);
  if (existing) return existing.balance;

  // CLAUDE.md: "2 free credits granted on email verification (not just signup)."
  const startingBalance = emailVerified ? 2 : 0;

  try {
    const [inserted] = await db()
      .insert(schema.userCredits)
      .values({ userId, balance: startingBalance })
      .onConflictDoUpdate({
        target: schema.userCredits.userId,
        set: { updatedAt: sql`now()` },
      })
      .returning({ balance: schema.userCredits.balance });

    if (startingBalance > 0) {
      try {
        await db().insert(schema.creditTransactions).values({
          userId,
          amount: startingBalance,
          type: "signup_bonus",
        });
      } catch (txErr) {
        // Non-fatal — the row is already created; transaction log can lag.
        console.warn("[credits:bonus-log:WARN]", txErr);
      }
    }

    return inserted?.balance ?? startingBalance;
  } catch (err) {
    console.error("[credits:bootstrap:ERROR]", err);
    return startingBalance;
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { userId, emailVerified } = auth;

  try {
    const balance = await ensureCreditRow(userId, emailVerified);

    const transactions = await db()
      .select({
        id: schema.creditTransactions.id,
        amount: schema.creditTransactions.amount,
        type: schema.creditTransactions.type,
        applicationId: schema.creditTransactions.applicationId,
        stripePaymentId: schema.creditTransactions.stripePaymentId,
        createdAt: schema.creditTransactions.createdAt,
      })
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.userId, userId))
      .orderBy(desc(schema.creditTransactions.createdAt))
      .limit(10);

    return NextResponse.json({ balance, transactions });
  } catch (err) {
    console.error("[credits:get:ERROR]", err);
    return NextResponse.json({ error: "Failed to load credits" }, { status: 500 });
  }
}
