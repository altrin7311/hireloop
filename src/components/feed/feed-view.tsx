"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard, type FeedJob } from "@/components/feed/job-card";

type ScoreFilter = "all" | "70" | "80";

type ApiJob = {
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

type GetApiJob = ApiJob & {
  description: string | null;
  postedAt: string | null;
  scrapedAt: string;
  applicantCount: number | null;
};

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "start"; total: number; ghost_count: number }
  | { type: "job"; job: ApiJob }
  | { type: "done"; total: number; ghost_count: number }
  | { type: "error"; message: string };

const PLATFORMS = [
  { id: "all", label: "All" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
  { id: "greenhouse", label: "Greenhouse" },
  { id: "lever", label: "Lever" },
  { id: "workday", label: "Workday" },
] as const;

const SCORE_FILTERS: { id: ScoreFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "70", label: "70%+" },
  { id: "80", label: "80%+" },
];

function toFeedJob(api: ApiJob): FeedJob {
  return {
    id: api.id,
    platform: api.platform,
    title: api.title,
    company: api.company,
    location: api.location,
    remote: api.remote,
    salaryMin: api.salaryMin,
    salaryMax: api.salaryMax,
    applicationUrl: api.applicationUrl,
    matchScore: api.matchScore,
    matchedSkills: api.matchedSkills,
    missingSkills: api.missingSkills,
  };
}

function sortByScore(jobs: ApiJob[]): ApiJob[] {
  return [...jobs].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
}

type ScrapeDefaults = {
  query: string;
  location: string;
  greenhouseSlugs: string[];
  leverSlugs: string[];
};

export function FeedView({
  scrapeDefaults,
}: {
  scrapeDefaults: ScrapeDefaults;
}): React.JSX.Element {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadJobs = useCallback(async (signal?: AbortSignal): Promise<GetApiJob[]> => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    const minScore = scoreFilter === "all" ? 0 : Number(scoreFilter);
    if (minScore > 0) params.set("minScore", String(minScore));
    if (platform !== "all") params.set("platform", platform);

    const resp = await fetch(`/api/jobs?${params.toString()}`, {
      cache: "no-store",
      signal,
    });
    if (!resp.ok) throw new Error(`Failed to load jobs (HTTP ${resp.status})`);
    const data = (await resp.json()) as { jobs: GetApiJob[] };
    return data.jobs;
  }, [platform, scoreFilter]);

  const handleEvent = useCallback((ev: StreamEvent): void => {
    switch (ev.type) {
      case "status":
        setStatusMessage(ev.message);
        break;
      case "start":
        setProgress({ current: 0, total: ev.total });
        setStatusMessage(
          ev.total === 0
            ? "No new jobs found."
            : `Loading jobs… 0/${ev.total}`,
        );
        break;
      case "job":
        setJobs((prev) => {
          const filtered = prev.filter((j) => j.id !== ev.job.id);
          return sortByScore([ev.job, ...filtered]);
        });
        setProgress((p) => {
          if (!p) return p;
          const next = { current: p.current + 1, total: p.total };
          setStatusMessage(`Loading jobs… ${next.current}/${next.total}`);
          return next;
        });
        break;
      case "done":
        setStatusMessage(
          ev.total === 0
            ? "No new jobs."
            : `Loaded ${ev.total} jobs${ev.ghost_count ? ` (${ev.ghost_count} ghosts skipped)` : ""}.`,
        );
        setProgress(null);
        break;
      case "error":
        setError(ev.message);
        break;
    }
  }, []);

  const triggerScrape = useCallback(async (): Promise<void> => {
    if (streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setError(null);
    setStatusMessage("Scraping latest listings…");
    setProgress(null);

    try {
      const resp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: ["greenhouse", "lever"],
          query: scrapeDefaults.query,
          location: scrapeDefaults.location,
          greenhouse_slugs: scrapeDefaults.greenhouseSlugs,
          lever_slugs: scrapeDefaults.leverSlugs,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Scrape failed (HTTP ${resp.status})${text ? `: ${text.slice(0, 200)}` : ""}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.replace(/^data:\s*/, "");
          try {
            const ev = JSON.parse(payload) as StreamEvent;
            handleEvent(ev);
          } catch (err) {
            console.error("[feed:sse:parse:ERROR]", err, payload);
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [handleEvent, scrapeDefaults, streaming]);

  // Mount + filter change: load cached jobs from DB only.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const cached = await loadJobs(controller.signal);
        setJobs(sortByScore(cached));
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadJobs]);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const above70 = jobs.filter((j) => (j.matchScore ?? 0) >= 70).length;
    return { total, above70, autoApplied: 0 };
  }, [jobs]);

  const progressPct = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
            Job Feed
          </h1>
          <p className="text-sm" style={{ color: "#5A9EA8" }}>
            Ranked by match against your CV. 5 perfect applications beat 500 generic ones.
          </p>
        </div>
        <Button variant="primary" onClick={triggerScrape} disabled={streaming}>
          {streaming ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Jobs in feed" value={stats.total} />
        <StatCard label="Above 70% match" value={stats.above70} />
        <StatCard label="Auto-applied today" value={stats.autoApplied} />
      </section>

      <section
        className="rounded-xl border bg-white p-4"
        style={{ borderColor: "#B2EDEC" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search title, company, location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <FilterPills
            value={platform}
            onChange={(v) => setPlatform(v as (typeof PLATFORMS)[number]["id"])}
            options={PLATFORMS.map((p) => ({ id: p.id, label: p.label }))}
          />
          <FilterPills
            value={scoreFilter}
            onChange={(v) => setScoreFilter(v as ScoreFilter)}
            options={SCORE_FILTERS.map((s) => ({ id: s.id, label: s.label }))}
          />
        </div>
      </section>

      {progress ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs" style={{ color: "#5A9EA8" }}>
            <span>{statusMessage ?? `Loading jobs… ${progress.current}/${progress.total}`}</span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "#E0F9FA" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "#00B8D9" }}
            />
          </div>
        </div>
      ) : statusMessage ? (
        <p className="text-sm" style={{ color: "#5A9EA8" }}>
          {statusMessage}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            background: "#FFF5E0",
            borderColor: "#FFDEA0",
            color: "#A05E00",
          }}
        >
          {error}
        </div>
      ) : null}

      {loading && jobs.length === 0 ? (
        <FeedSkeleton />
      ) : filteredJobs.length === 0 ? (
        <EmptyState onRefresh={triggerScrape} refreshing={streaming} />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={toFeedJob(job)}
              onApply={() => {
                window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: "#B2EDEC" }}>
      <div className="text-xs uppercase tracking-wide" style={{ color: "#5A9EA8" }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: "#0C1A1C" }}>
        {value}
      </div>
    </div>
  );
}

function FilterPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              active
                ? { background: "#00B8D9", color: "#FFFFFF", border: "1px solid #00B8D9" }
                : {
                    background: "#FFFFFF",
                    color: "#0C1A1C",
                    border: "1px solid #B2EDEC",
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FeedSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border bg-white"
          style={{ borderColor: "#D4F5F5" }}
        />
      ))}
    </div>
  );
}

function EmptyState({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-white p-10 text-center" style={{ borderColor: "#B2EDEC" }}>
      <p className="text-sm" style={{ color: "#5A9EA8" }}>
        No jobs found. Click refresh to scrape latest listings.
      </p>
      <div className="mt-4">
        <Button variant="primary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh now"}
        </Button>
      </div>
    </div>
  );
}
