"use client";

import { Check, X, Loader2 } from "lucide-react";

import type { AgentName } from "@/lib/ai/agents/types";

export type AgentStepStatus = "pending" | "running" | "done" | "error";

export interface AgentStepState {
  name: AgentName;
  label: string;
  status: AgentStepStatus;
  durationMs?: number;
  error?: string;
}

export const DEFAULT_STEPS: AgentStepState[] = [
  { name: "job-analyst", label: "Analysing job", status: "pending" },
  { name: "relevancy", label: "Retrieving your experience", status: "pending" },
  { name: "cv-writer", label: "Writing CV", status: "pending" },
  { name: "cover-letter", label: "Writing cover letter", status: "pending" },
  { name: "qa-checker", label: "QA check", status: "pending" },
];

function indicatorStyle(status: AgentStepStatus): React.CSSProperties {
  switch (status) {
    case "done":
      return { background: "#00B8D9", color: "#FFFFFF", border: "1px solid #00B8D9" };
    case "running":
      return { background: "#E0F9FA", color: "#0097B2", border: "1px solid #00B8D9" };
    case "error":
      return { background: "#FFF5E0", color: "#A05E00", border: "1px solid #FFDEA0" };
    default:
      return { background: "#FFFFFF", color: "#8ABCC4", border: "1px solid #D4F5F5" };
  }
}

function Indicator({ status }: { status: AgentStepStatus }): React.JSX.Element {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={indicatorStyle(status)}
    >
      {status === "done" ? (
        <Check className="h-3.5 w-3.5" />
      ) : status === "running" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === "error" ? (
        <X className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#8ABCC4" }} />
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AgentTimeline({ steps }: { steps: AgentStepState[] }): React.JSX.Element {
  return (
    <ol className="space-y-3">
      {steps.map((step, idx) => (
        <li key={step.name} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <Indicator status={step.status} />
            {idx < steps.length - 1 ? (
              <span
                className="mt-1 h-6 w-px"
                style={{
                  background: step.status === "done" ? "#00B8D9" : "#D4F5F5",
                }}
              />
            ) : null}
          </div>
          <div className="flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm font-medium"
                style={{
                  color: step.status === "pending" ? "#8ABCC4" : "#0C1A1C",
                }}
              >
                {step.label}
              </span>
              {step.status === "done" && step.durationMs != null ? (
                <span className="text-xs" style={{ color: "#5A9EA8" }}>
                  {formatDuration(step.durationMs)}
                </span>
              ) : null}
            </div>
            {step.error ? (
              <p className="mt-0.5 text-xs" style={{ color: "#A05E00" }}>
                {step.error}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
