import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

declare global {
  var __hireloopStripe: Stripe | undefined;
}

export function getStripe(): Stripe {
  if (!SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!globalThis.__hireloopStripe) {
    globalThis.__hireloopStripe = new Stripe(SECRET_KEY, {
      typescript: true,
      appInfo: { name: "HireLoop", version: "0.1.0" },
    });
  }
  return globalThis.__hireloopStripe;
}

export type PlanId = "interviewer" | "power_hunter" | "career_pivot";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceUsd: number;
  credits: number;
  perCreditLabel: string;
  features: string[];
}

export const PLAN_DEFS: Record<PlanId, PlanDef> = {
  interviewer: {
    id: "interviewer",
    name: "The Interviewer",
    priceUsd: 15,
    credits: 20,
    perCreditLabel: "$0.75 per application",
    features: [
      "20 tailored applications",
      "Auto-apply on 90%+ matches",
      "Diff viewer + edit",
      "Application tracker",
    ],
  },
  power_hunter: {
    id: "power_hunter",
    name: "The Power Hunter",
    priceUsd: 35,
    credits: 60,
    perCreditLabel: "$0.58 per application",
    features: [
      "60 tailored applications",
      "Auto-apply on 80%+ matches",
      "Cover letter library",
      "Interview prep notes",
      "Priority queue",
    ],
  },
  career_pivot: {
    id: "career_pivot",
    name: "The Career Pivot",
    priceUsd: 60,
    credits: 120,
    perCreditLabel: "$0.50 per application",
    features: [
      "120 tailored applications",
      "Multi-profile (pivot mode)",
      "Custom application playbooks",
      "Concierge onboarding",
    ],
  },
};

export const FREE_KICK = {
  id: "free_kick" as const,
  name: "Free Kick",
  priceUsd: 0,
  credits: 2,
  perCreditLabel: "Try it on us",
  features: [
    "2 tailored applications",
    "Resume Health Check",
    "Manual submission",
    "Email support",
  ],
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "interviewer" || value === "power_hunter" || value === "career_pivot";
}
