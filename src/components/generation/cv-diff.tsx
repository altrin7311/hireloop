"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TailoredCV } from "@/lib/ai/agents/types";

export interface CVDiffProps {
  originalChunks: { sourceFile: string; chunkType: string; content: string }[];
  tailoredCV: TailoredCV;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .filter((t) => t.length >= 3),
  );
}

function highlight(text: string, originalTokens: Set<string>): React.JSX.Element {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, idx) => {
        if (!/\S/.test(part)) return <span key={idx}>{part}</span>;
        const clean = part.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
        const isNew = clean.length >= 3 && !originalTokens.has(clean);
        if (!isNew) return <span key={idx}>{part}</span>;
        return (
          <mark
            key={idx}
            className="rounded px-0.5"
            style={{ background: "#E0F9FA", color: "#0097B2" }}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
}

function tailoredAsText(cv: TailoredCV): string {
  const parts: string[] = [];
  parts.push("SUMMARY", cv.summary);
  parts.push("\nEXPERIENCE");
  for (const role of cv.experience) {
    parts.push(`${role.title} — ${role.company} (${role.dates})`);
    for (const b of role.bullets) parts.push(`• ${b}`);
  }
  parts.push("\nSKILLS");
  parts.push(`Featured: ${cv.skills.featured.join(", ")}`);
  parts.push(`Additional: ${cv.skills.additional.join(", ")}`);
  if (cv.projects.length > 0) {
    parts.push("\nPROJECTS");
    for (const p of cv.projects) {
      parts.push(`${p.name} — ${p.description} [${p.technologies.join(", ")}]`);
    }
  }
  return parts.join("\n");
}

export function CVDiff({ originalChunks, tailoredCV }: CVDiffProps): React.JSX.Element {
  const [show, setShow] = useState(true);

  const originalText = useMemo(() => {
    return originalChunks
      .map((c) => `[${c.sourceFile} / ${c.chunkType}]\n${c.content}`)
      .join("\n\n");
  }, [originalChunks]);

  const originalTokens = useMemo(() => tokenize(originalText), [originalText]);
  const tailoredText = useMemo(() => tailoredAsText(tailoredCV), [tailoredCV]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "#0C1A1C" }}>
          Diff vs your uploaded experience
        </h2>
        <Button variant="secondary" size="sm" onClick={() => setShow((s) => !s)}>
          {show ? "Hide changes" : "Show changes"}
        </Button>
      </div>
      {show ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            className="rounded-xl border bg-white p-4"
            style={{ borderColor: "#B2EDEC" }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#5A9EA8" }}
            >
              Original
            </div>
            <pre
              className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed"
              style={{ color: "#0C1A1C" }}
            >
              {originalText || "No source chunks."}
            </pre>
          </div>
          <div
            className="rounded-xl border bg-white p-4"
            style={{ borderColor: "#B2EDEC" }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#5A9EA8" }}
            >
              Tailored (new content highlighted)
            </div>
            <pre
              className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed"
              style={{ color: "#0C1A1C" }}
            >
              {highlight(tailoredText, originalTokens)}
            </pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
