import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

import type { DocumentChunk, UserPreferences } from "@/lib/db/schema";

import {
  GROQ_MODEL,
  type JobAnalysis,
  type TailoredCV,
} from "@/lib/ai/agents/types";

const SYSTEM_PROMPT = `You are an expert CV writer for HireLoop. You rewrite a candidate's CV sections to match a specific role.

CRITICAL RULES:
- Only use skills, experience, projects, or technologies that appear in <user_experience>. Never invent.
- Mirror exact phrasing from <key_phrases> where the candidate's experience supports it.
- bullets: 3-6 per role, each starting with a strong action verb, quantified where possible.
- summary: 2-3 sentences, role-specific. No buzzwords.
- featured skills: top 6-8 the role demands AND the candidate demonstrably has.
- additional skills: remainder, deduped.
- removedSections: list any sections you dropped (e.g., "Volunteer work") because they were not relevant.
- writingNotes: 1-2 sentence explanation of your tailoring choices.
- Output MUST be valid JSON matching the schema. No markdown fences, no preamble, no trailing prose.`;

function buildPrompt(
  jobAnalysis: JobAnalysis,
  chunks: DocumentChunk[],
  prefs: UserPreferences,
): string {
  const experience = chunks
    .map((c, i) => `[chunk ${i + 1} — ${c.sourceFile} / ${c.chunkType}]\n${c.content}`)
    .join("\n\n");

  const emphasize = (prefs.alwaysEmphasize ?? []).join(", ");
  const avoid = (prefs.neverMention ?? []).join(", ");
  const tone = prefs.tonePreference ?? jobAnalysis.companyTone;

  return `<job_requirements>${jobAnalysis.mustHaveSkills.join(", ")}</job_requirements>
<nice_to_have>${jobAnalysis.niceToHaveSkills.join(", ")}</nice_to_have>
<key_phrases>${jobAnalysis.keyPhrases.join(" | ")}</key_phrases>
<company_tone>${jobAnalysis.companyTone}</company_tone>
<writing_tone>${tone}</writing_tone>
<always_emphasize>${emphasize}</always_emphasize>
<never_mention>${avoid}</never_mention>

<user_experience>
${experience}
</user_experience>

TASK: Rewrite the CV sections tailored to this role.
CRITICAL: Only use skills present in <user_experience>.

OUTPUT: A single JSON object with this exact shape:
{
  "summary": string,
  "experience": [{ "title": string, "company": string, "dates": string, "bullets": string[] }],
  "skills": { "featured": string[], "additional": string[] },
  "projects": [{ "name": string, "description": string, "technologies": string[] }],
  "removedSections": string[],
  "writingNotes": string
}`;
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const inner = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    return inner.trim();
  }
  return trimmed;
}

function parseTailoredCV(raw: string): TailoredCV {
  const cleaned = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `CV writer JSON parse failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("CV writer returned non-object JSON");
  }
  const p = parsed as Partial<TailoredCV>;
  return {
    summary: typeof p.summary === "string" ? p.summary : "",
    experience: Array.isArray(p.experience) ? p.experience : [],
    skills: {
      featured: Array.isArray(p.skills?.featured) ? p.skills.featured : [],
      additional: Array.isArray(p.skills?.additional) ? p.skills.additional : [],
    },
    projects: Array.isArray(p.projects) ? p.projects : [],
    removedSections: Array.isArray(p.removedSections) ? p.removedSections : [],
    writingNotes: typeof p.writingNotes === "string" ? p.writingNotes : "",
  };
}

export async function runCVWriter(
  jobAnalysis: JobAnalysis,
  relevantChunks: DocumentChunk[],
  userPreferences: UserPreferences,
): Promise<TailoredCV> {
  const result = streamText({
    model: groq(GROQ_MODEL),
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(jobAnalysis, relevantChunks, userPreferences),
  });

  let buffer = "";
  for await (const delta of result.textStream) {
    buffer += delta;
  }
  return parseTailoredCV(buffer);
}
