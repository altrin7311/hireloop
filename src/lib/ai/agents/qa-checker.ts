import { groq } from "@ai-sdk/groq";
import type { LangfuseTraceClient } from "langfuse";
import { generateObject } from "ai";
import { z } from "zod";

import type { DocumentChunk } from "@/lib/db/schema";

import { BANNED_WORDS } from "@/lib/ai/agents/cover-letter";
import {
  GROQ_STRUCTURED_MODEL,
  type JobAnalysis,
  type QAReport,
  type TailoredCV,
} from "@/lib/ai/agents/types";
import { startAgentSpan } from "@/lib/observability/langfuse";

const IssueSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(["blocker", "warning"]),
  description: z.string().min(1),
  suggestion: z.string().min(1),
});

const QAReportSchema = z.object({
  approved: z.boolean(),
  issues: z.array(IssueSchema),
  qualityScore: z.number().int().min(0).max(100),
});

const SYSTEM_PROMPT = `You are HireLoop's QA Checker. Audit a tailored CV + cover letter against the source experience and job analysis.

Check for:
1. FABRICATION (blocker): a skill/tool/role in the CV that has no support in <user_experience>.
2. TONE MISMATCH (warning): cover letter voice does not match <company_tone>.
3. BANNED WORDS (blocker): cover letter contains any of: passionate, synergy, innovative, leverage, rockstar.
4. KEY PHRASE COVERAGE (warning): fewer than 50% of <key_phrases> appear (case-insensitive) across CV + cover letter.
5. STRUCTURE (warning): cover letter not 3 paragraphs; CV missing summary or experience.

approved = true ONLY if there are zero blocker-severity issues.
qualityScore: 0-100. Start at 100, subtract 25 per blocker, 8 per warning. Floor at 0.
Be precise and quote the offending text in description where useful.`;

function buildPrompt(
  tailoredCV: TailoredCV,
  coverLetter: string,
  relevantChunks: DocumentChunk[],
  jobAnalysis: JobAnalysis,
): string {
  const experience = relevantChunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  return `<job_analysis>
role: ${jobAnalysis.roleTitle}
seniority: ${jobAnalysis.seniority}
company_tone: ${jobAnalysis.companyTone}
must_have_skills: ${jobAnalysis.mustHaveSkills.join(", ")}
key_phrases: ${jobAnalysis.keyPhrases.join(" | ")}
</job_analysis>

<banned_words>${BANNED_WORDS.join(", ")}</banned_words>

<user_experience>
${experience}
</user_experience>

<tailored_cv>
${JSON.stringify(tailoredCV, null, 2)}
</tailored_cv>

<cover_letter>
${coverLetter}
</cover_letter>

Audit and return the QA report.`;
}

export async function runQAChecker(
  tailoredCV: TailoredCV,
  coverLetter: string,
  relevantChunks: DocumentChunk[],
  jobAnalysis: JobAnalysis,
  trace: LangfuseTraceClient | null = null,
): Promise<QAReport> {
  const prompt = buildPrompt(tailoredCV, coverLetter, relevantChunks, jobAnalysis);
  const span = startAgentSpan({
    trace,
    agent: "qa-checker",
    model: GROQ_STRUCTURED_MODEL,
    input: { system: SYSTEM_PROMPT, prompt },
  });

  try {
    const result = await generateObject({
      model: groq(GROQ_STRUCTURED_MODEL),
      schema: QAReportSchema,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      prompt,
    });

    const report = result.object;
    console.log(
      `[qa-checker] approved=${report.approved} score=${report.qualityScore} issues=${report.issues.length}`,
    );
    span.finish({
      output: report,
      usage: {
        input: result.usage?.inputTokens,
        output: result.usage?.outputTokens,
        total: result.usage?.totalTokens,
      },
    });
    return report;
  } catch (err) {
    span.fail(err);
    throw err;
  }
}
