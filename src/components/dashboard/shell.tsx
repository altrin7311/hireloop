"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  applicationId: string | null;
  createdAt: string;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/feed", label: "Feed" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardShell({
  email,
  initials,
  initialAutoApply = false,
  children,
}: {
  email: string;
  initials: string;
  initialAutoApply?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [autoApply, setAutoApply] = useState(initialAutoApply);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditTxns, setCreditTxns] = useState<CreditTransaction[]>([]);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const loadCredits = useCallback(async (): Promise<void> => {
    setCreditsLoading(true);
    setCreditsError(null);
    try {
      const resp = await fetch("/api/credits", { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as {
        balance: number;
        transactions: CreditTransaction[];
      };
      setCreditBalance(typeof json.balance === "number" ? json.balance : 0);
      setCreditTxns(Array.isArray(json.transactions) ? json.transactions : []);
    } catch (err) {
      setCreditsError(err instanceof Error ? err.message : "Failed to load credits");
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCredits();
    const handler = (): void => {
      void loadCredits();
    };
    window.addEventListener("hireloop:credits-changed", handler);
    return () => window.removeEventListener("hireloop:credits-changed", handler);
  }, [loadCredits]);

  useEffect(() => {
    if (creditsOpen) void loadCredits();
  }, [creditsOpen, loadCredits]);

  function handleToggle(next: boolean): void {
    const previous = autoApply;
    setAutoApply(next);
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto_apply: next }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        setAutoApply(previous);
        setError(err instanceof Error ? err.message : "Toggle failed");
      }
    });
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#F5FFFE", color: "#0C1A1C" }}
    >
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{
          borderColor: "#D4F5F5",
          background: "rgba(245, 255, 254, 0.85)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard/feed" className="flex items-center gap-2">
              <LogoMark />
              <span className="text-base font-semibold tracking-tight">HireLoop</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#E0F9FA] text-[#0C1A1C]"
                        : "text-[#5A9EA8] hover:bg-[#E0F9FA] hover:text-[#0C1A1C]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard/settings"
              onClick={(e) => {
                // Tapping the pill itself opens the history modal; double-click goes to billing.
                if (e.detail === 1) {
                  e.preventDefault();
                  setCreditsOpen(true);
                }
              }}
              className={cn(
                "relative rounded-md border px-3 py-1 text-xs font-semibold transition-colors",
                creditBalance !== null && creditBalance < 2
                  ? "border-[#FFDEA0] bg-[#FFF5E0] text-[#A05E00]"
                  : "border-[#B2EDEC] bg-[#E0F9FA] text-[#0097B2] hover:bg-[#D4F5F5]",
              )}
              title={
                creditBalance !== null && creditBalance < 2
                  ? "Low credits — click to buy more"
                  : "Click to view credit history. Double-click to open billing."
              }
            >
              {creditBalance !== null && creditBalance < 2 ? (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 animate-ping rounded-full"
                  style={{ background: "#A05E00" }}
                />
              ) : null}
              {creditBalance !== null && creditBalance < 2 ? (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: "#A05E00" }}
                />
              ) : null}
              {creditBalance === null ? "…" : `${creditBalance}`} credit
              {creditBalance === 1 ? "" : "s"}
            </Link>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[#5A9EA8]">Auto Apply</span>
              <Switch checked={autoApply} onCheckedChange={handleToggle} />
            </label>
            <Avatar>
              <AvatarFallback title={email}>{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {autoApply ? (
        <div
          className="border-b"
          style={{
            background: "#FFF5E0",
            borderColor: "#FFDEA0",
            color: "#A05E00",
          }}
        >
          <div className="mx-auto max-w-7xl px-6 py-2 text-sm">
            <strong className="font-semibold">Auto Apply is active.</strong> HireLoop will apply to
            jobs above your match threshold.
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="border-b"
          style={{ background: "#FFF5E0", borderColor: "#FFDEA0", color: "#A05E00" }}
        >
          <div className="mx-auto max-w-7xl px-6 py-1.5 text-xs">
            Preference sync failed: {error}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      {creditsOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(12, 26, 28, 0.45)" }}
          onClick={() => setCreditsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-xl"
            style={{ borderColor: "#B2EDEC" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#0C1A1C" }}>
                  Credit history
                </h3>
                <p className="mt-1 text-sm" style={{ color: "#5A9EA8" }}>
                  Balance:{" "}
                  <strong>
                    {creditBalance === null ? "—" : creditBalance} credit
                    {creditBalance === 1 ? "" : "s"}
                  </strong>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCreditsOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4">
              {creditsLoading ? (
                <p className="text-xs" style={{ color: "#5A9EA8" }}>
                  Loading…
                </p>
              ) : creditsError ? (
                <p className="text-xs" style={{ color: "#A05E00" }}>
                  {creditsError}
                </p>
              ) : creditTxns.length === 0 ? (
                <p className="text-xs" style={{ color: "#5A9EA8" }}>
                  No transactions yet.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: "#D4F5F5" }}>
                  {creditTxns.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <div style={{ color: "#0C1A1C" }}>{tx.type}</div>
                        <div className="text-xs" style={{ color: "#8ABCC4" }}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="font-semibold"
                        style={{ color: tx.amount < 0 ? "#A05E00" : "#0097B2" }}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
