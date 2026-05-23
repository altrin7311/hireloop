import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { db, schema } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

interface CreditGrant {
  userId: string;
  credits: number;
  plan: string;
  paymentId: string;
}

function parseGrant(session: Stripe.Checkout.Session): CreditGrant | null {
  const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
  const plan = session.metadata?.plan ?? "unknown";
  const creditsRaw = session.metadata?.credits;
  const credits = creditsRaw ? Number(creditsRaw) : NaN;
  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;
  if (!userId || !Number.isFinite(credits) || credits <= 0) return null;
  return { userId, credits, plan, paymentId };
}

async function applyGrant(grant: CreditGrant): Promise<void> {
  // Idempotency — Stripe retries on non-2xx; the payment_intent ID is unique
  // per purchase. Skip if a transaction with this stripe_payment_id already exists.
  const existing = await db()
    .select({ id: schema.creditTransactions.id })
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.stripePaymentId, grant.paymentId))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[stripe:webhook] grant already applied for payment=${grant.paymentId}`);
    return;
  }

  await db().transaction(async (tx) => {
    // Bump user_credits balance + total_purchased; create row if missing.
    await tx
      .insert(schema.userCredits)
      .values({
        userId: grant.userId,
        balance: grant.credits,
        totalPurchased: grant.credits,
      })
      .onConflictDoUpdate({
        target: schema.userCredits.userId,
        set: {
          balance: sql`${schema.userCredits.balance} + ${grant.credits}`,
          totalPurchased: sql`${schema.userCredits.totalPurchased} + ${grant.credits}`,
          updatedAt: new Date(),
        },
      });

    await tx.insert(schema.creditTransactions).values({
      userId: grant.userId,
      amount: grant.credits,
      type: "purchase",
      stripePaymentId: grant.paymentId,
    });
  });

  console.log(
    `[stripe:webhook] granted ${grant.credits} credits to user=${grant.userId} plan=${grant.plan}`,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe:webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const rawBody = await request.text();

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[stripe:webhook:init:ERROR]", err);
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe:webhook:verify:ERROR]", err);
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  // Acknowledge immediately + process async — but only for our handled type;
  // for everything else we still 200 (Stripe does not need retries for unhandled types).
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, payment_status: session.payment_status });
  }

  const grant = parseGrant(session);
  if (!grant) {
    console.warn("[stripe:webhook] grant could not be parsed", {
      session_id: session.id,
      metadata: session.metadata,
    });
    return NextResponse.json({ received: true, ignored: "missing_metadata" });
  }

  // Fire-and-forget — Stripe will retry on non-2xx. We still want to wait long
  // enough to surface DB errors, so await but never let it block past 5s.
  try {
    await Promise.race([
      applyGrant(grant),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("credit grant timeout (5s)")), 5000),
      ),
    ]);
  } catch (err) {
    console.error("[stripe:webhook:apply:ERROR]", err);
    // 500 → Stripe retries.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "grant failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, granted: grant.credits });
}
