import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/db/supabase/server";
import { PLAN_DEFS, getStripe, isPlanId } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  plan: z.enum(["interviewer", "power_hunter", "career_pivot"]),
});

function originFromRequest(request: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!isPlanId(body.plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const plan = PLAN_DEFS[body.plan];
  const base = originFromRequest(request);

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[stripe:checkout:init:ERROR]", err);
    return NextResponse.json(
      { error: "Stripe not configured. Set STRIPE_SECRET_KEY." },
      { status: 500 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.priceUsd * 100,
            product_data: {
              name: `HireLoop — ${plan.name}`,
              description: `${plan.credits} application credits. Credits never expire.`,
              metadata: { plan: plan.id, credits: String(plan.credits) },
            },
          },
        },
      ],
      metadata: {
        user_id: user.id,
        plan: plan.id,
        credits: String(plan.credits),
      },
      success_url: `${base}/dashboard/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard/settings?cancelled=true`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe session created but no URL returned" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("[stripe:checkout:ERROR]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 502 },
    );
  }
}
