"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SENIORITY_OPTIONS = ["junior", "mid", "senior", "lead"] as const;
const TONE_OPTIONS = ["formal", "conversational", "technical"] as const;

const FormSchema = z.object({
  targetRoles: z.string().min(1, "Required"),
  targetLocations: z.string().min(1, "Required"),
  seniorityLevel: z.enum(SENIORITY_OPTIONS),
  tonePreference: z.enum(TONE_OPTIONS),
  salaryExpectation: z.string().optional(),
  noticePeriod: z.string().min(1, "Required"),
  alwaysEmphasize: z.string().optional(),
  neverMention: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface PreferencesRow {
  targetRoles: string[] | null;
  targetLocations: string[] | null;
  seniorityLevel: string | null;
  tonePreference: string | null;
  salaryExpectation: string | null;
  noticePeriod: string | null;
  alwaysEmphasize: string[] | null;
  neverMention: string[] | null;
}

function arrToCsv(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}

function csvToArr(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function textToLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isSeniority(v: string | null): v is (typeof SENIORITY_OPTIONS)[number] {
  return v !== null && (SENIORITY_OPTIONS as readonly string[]).includes(v);
}

function isTone(v: string | null): v is (typeof TONE_OPTIONS)[number] {
  return v !== null && (TONE_OPTIONS as readonly string[]).includes(v);
}

export function Questionnaire(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      targetRoles: "",
      targetLocations: "",
      seniorityLevel: "mid",
      tonePreference: "conversational",
      salaryExpectation: "",
      noticePeriod: "",
      alwaysEmphasize: "",
      neverMention: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);
        const json = (await res.json()) as { preferences: PreferencesRow | null };
        if (cancelled || !json.preferences) return;
        const p = json.preferences;
        form.reset({
          targetRoles: arrToCsv(p.targetRoles),
          targetLocations: arrToCsv(p.targetLocations),
          seniorityLevel: isSeniority(p.seniorityLevel) ? p.seniorityLevel : "mid",
          tonePreference: isTone(p.tonePreference) ? p.tonePreference : "conversational",
          salaryExpectation: p.salaryExpectation ?? "",
          noticePeriod: p.noticePeriod ?? "",
          alwaysEmphasize: (p.alwaysEmphasize ?? []).join("\n"),
          neverMention: (p.neverMention ?? []).join("\n"),
        });
      } catch (err) {
        console.error("[questionnaire:load]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const body = {
        target_roles: csvToArr(values.targetRoles),
        target_locations: csvToArr(values.targetLocations),
        seniority_level: values.seniorityLevel,
        tone_preference: values.tonePreference,
        salary_expectation: values.salaryExpectation?.trim() ?? "",
        notice_period: values.noticePeriod.trim(),
        always_emphasize: textToLines(values.alwaysEmphasize ?? ""),
        never_mention: textToLines(values.neverMention ?? ""),
      };
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({ error: "Unknown" }))) as {
          error?: string;
        };
        throw new Error(errJson.error ?? `HTTP ${res.status}`);
      }
      setToast({ type: "success", message: "Preferences saved" });
    } catch (err) {
      console.error("[questionnaire:save]", err);
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  });

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="targetRoles">Target roles</Label>
          <Input
            id="targetRoles"
            placeholder="Senior Frontend Engineer, Staff Engineer"
            {...form.register("targetRoles")}
          />
          <p className="text-xs" style={{ color: "#8ABCC4" }}>
            Comma separated.
          </p>
          {form.formState.errors.targetRoles ? (
            <p className="text-xs" style={{ color: "#A05E00" }}>
              {form.formState.errors.targetRoles.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="targetLocations">Target locations</Label>
          <Input
            id="targetLocations"
            placeholder="London, Remote, Berlin"
            {...form.register("targetLocations")}
          />
          <p className="text-xs" style={{ color: "#8ABCC4" }}>
            Comma separated.
          </p>
          {form.formState.errors.targetLocations ? (
            <p className="text-xs" style={{ color: "#A05E00" }}>
              {form.formState.errors.targetLocations.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seniorityLevel">Seniority level</Label>
            <select
              id="seniorityLevel"
              {...form.register("seniorityLevel")}
              className="flex h-10 w-full rounded-lg border border-[#B2EDEC] bg-white px-3 py-2 text-sm text-[#0C1A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9]"
            >
              {SENIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt[0]?.toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Tone preference</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {TONE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#B2EDEC", color: "#0C1A1C" }}
                >
                  <input
                    type="radio"
                    value={opt}
                    {...form.register("tonePreference")}
                    className="accent-[#00B8D9]"
                  />
                  <span>{opt[0]?.toUpperCase() + opt.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="salaryExpectation">Salary expectation</Label>
            <Input
              id="salaryExpectation"
              placeholder="£90k–£120k (optional)"
              {...form.register("salaryExpectation")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="noticePeriod">Notice period</Label>
            <Input
              id="noticePeriod"
              placeholder="1 month"
              {...form.register("noticePeriod")}
            />
            {form.formState.errors.noticePeriod ? (
              <p className="text-xs" style={{ color: "#A05E00" }}>
                {form.formState.errors.noticePeriod.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="alwaysEmphasize">Always emphasize</Label>
          <Textarea
            id="alwaysEmphasize"
            placeholder={"One per line.\nE.g. Led migration from REST to gRPC\nShipped to 2M+ users"}
            {...form.register("alwaysEmphasize")}
          />
          <p className="text-xs" style={{ color: "#8ABCC4" }}>
            Strengths or achievements HireLoop will weave into every application. One per line.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="neverMention">Never mention</Label>
          <Textarea
            id="neverMention"
            placeholder={"One per line.\nE.g. Previous employer X\nGap year 2022"}
            {...form.register("neverMention")}
          />
          <p className="text-xs" style={{ color: "#8ABCC4" }}>
            Topics HireLoop will avoid. One per line.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || loading}>
            {form.formState.isSubmitting ? "Saving…" : "Save preferences"}
          </Button>
          {loading ? (
            <span className="text-xs" style={{ color: "#5A9EA8" }}>
              Loading existing preferences…
            </span>
          ) : null}
        </div>
      </form>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-2.5 text-sm shadow-md"
          style={
            toast.type === "success"
              ? {
                  background: "#E0F9FA",
                  borderColor: "#00B8D9",
                  color: "#0097B2",
                }
              : {
                  background: "#FFF5E0",
                  borderColor: "#FFDEA0",
                  color: "#A05E00",
                }
          }
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
