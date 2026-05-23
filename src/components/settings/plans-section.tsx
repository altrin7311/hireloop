"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

interface PlanDescriptor {
  id: "free_kick" | "interviewer" | "power_hunter" | "career_pivot";
  name: string;
  priceUsd: number;
  credits: number;
  perCredit: string;
  features: string[];
}

const PLANS: PlanDescriptor[] = [
  {
    id: "free_kick",
    name: "Free Kick",
    priceUsd: 0,
    credits: 2,
    perCredit: "Try it on us",
    features: [
      "2 tailored applications",
      "Resume Health Check",
      "Manual submission",
      "Email support",
    ],
  },
  {
    id: "interviewer",
    name: "The Interviewer",
    priceUsd: 15,
    credits: 20,
    perCredit: "$0.75 per application",
    features: [
      "20 tailored applications",
      "Auto-apply on 90%+ matches",
      "Diff viewer + edit",
      "Application tracker",
    ],
  },
  {
    id: "power_hunter",
    name: "The Power Hunter",
    priceUsd: 35,
    credits: 60,
    perCredit: "$0.58 per application",
    features: [
      "60 tailored applications",
      "Auto-apply on 80%+ matches",
      "Cover letter library",
      "Interview prep notes",
      "Priority queue",
    ],
  },
  {
    id: "career_pivot",
    name: "The Career Pivot",
    priceUsd: 60,
    credits: 120,
    perCredit: "$0.50 per application",
    features: [
      "120 tailored applications",
      "Multi-profile (pivot mode)",
      "Custom application playbooks",
      "Concierge onboarding",
    ],
  },
];

export interface CreditTransactionView {
  id: string;
  amount: number;
  type: string;
  stripePaymentId: string | null;
  createdAt: string;
}

export interface PlansSectionProps {
  initialBalance: number;
  initialTotalPurchased: number;
  currentPlanId: PlanDescriptor["id"];
  transactions: CreditTransactionView[];
  lastPurchaseAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function txTypeLabel(type: string): string {
  switch (type) {
    case "purchase":
      return "Credit pack purchase";
    case "spend":
      return "Application submitted";
    case "refund":
      return "Refund";
    case "signup_bonus":
      return "Signup bonus";
    default:
      return type;
  }
}

export function PlansSection({
  initialBalance,
  initialTotalPurchased,
  currentPlanId,
  transactions,
  lastPurchaseAt,
}: PlansSectionProps): React.JSX.Element {
  const router = useRouter();
  const search = useSearchParams();
  const successFlag = search.get("success");
  const cancelledFlag = search.get("cancelled");

  const [balance, setBalance] = useState(initialBalance);
  const [totalPurchased, setTotalPurchased] = useState(initialTotalPurchased);
  const [txns, setTxns] = useState(transactions);
  const [banner, setBanner] = useState<
    | { kind: "success"; message: string }
    | { kind: "cancelled"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanDescriptor["id"] | null>(null);

  const refreshCredits = useCallback(async (): Promise<void> => {
    try {
      const resp = await fetch("/api/credits", { cache: "no-store" });
      if (!resp.ok) return;
      const json = (await resp.json()) as {
        balance: number;
        transactions: CreditTransactionView[];
      };
      setBalance(typeof json.balance === "number" ? json.balance : 0);
      setTxns(Array.isArray(json.transactions) ? json.transactions : []);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hireloop:credits-changed"));
      }
    } catch (err) {
      console.error("[settings:credits:refresh]", err);
    }
  }, []);

  useEffect(() => {
    if (successFlag === "true") {
      setBanner({
        kind: "success",
        message:
          "Purchase complete — your credits should appear in a few seconds. The webhook fires asynchronously.",
      });
      void refreshCredits();
      router.replace("/dashboard/settings");
      // Poll a few times to catch the webhook landing.
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        void refreshCredits();
        if (tries >= 6) window.clearInterval(timer);
      }, 2500);
      return () => window.clearInterval(timer);
    }
    if (cancelledFlag === "true") {
      setBanner({ kind: "cancelled", message: "Checkout cancelled. No charge made." });
      router.replace("/dashboard/settings");
    }
  }, [successFlag, cancelledFlag, refreshCredits, router]);

  const handleBuy = useCallback(
    async (planId: PlanDescriptor["id"]): Promise<void> => {
      if (planId === "free_kick") return;
      setCheckoutLoading(planId);
      setBanner(null);
      try {
        const resp = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });
        const json = (await resp.json()) as { url?: string; error?: string };
        if (!resp.ok || !json.url) {
          throw new Error(json.error ?? `HTTP ${resp.status}`);
        }
        window.location.assign(json.url);
      } catch (err) {
        setBanner({
          kind: "error",
          message:
            (err instanceof Error ? err.message : "Stripe checkout failed") +
            " — make sure STRIPE_SECRET_KEY is set on the server.",
        });
        setCheckoutLoading(null);
      }
    },
    [],
  );

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0]!;
  const cycleTotal = currentPlan.credits;
  const used = Math.max(0, cycleTotal - balance);
  const pct = cycleTotal > 0 ? Math.min(100, Math.max(0, (used / cycleTotal) * 100)) : 0;

  return (
    <div className="space-y-7">
      {banner ? (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={
            banner.kind === "success"
              ? { background: "#DEF7E3", color: "#0E7A2F", borderColor: "#B5E6C0" }
              : banner.kind === "error"
                ? { background: "#FFE9E9", color: "#A11212", borderColor: "#F4C2C2" }
                : { background: "#FFF5E0", color: "#A05E00", borderColor: "#FFDEA0" }
          }
        >
          {banner.message}
        </div>
      ) : null}

      <CurrentPlanBanner
        plan={currentPlan}
        balance={balance}
        used={used}
        pct={pct}
        lastPurchaseAt={lastPurchaseAt}
        totalPurchased={totalPurchased}
      />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "#0C1A1C" }}>
              Change plan
            </h3>
            <p className="mt-1 text-sm" style={{ color: "#5A9EA8" }}>
              Pay once. Credits never expire. Refunded if a submission fails our QA.
            </p>
          </div>
          <span className="text-xs" style={{ color: "#5A9EA8" }}>
            1 credit = 1 submitted application
          </span>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              isLoading={checkoutLoading === plan.id}
              disabledAll={checkoutLoading !== null}
              onBuy={() => handleBuy(plan.id)}
            />
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border bg-white p-0 shadow-sm"
        style={{ borderColor: "#D4F5F5", overflow: "hidden" }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#D4F5F5" }}>
          <h3 className="text-base font-semibold" style={{ color: "#0C1A1C" }}>
            Transaction history
          </h3>
          <span className="text-xs" style={{ color: "#5A9EA8" }}>
            Last {Math.min(10, txns.length)} of {txns.length}
          </span>
        </div>
        {txns.length === 0 ? (
          <div className="px-5 py-8 text-sm" style={{ color: "#5A9EA8" }}>
            No transactions yet. Your first purchase will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5FFFE" }}>
                  {["Description", "Date", "Stripe ID", "Amount"].map((c, i) => (
                    <th
                      key={c}
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: "#5A9EA8",
                        letterSpacing: "0.08em",
                        textAlign: i === 3 ? "right" : "left",
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((tx) => (
                  <tr key={tx.id} style={{ borderTop: "1px solid #D4F5F5" }}>
                    <td className="px-4 py-3" style={{ color: "#0C1A1C" }}>
                      {txTypeLabel(tx.type)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5A9EA8" }}>
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8ABCC4", fontFamily: "ui-monospace, Menlo, monospace" }}>
                      {tx.stripePaymentId ? tx.stripePaymentId.slice(0, 20) + "…" : "—"}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold"
                      style={{
                        color: tx.amount < 0 ? "#A05E00" : "#0097B2",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CurrentPlanBanner({
  plan,
  balance,
  used,
  pct,
  lastPurchaseAt,
  totalPurchased,
}: {
  plan: PlanDescriptor;
  balance: number;
  used: number;
  pct: number;
  lastPurchaseAt: string | null;
  totalPurchased: number;
}): React.JSX.Element {
  const purchased = lastPurchaseAt ? `Purchased ${formatDate(lastPurchaseAt)}` : "Free tier";
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
      style={{
        background: "linear-gradient(135deg, #0E7A8E 0%, #00B8D9 100%)",
        boxShadow: "0 10px 30px -10px rgba(0,184,217,.4)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1.5px)",
          backgroundSize: "12px 12px",
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1" style={{ flex: "1 1 280px" }}>
          <div
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.12em", opacity: 0.8 }}
          >
            Current plan
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
            <h3
              className="m-0"
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {plan.name}
            </h3>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
              · ${plan.priceUsd} / {plan.credits} credits
            </span>
          </div>
          <div className="mt-1 text-sm" style={{ opacity: 0.9 }}>
            {purchased} · Credits never expire
            {totalPurchased > 0 ? ` · ${totalPurchased} purchased lifetime` : ""}
          </div>
        </div>
        <div className="flex-none text-right">
          <div
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.12em", opacity: 0.8 }}
          >
            Credits remaining
          </div>
          <div className="mt-1 flex items-baseline justify-end gap-1">
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {balance}
            </span>
            <span style={{ fontSize: 14, opacity: 0.75 }}> / {plan.credits}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "white" }}
          />
        </div>
        <div
          className="mt-2 flex justify-between text-xs"
          style={{ opacity: 0.9 }}
        >
          <span>{used} applications submitted this cycle</span>
          <span>{Math.round(pct)}% used</span>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isLoading,
  disabledAll,
  onBuy,
}: {
  plan: PlanDescriptor;
  isCurrent: boolean;
  isLoading: boolean;
  disabledAll: boolean;
  onBuy: () => void;
}): React.JSX.Element {
  const isHighlight = plan.id === "power_hunter" && !isCurrent;
  return (
    <div
      className="relative flex flex-col rounded-xl p-5"
      style={{
        border: isHighlight
          ? "1px solid #00B8D9"
          : isCurrent
            ? "1px solid #0097B2"
            : "1px solid #D4F5F5",
        background: isCurrent
          ? "linear-gradient(180deg, #F5FFFE 0%, #FFFFFF 100%)"
          : "white",
        boxShadow: isHighlight
          ? "0 8px 24px -10px rgba(0,184,217,.3)"
          : "0 1px 2px rgba(12,26,28,.04)",
      }}
    >
      {(isCurrent || isHighlight) && (
        <div className="absolute -top-2.5 left-4">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase"
            style={{
              background: isCurrent ? "#0097B2" : "#00B8D9",
              color: "white",
              letterSpacing: "0.04em",
            }}
          >
            {isCurrent ? "Current" : "Most popular"}
          </span>
        </div>
      )}
      <div
        className="text-[13px] font-bold"
        style={{ color: "#0C1A1C", letterSpacing: "-0.01em" }}
      >
        {plan.name}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "#0C1A1C",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${plan.priceUsd}
        </span>
        <span className="text-sm" style={{ color: "#5A9EA8" }}>
          one-off
        </span>
      </div>
      <div className="text-sm font-semibold" style={{ color: "#0C1A1C" }}>
        {plan.credits} credits
      </div>
      <div className="mt-0.5 text-xs" style={{ color: "#5A9EA8" }}>
        {plan.perCredit}
      </div>
      <Button
        variant={isCurrent ? "outline" : isHighlight ? "primary" : "outline"}
        className="mt-4 w-full"
        disabled={isCurrent || disabledAll || plan.id === "free_kick"}
        onClick={onBuy}
      >
        {isCurrent
          ? "Current plan"
          : plan.id === "free_kick"
            ? "Granted on signup"
            : isLoading
              ? "Opening Stripe…"
              : "Buy credits"}
      </Button>
      <div className="my-4 h-px" style={{ background: "#D4F5F5" }} />
      <ul className="m-0 list-none space-y-2 p-0">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-[13.5px]"
            style={{ color: "#0C1A1C", lineHeight: 1.5 }}
          >
            <span style={{ color: "#00B8D9", marginTop: 2, flex: "none" }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
