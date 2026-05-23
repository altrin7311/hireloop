"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TailoredCV } from "@/lib/ai/agents/types";

export type ApplicationStatus = "draft" | "generated" | "submitted" | "failed";

export interface ApplicationListItem {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  platform: string;
  applicationUrl: string;
  matchScore: number | null;
  submissionStatus: ApplicationStatus | string;
  interviewStatus: string;
  submittedAt: string | null;
  createdAt: string;
  coverLetterPreview: string;
  tailoredCV: TailoredCV | null;
}

type Filter = "all" | ApplicationStatus;

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  draft: "Draft",
  generated: "Generated",
  submitted: "Submitted",
  failed: "Failed",
};

const STATUS_PILL: Record<string, { bg: string; fg: string; border: string }> = {
  draft: { bg: "#FFF5E0", fg: "#A05E00", border: "#FFDEA0" },
  generated: { bg: "#E0F9FA", fg: "#0097B2", border: "#B2EDEC" },
  submitted: { bg: "#DEF7E3", fg: "#0E7A2F", border: "#B5E6C0" },
  failed: { bg: "#FFE9E9", fg: "#A11212", border: "#F4C2C2" },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

export function ApplicationsView({
  items,
}: {
  items: ApplicationListItem[];
}): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<ApplicationListItem | null>(null);

  const counts = useMemo(() => {
    const acc: Record<Filter, number> = {
      all: items.length,
      draft: 0,
      generated: 0,
      submitted: 0,
      failed: 0,
    };
    for (const item of items) {
      if ((Object.keys(acc) as Filter[]).includes(item.submissionStatus as Filter)) {
        acc[item.submissionStatus as Filter] += 1;
      }
    }
    return acc;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.submissionStatus === filter)),
    [filter, items],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                background: isActive ? "#00B8D9" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#0C1A1C",
                borderColor: isActive ? "#00B8D9" : "#B2EDEC",
              }}
            >
              {FILTER_LABELS[f]}
              <span
                className="ml-1.5 text-[10px] font-bold"
                style={{ opacity: isActive ? 0.85 : 0.5 }}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="overflow-hidden rounded-xl border bg-white shadow-sm"
        style={{ borderColor: "#D4F5F5" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "#D4F5F5" }}
        >
          <h3 className="text-base font-semibold" style={{ color: "#0C1A1C" }}>
            All applications
          </h3>
          <span className="text-xs" style={{ color: "#5A9EA8" }}>
            {filtered.length} of {items.length} shown
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-sm" style={{ color: "#5A9EA8" }}>
            {items.length === 0
              ? "No applications yet. Visit the Feed and click Review & Apply to generate one."
              : "No applications match this filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5FFFE" }}>
                  {["Role", "Company", "Platform", "Match", "When", "Status", ""].map(
                    (c, i) => (
                      <th
                        key={c}
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: "#5A9EA8",
                          letterSpacing: "0.08em",
                          textAlign: i === 6 ? "right" : "left",
                        }}
                      >
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    style={{
                      borderTop: "1px solid #D4F5F5",
                      cursor: "pointer",
                    }}
                    onClick={() => setActive(app)}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: "#0C1A1C" }}>
                      {app.jobTitle}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#0C1A1C" }}>
                      {app.company}
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: "#5A9EA8" }}>
                      {app.platform}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{
                        color:
                          app.matchScore !== null && app.matchScore >= 85
                            ? "#0097B2"
                            : "#0C1A1C",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {app.matchScore !== null ? `${app.matchScore}%` : "—"}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "#5A9EA8", fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatWhen(app.submittedAt ?? app.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.submissionStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={app.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs font-medium"
                        style={{
                          borderColor: "#B2EDEC",
                          color: "#0097B2",
                          background: "#FFFFFF",
                        }}
                      >
                        Open job ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active ? <PreviewDrawer app={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const colours = STATUS_PILL[status] ?? STATUS_PILL.draft!;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
      style={{
        background: colours.bg,
        color: colours.fg,
        border: `1px solid ${colours.border}`,
      }}
    >
      {status}
    </span>
  );
}

function PreviewDrawer({
  app,
  onClose,
}: {
  app: ApplicationListItem;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(12, 26, 28, 0.45)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l bg-white shadow-xl"
        style={{ borderColor: "#B2EDEC" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between border-b px-5 py-4"
          style={{ borderColor: "#D4F5F5" }}
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold" style={{ color: "#0C1A1C" }}>
              {app.jobTitle}
            </h3>
            <p className="mt-0.5 text-sm" style={{ color: "#5A9EA8" }}>
              {app.company} · {app.platform}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={app.submissionStatus} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="space-y-6 px-5 py-5 text-sm">
          <section>
            <h4
              className="mb-2 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
            >
              Cover letter
            </h4>
            <p
              className="whitespace-pre-wrap rounded-md border p-3"
              style={{ borderColor: "#D4F5F5", color: "#0C1A1C" }}
            >
              {app.coverLetterPreview || <em style={{ color: "#8ABCC4" }}>No cover letter</em>}
            </p>
          </section>

          {app.tailoredCV ? (
            <section>
              <h4
                className="mb-2 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
              >
                Tailored CV
              </h4>
              <div
                className="space-y-3 rounded-md border p-3"
                style={{ borderColor: "#D4F5F5" }}
              >
                {app.tailoredCV.summary ? (
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#5A9EA8" }}>
                      Summary
                    </div>
                    <p style={{ color: "#0C1A1C" }}>{app.tailoredCV.summary}</p>
                  </div>
                ) : null}
                {app.tailoredCV.experience.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#5A9EA8" }}>
                      Experience
                    </div>
                    <ul className="mt-1 space-y-2">
                      {app.tailoredCV.experience.slice(0, 3).map((role, idx) => (
                        <li key={idx}>
                          <div className="font-semibold" style={{ color: "#0C1A1C" }}>
                            {role.title} —{" "}
                            <span style={{ color: "#5A9EA8" }}>
                              {role.company} · {role.dates}
                            </span>
                          </div>
                          <ul
                            className="ml-4 list-disc text-xs"
                            style={{ color: "#0C1A1C" }}
                          >
                            {role.bullets.slice(0, 2).map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {app.tailoredCV.skills.featured.length > 0 ? (
                  <div className="text-xs" style={{ color: "#5A9EA8" }}>
                    <strong style={{ color: "#0C1A1C" }}>Featured:</strong>{" "}
                    {app.tailoredCV.skills.featured.join(", ")}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
