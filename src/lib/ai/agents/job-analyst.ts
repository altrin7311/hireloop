import { groq } from "@ai-sdk/groq";
import type { LangfuseTraceClient } from "langfuse";
import { generateObject } from "ai";
import { z } from "zod";

import { GROQ_STRUCTURED_MODEL, type JobAnalysis } from "@/lib/ai/agents/types";
import { startAgentSpan } from "@/lib/observability/langfuse";

const JobAnalysisSchema = z.object({
  roleTitle: z.string().min(1),
  company: z.string().min(1),
  seniority: z.string().min(1),
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  companyTone: z.enum(["formal", "casual", "technical", "mission-driven"]),
  keyPhrases: z.array(z.string()),
  reasoning: z.string(),
});

const SYSTEM_PROMPT = `You are HireLoop's Job Analyst. Read a raw job description and extract structured signal.

Rules:
- mustHaveSkills: hard requirements the JD explicitly demands (e.g., "5+ years Python"). Max 12.
- niceToHaveSkills: preferred but not required. Max 10.
- companyTone: infer from JD voice — formal (corporate, precise), casual (playful, "we're a fun team"), technical (deep specs, no fluff), mission-driven (impact, purpose, "we believe").
- keyPhrases: 5-10 distinctive phrases worth mirroring in the application (exact JD wording).
- reasoning: 1-2 sentences explaining tone + seniority calls.
- Do not invent skills. Use the JD's own wording.`;

export async function runJobAnalyst(
  jobDescription: string,
  trace: LangfuseTraceClient | null = null,
): Promise<JobAnalysis> {
  const prompt = `Extract structured analysis from this listing.\n\n<job_description>\n${jobDescription}\n</job_description>`;
  const span = startAgentSpan({
    trace,
    agent: "job-analyst",
    model: GROQ_STRUCTURED_MODEL,
    input: { system: SYSTEM_PROMPT, prompt },
  });

  try {
    const result = await generateObject({
      model: groq(GROQ_STRUCTURED_MODEL),
      schema: JobAnalysisSchema,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      prompt,
    });

    const analysis = result.object;
    console.log(
      `[job-analyst] extracted ${analysis.mustHaveSkills.length} must-have skills, ${analysis.niceToHaveSkills.length} nice-to-have`,
    );
    span.finish({
      output: analysis,
      usage: {
        input: result.usage?.inputTokens,
        output: result.usage?.outputTokens,
        total: result.usage?.totalTokens,
      },
    });
    return analysis;
  } catch (err) {
    span.fail(err);
    throw err;
  }
}
