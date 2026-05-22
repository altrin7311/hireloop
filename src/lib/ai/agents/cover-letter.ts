import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

import type { DocumentChunk, UserPreferences } from "@/lib/db/schema";

import {
  GROQ_MODEL,
  type JobAnalysis,
} from "@/lib/ai/agents/types";

export const BANNED_WORDS = [
  "passionate",
  "synergy",
  "innovative",
  "leverage",
  "rockstar",
] as const;

const SYSTEM_PROMPT = `You are an expert cover letter writer for HireLoop.

RULES:
- Exactly 3 paragraphs. No more, no less. Roughly 250-350 words total.
- Paragraph 1: open with a specific hook tied to the company/role. No "I am writing to apply..." cliches.
- Paragraph 2: one concrete proof point from the candidate's experience that maps to a job requirement.
- Paragraph 3: short close — what excites about the role + a clear next step.
- BANNED WORDS (never use, no exceptions): passionate, synergy, innovative, leverage, rockstar.
- Mirror the company's tone (provided). Formal = precise + restrained. Casual = warm + direct. Technical = specs + numbers, low fluff. Mission-driven = purpose-led.
- Only reference experience that appears in <user_experience>. Do not invent.
- Output plain text only. No salutations like "Dear Hiring Manager," no signature.`;

function buildPrompt(
  jobAnalysis: JobAnalysis,
  chunks: DocumentChunk[],
  prefs: UserPreferences,
): string {
  const experience = chunks
    .slice(0, 6)
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  const name = prefs.preferredName ?? "the candidate";
  const emphasize = (prefs.alwaysEmphasize ?? []).join(", ");
  const avoid = (prefs.neverMention ?? []).join(", ");

  return `<role>${jobAnalysis.roleTitle} at ${jobAnalysis.company}</role>
<seniority>${jobAnalysis.seniority}</seniority>
<must_have_skills>${jobAnalysis.mustHaveSkills.join(", ")}</must_have_skills>
<key_phrases>${jobAnalysis.keyPhrases.join(" | ")}</key_phrases>
<company_tone>${jobAnalysis.companyTone}</company_tone>
<candidate_name>${name}</candidate_name>
<always_emphasize>${emphasize}</always_emphasize>
<never_mention>${avoid}</never_mention>

<user_experience>
${experience}
</user_experience>

Write the cover letter now. 3 paragraphs. Plain text only.`;
}

export interface CoverLetterOptions {
  onDelta?: (delta: string) => void;
}

export async function runCoverLetter(
  jobAnalysis: JobAnalysis,
  relevantChunks: DocumentChunk[],
  userPreferences: UserPreferences,
  options: CoverLetterOptions = {},
): Promise<string> {
  const result = streamText({
    model: groq(GROQ_MODEL),
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(jobAnalysis, relevantChunks, userPreferences),
  });

  let full = "";
  for await (const delta of result.textStream) {
    full += delta;
    options.onDelta?.(delta);
  }
  return full.trim();
}
