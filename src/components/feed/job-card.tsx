"use client";

import { Button } from "@/components/ui/button";

export type FeedJob = {
  id: string;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  applicationUrl: string;
  matchScore: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
};

function initials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "??";
  if (words.length === 1) return first.slice(0, 2).toUpperCase() || "??";
  const second = words[1] ?? "";
  return ((first[0] ?? "") + (second[0] ?? "")).toUpperCase() || "??";
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max as number)}`;
}

function matchBadgeStyle(score: number): React.CSSProperties {
  if (score >= 80) {
    return { background: "#00B8D9", color: "#FFFFFF", border: "1px solid #00B8D9" };
  }
  if (score >= 60) {
    return { background: "#E0F9FA", color: "#0097B2", border: "1px solid #00B8D9" };
  }
  return { background: "#FFF5E0", color: "#A05E00", border: "1px solid #FFDEA0" };
}

export function JobCard({
  job,
  onApply,
  onSave,
  onSkip,
}: {
  job: FeedJob;
  onApply?: (job: FeedJob) => void;
  onSave?: (job: FeedJob) => void;
  onSkip?: (job: FeedJob) => void;
}): React.JSX.Element {
  const score = job.matchScore;
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const platformLabel = PLATFORM_LABELS[job.platform] ?? job.platform;
  const missing = job.missingSkills ?? [];

  return (
    <article
      className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: "#B2EDEC" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
          style={{ background: "#00B8D9" }}
          aria-hidden
        >
          {initials(job.company)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="truncate text-base font-semibold tracking-tight"
                style={{ color: "#0C1A1C" }}
                title={job.title}
              >
                {job.title}
              </h3>
              <p className="mt-0.5 truncate text-sm" style={{ color: "#5A9EA8" }}>
                {job.company}
                {job.location ? <> · {job.location}</> : null}
              </p>
            </div>
            {score != null ? (
              <span
                className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold"
                style={matchBadgeStyle(score)}
              >
                {score}% match
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "#E0F9FA", color: "#0097B2", border: "1px solid #B2EDEC" }}
            >
              {platformLabel}
            </span>
            {job.remote ? (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "#E0F9FA", color: "#0097B2", border: "1px solid #B2EDEC" }}
              >
                Remote
              </span>
            ) : null}
            {salary ? (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "#E0F9FA", color: "#0097B2", border: "1px solid #B2EDEC" }}
              >
                {salary}
              </span>
            ) : null}
          </div>

          {missing.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missing.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "#FFF5E0",
                    color: "#A05E00",
                    border: "1px solid #FFDEA0",
                  }}
                >
                  {skill} — missing
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => onApply?.(job)}>
              Review &amp; Apply
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onSave?.(job)}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onSkip?.(job)}>
              Skip
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
