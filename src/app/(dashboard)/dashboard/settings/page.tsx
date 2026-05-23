import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import {
  PlansSection,
  type CreditTransactionView,
} from "@/components/settings/plans-section";

export const dynamic = "force-dynamic";

function inferCurrentPlan(transactions: CreditTransactionView[]): {
  planId: "free_kick" | "interviewer" | "power_hunter" | "career_pivot";
  lastPurchaseAt: string | null;
} {
  // Use the most recent 'purchase' transaction's amount to infer plan.
  const lastPurchase = transactions.find((t) => t.type === "purchase");
  if (!lastPurchase) return { planId: "free_kick", lastPurchaseAt: null };
  const map: Record<number, "interviewer" | "power_hunter" | "career_pivot"> = {
    20: "interviewer",
    60: "power_hunter",
    120: "career_pivot",
  };
  const planId = map[lastPurchase.amount] ?? "free_kick";
  return { planId, lastPurchaseAt: lastPurchase.createdAt };
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Layout redirects unauth — but guard for type narrowing.
    return <p>Not authorised.</p>;
  }

  const [creditsRow] = await db()
    .select({
      balance: schema.userCredits.balance,
      totalPurchased: schema.userCredits.totalPurchased,
    })
    .from(schema.userCredits)
    .where(eq(schema.userCredits.userId, user.id))
    .limit(1);

  const txRows = await db()
    .select({
      id: schema.creditTransactions.id,
      amount: schema.creditTransactions.amount,
      type: schema.creditTransactions.type,
      stripePaymentId: schema.creditTransactions.stripePaymentId,
      createdAt: schema.creditTransactions.createdAt,
    })
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.userId, user.id))
    .orderBy(desc(schema.creditTransactions.createdAt))
    .limit(20);

  const transactions: CreditTransactionView[] = txRows.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    stripePaymentId: row.stripePaymentId ?? null,
    createdAt: row.createdAt.toISOString(),
  }));

  const { planId, lastPurchaseAt } = inferCurrentPlan(transactions);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
          Plans &amp; Billing
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#5A9EA8" }}>
          Manage your plan, credits and transaction history.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="text-sm" style={{ color: "#5A9EA8" }}>
            Loading…
          </p>
        }
      >
        <PlansSection
          initialBalance={creditsRow?.balance ?? 0}
          initialTotalPurchased={creditsRow?.totalPurchased ?? 0}
          currentPlanId={planId}
          transactions={transactions}
          lastPurchaseAt={lastPurchaseAt}
        />
      </Suspense>
    </div>
  );
}
