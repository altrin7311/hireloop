"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  healthCheckResponseSchema,
  type HealthCheckResponse,
} from "@/lib/validation/health-check";

type ApiError = { error: string };

export function ResumeHealthCheck(): React.JSX.Element {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HealthCheckResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Partial<ApiError>;
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data: unknown = await res.json();
      setResult(healthCheckResponseSchema.parse(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  }

  const scoreTone =
    result == null
      ? null
      : result.matchScore >= 75
        ? { bg: "#E0F9FA", fg: "#0C1A1C", label: "Strong fit" }
        : result.matchScore >= 50
          ? { bg: "#FFF5E0", fg: "#A05E00", label: "Partial fit" }
          : { bg: "#FFF5E0", fg: "#A05E00", label: "Weak fit" };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-[#B2EDEC] bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Resume Health Check</h3>
          <p className="text-sm text-[#5A9EA8]">
            Paste your CV and the job description. We score the match in seconds. No account
            needed.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cv">Your CV (plain text)</Label>
          <Textarea
            id="cv"
            placeholder="Paste your CV here…"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            className="min-h-[180px]"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jd">Job description</Label>
          <Textarea
            id="jd"
            placeholder="Paste the job description here…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[180px]"
            required
          />
        </div>
        {error ? (
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              background: "#FFF5E0",
              color: "#A05E00",
              borderColor: "#FFDEA0",
            }}
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Scoring…" : "Score my CV"}
        </Button>
        <p className="text-xs text-[#8ABCC4]">
          Powered by Claude Haiku 4.5. Your text is sent to Anthropic; we don&apos;t store it.
        </p>
      </form>

      <div className="rounded-2xl border border-[#B2EDEC] bg-[#E0F9FA] p-6">
        {result == null ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="text-5xl font-bold text-[#8ABCC4]">—</div>
            <p className="max-w-xs text-sm text-[#5A9EA8]">
              Your match score, missing keywords, and 3 concrete fixes will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#5A9EA8]">
                  Match score
                </div>
                <div className="text-5xl font-extrabold tracking-tight text-[#0C1A1C]">
                  {result.matchScore}
                  <span className="text-2xl text-[#5A9EA8]">/100</span>
                </div>
              </div>
              {scoreTone ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: scoreTone.bg, color: scoreTone.fg }}
                >
                  {scoreTone.label}
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-[#5A9EA8]">
                Missing keywords
              </div>
              {result.missingKeywords.length === 0 ? (
                <p className="text-sm text-[#5A9EA8]">None — strong keyword coverage.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((kw) => (
                    <li
                      key={kw}
                      className="rounded-md border border-[#FFDEA0] bg-[#FFF5E0] px-2 py-1 text-xs text-[#A05E00]"
                    >
                      {kw}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-[#5A9EA8]">
                3 fixes ranked by impact
              </div>
              <ol className="space-y-2 text-sm text-[#0C1A1C]">
                {result.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-[#B2EDEC] bg-white p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00B8D9] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-[#B2EDEC] bg-white p-4 text-sm">
              <div className="mb-1 font-semibold text-[#0C1A1C]">
                Want HireLoop to rewrite it for you?
              </div>
              <div className="text-[#5A9EA8]">
                Apply with 1 credit and we&apos;ll tailor your CV and cover letter to this exact
                job in under 60 seconds.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
