import { z } from "zod";

export const healthCheckRequestSchema = z.object({
  cvText: z.string().min(50, "Paste at least 50 characters of CV text.").max(20_000),
  jobDescription: z
    .string()
    .min(50, "Paste at least 50 characters of job description.")
    .max(20_000),
});

export type HealthCheckRequest = z.infer<typeof healthCheckRequestSchema>;

export const healthCheckResponseSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  missingKeywords: z.array(z.string()).max(20),
  suggestions: z.array(z.string()).length(3),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
