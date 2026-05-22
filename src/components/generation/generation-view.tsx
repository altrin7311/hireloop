"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AgentTimeline,
  DEFAULT_STEPS,
  type AgentStepState,
} from "@/components/generation/agent-timeline";
import { CVDiff } from "@/components/generation/cv-diff";
import type {
  AgentName,
  PipelineEvent,
  QAReport,
  TailoredCV,
} from "@/lib/ai/agents/types";

export interface GenerationViewProps {
  jobId: string;
  jobTitle: string;
  company: string;
  originalChunks: { sourceFile: string; chunkType: string; content: string }[];
}

type Tab = "cv" | "cover-letter";

const STEP_LABEL: Record<AgentName, string> = {
  "job-analyst": "Analysing job",
  relevancy: "Retrieving your experience",
  "cv-writer": "Writing CV",
  "cover-letter": "Writing cover letter",
  "qa-checker": "QA check",
};

export function GenerationView({
  jobId,
  jobTitle,
  company,
  originalChunks,
}: GenerationViewProps): React.JSX.Element {
  const [steps, setSteps] = useState<AgentStepState[]>(DEFAULT_STEPS);
  const [tab, setTab] = useState<Tab>("cv");
  const [tailoredCV, setTailoredCV] = useState<TailoredCV | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [editedCover, setEditedCover] = useState<string>("");
  const [qaReport, setQAReport] = useState<QAReport | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  const updateStep = useCallback((agent: AgentName, patch: Partial<AgentStepState>): void => {
    setSteps((prev) =>
      prev.map((s) => (s.name === agent ? { ...s, ...patch, label: STEP_LABEL[agent] } : s)),
    );
  }, []);

  const handleEvent = useCallback(
    (ev: PipelineEvent): void => {
      switch (ev.type) {
        case "agent:start":
          updateStep(ev.agent, { status: "running" });
          break;
        case "agent:complete":
          updateStep(ev.agent, { status: "done", durationMs: ev.durationMs });
          break;
        case "agent:error":
          updateStep(ev.agent, { status: "error", error: ev.message });
          break;
        case "content:delta":
          if (ev.field === "cv" && ev.cv) {
            setTailoredCV(ev.cv);
          } else if (ev.field === "coverLetter" && ev.text) {
            setCoverLetter((prev) => prev + ev.text);
          }
          break;
        case "pipeline:complete":
          setTailoredCV(ev.tailoredCV);
          setCoverLetter(ev.coverLetter);
          setEditedCover(ev.coverLetter);
          setQAReport(ev.qaReport);
          setDone(true);
          break;
        case "pipeline:error":
          setPipelineError(ev.message);
          setDone(true);
          break;
      }
    },
    [updateStep],
  );

  const start = useCallback(async (): Promise<void> => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    setPipelineError(null);

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `Generate failed (HTTP ${resp.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
        );
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.replace(/^data:\s*/, "");
          try {
            const ev = JSON.parse(payload) as PipelineEvent;
            handleEvent(ev);
          } catch (err) {
            console.error("[generation:sse:parse:ERROR]", err, payload);
          }
        }
      }
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Unknown error");
      setDone(true);
    }
  }, [handleEvent, jobId]);

  useEffect(() => {
    if (!startedRef.current) void start();
  }, [start]);

  const qaApproved = qaReport?.approved ?? false;
  const warnings = qaReport?.issues.filter((i) => i.severity === "warning").length ?? 0;
  const blockers = qaReport?.issues.filter((i) => i.severity === "blocker").length ?? 0;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
            {jobTitle}
          </h1>
          <p className="text-sm" style={{ color: "#5A9EA8" }}>
            {company} · Live generation
          </p>
        </div>
        {qaReport ? <QABadge approved={qaApproved} warnings={warnings} blockers={blockers} /> : null}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <aside
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: "#B2EDEC" }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "#5A9EA8" }}>
            Agent timeline
          </h2>
          <AgentTimeline steps={steps} />
          {qaReport ? (
            <div className="mt-4 border-t pt-3" style={{ borderColor: "#D4F5F5" }}>
              <div className="text-xs" style={{ color: "#5A9EA8" }}>
                Quality
              </div>
              <div className="text-xl font-semibold" style={{ color: "#0C1A1C" }}>
                {qaReport.qualityScore}/100
              </div>
            </div>
          ) : null}
          {pipelineError ? (
            <div
              className="mt-4 rounded-md border px-3 py-2 text-xs"
              style={{ background: "#FFF5E0", borderColor: "#FFDEA0", color: "#A05E00" }}
            >
              {pipelineError}
            </div>
          ) : null}
        </aside>

        <section
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: "#B2EDEC" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <TabSwitch tab={tab} onChange={setTab} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing((e) => !e)}
              disabled={!done || !!pipelineError}
            >
              {editing ? "Done editing" : "Edit"}
            </Button>
          </div>

          {tab === "cv" ? (
            <CVPanel cv={tailoredCV} streaming={started && !done} />
          ) : (
            <CoverLetterPanel
              text={editing ? editedCover : coverLetter}
              streaming={started && !done}
              editing={editing}
              onChange={setEditedCover}
            />
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="primary"
              disabled={!done || !qaApproved || !!pipelineError}
              onClick={() => alert("Submission pipeline ships in Phase 6.")}
            >
              Confirm &amp; Apply
            </Button>
          </div>
        </section>
      </div>

      {tailoredCV && done && !pipelineError ? (
        <CVDiff originalChunks={originalChunks} tailoredCV={tailoredCV} />
      ) : null}
    </div>
  );
}

function QABadge({
  approved,
  warnings,
  blockers,
}: {
  approved: boolean;
  warnings: number;
  blockers: number;
}): React.JSX.Element {
  if (approved && warnings === 0) {
    return (
      <span
        className="rounded-md px-2.5 py-1 text-xs font-semibold"
        style={{ background: "#00B8D9", color: "#FFFFFF", border: "1px solid #00B8D9" }}
      >
        Passed
      </span>
    );
  }
  if (blockers > 0) {
    return (
      <span
        className="rounded-md px-2.5 py-1 text-xs font-semibold"
        style={{ background: "#FFF5E0", color: "#A05E00", border: "1px solid #FFDEA0" }}
      >
        {blockers} blocker{blockers === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span
      className="rounded-md px-2.5 py-1 text-xs font-semibold"
      style={{ background: "#FFF5E0", color: "#A05E00", border: "1px solid #FFDEA0" }}
    >
      {warnings} warning{warnings === 1 ? "" : "s"}
    </span>
  );
}

function TabSwitch({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}): React.JSX.Element {
  const tabs: { id: Tab; label: string }[] = [
    { id: "cv", label: "CV" },
    { id: "cover-letter", label: "Cover Letter" },
  ];
  return (
    <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "#B2EDEC" }}>
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            style={
              active
                ? { background: "#00B8D9", color: "#FFFFFF" }
                : { background: "transparent", color: "#0C1A1C" }
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CVPanel({
  cv,
  streaming,
}: {
  cv: TailoredCV | null;
  streaming: boolean;
}): React.JSX.Element {
  if (!cv) {
    return (
      <div className="space-y-3 text-sm" style={{ color: "#5A9EA8" }}>
        {streaming ? "Waiting for CV…" : "Pipeline not started."}
      </div>
    );
  }
  return (
    <div className="space-y-5 text-sm" style={{ color: "#0C1A1C" }}>
      <Section title="Summary">
        <p>{cv.summary || <em style={{ color: "#8ABCC4" }}>Empty</em>}</p>
      </Section>
      <Section title="Experience">
        <ul className="space-y-3">
          {cv.experience.map((role, i) => (
            <li key={i}>
              <div className="font-semibold">
                {role.title}{" "}
                <span style={{ color: "#5A9EA8" }}>
                  — {role.company} · {role.dates}
                </span>
              </div>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {role.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Skills">
        <div className="space-y-1">
          <div>
            <span style={{ color: "#5A9EA8" }}>Featured:</span> {cv.skills.featured.join(", ")}
          </div>
          {cv.skills.additional.length > 0 ? (
            <div>
              <span style={{ color: "#5A9EA8" }}>Additional:</span>{" "}
              {cv.skills.additional.join(", ")}
            </div>
          ) : null}
        </div>
      </Section>
      {cv.projects.length > 0 ? (
        <Section title="Projects">
          <ul className="space-y-2">
            {cv.projects.map((p, i) => (
              <li key={i}>
                <div className="font-semibold">{p.name}</div>
                <div>{p.description}</div>
                <div className="text-xs" style={{ color: "#5A9EA8" }}>
                  {p.technologies.join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function CoverLetterPanel({
  text,
  streaming,
  editing,
  onChange,
}: {
  text: string;
  streaming: boolean;
  editing: boolean;
  onChange: (v: string) => void;
}): React.JSX.Element {
  if (editing) {
    return (
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        className="font-sans"
      />
    );
  }
  if (!text) {
    return (
      <div className="text-sm" style={{ color: "#5A9EA8" }}>
        {streaming ? "Cover letter streaming…" : "Pipeline not started."}
      </div>
    );
  }
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "#0C1A1C" }}>
      {text}
      {streaming ? (
        <span
          className="ml-0.5 inline-block h-3.5 w-1 animate-pulse align-middle"
          style={{ background: "#00B8D9" }}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <h3
        className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#5A9EA8" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
