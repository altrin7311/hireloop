import { ANTHROPIC_MODELS, getAnthropic } from "@/lib/ai/anthropic";
import {
  healthCheckResponseSchema,
  type HealthCheckRequest,
  type HealthCheckResponse,
} from "@/lib/validation/health-check";

const SYSTEM_PROMPT = `You are HireLoop's Resume Health Check. Compare a candidate's CV against a job description and produce a brutally honest match assessment.

Rules:
- matchScore: integer 0–100. 0 = no overlap; 100 = perfect fit.
- missingKeywords: skills, tools, or qualifications the JD demands that the CV does not show. Max 10 items. Use the JD's exact wording.
- suggestions: exactly 3 short, concrete rewrite instructions ranked by impact. Each one actionable. No fluff. No generic advice like "tailor your CV" — say *what* to change.
- Never invent skills the candidate does not appear to have. Be honest.

Return only via the report tool.`;

export async function runResumeHealthCheck(
  input: HealthCheckRequest,
): Promise<HealthCheckResponse> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODELS.haiku,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "report",
        description: "Return the Resume Health Check result.",
        input_schema: {
          type: "object",
          properties: {
            matchScore: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description: "Match score 0–100",
            },
            missingKeywords: {
              type: "array",
              items: { type: "string" },
              maxItems: 10,
            },
            suggestions: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["matchScore", "missingKeywords", "suggestions"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "report" },
    messages: [
      {
        role: "user",
        content: `<cv>\n${input.cvText}\n</cv>\n\n<job_description>\n${input.jobDescription}\n</job_description>\n\nProduce the report.`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a tool_use block");
  }

  return healthCheckResponseSchema.parse(toolUse.input);
}
