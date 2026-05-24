/**
 * Centralised env validation. Imports are lazy so a missing optional key never
 * crashes a dev session — but `env.required(...)` throws a clear, scoped error
 * the first time a feature actually needs it.
 *
 * Use the named getters (`env.databaseUrl()`) instead of `process.env.X` in
 * server code so type checks + missing-value reporting live in one place.
 */
import { z } from "zod";

const RequiredSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid postgres:// URL"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  AUTOMATION_API_KEY: z.string().min(1),
});

const OptionalSchema = z.object({
  AUTOMATION_SERVICE_URL: z
    .string()
    .url()
    .optional()
    .default("http://localhost:8000"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().optional().default("https://cloud.langfuse.com"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
});

type RequiredEnv = z.infer<typeof RequiredSchema>;
type OptionalEnv = z.infer<typeof OptionalSchema>;

declare global {
  var __hireloopRequiredEnv: RequiredEnv | undefined;
  var __hireloopOptionalEnv: OptionalEnv | undefined;
}

function parseOptional(): OptionalEnv {
  if (globalThis.__hireloopOptionalEnv) return globalThis.__hireloopOptionalEnv;
  const parsed = OptionalSchema.parse({
    AUTOMATION_SERVICE_URL: process.env.AUTOMATION_SERVICE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_HOST: process.env.LANGFUSE_HOST,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
  });
  globalThis.__hireloopOptionalEnv = parsed;
  return parsed;
}

function parseRequired(): RequiredEnv {
  if (globalThis.__hireloopRequiredEnv) return globalThis.__hireloopRequiredEnv;
  const result = RequiredSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    AUTOMATION_API_KEY: process.env.AUTOMATION_API_KEY,
  });
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `HireLoop env validation failed. Missing or invalid required vars in .env.local:\n${issues}\n` +
        `Copy .env.example to .env.local and fill in the values, then restart the server.`,
    );
  }
  globalThis.__hireloopRequiredEnv = result.data;
  return result.data;
}

export const env = {
  databaseUrl: (): string => parseRequired().DATABASE_URL,
  supabaseUrl: (): string => parseRequired().NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: (): string => parseRequired().NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: (): string => parseRequired().SUPABASE_SERVICE_ROLE_KEY,
  groqApiKey: (): string => parseRequired().GROQ_API_KEY,
  googleApiKey: (): string => parseRequired().GOOGLE_GENERATIVE_AI_API_KEY,
  automationApiKey: (): string => parseRequired().AUTOMATION_API_KEY,

  automationServiceUrl: (): string => parseOptional().AUTOMATION_SERVICE_URL,
  appUrl: (): string | undefined => parseOptional().NEXT_PUBLIC_APP_URL,

  stripeSecretKey: (): string | undefined => parseOptional().STRIPE_SECRET_KEY,
  stripeWebhookSecret: (): string | undefined => parseOptional().STRIPE_WEBHOOK_SECRET,
  stripePublishableKey: (): string | undefined =>
    parseOptional().NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,

  langfuseSecretKey: (): string | undefined => parseOptional().LANGFUSE_SECRET_KEY,
  langfusePublicKey: (): string | undefined => parseOptional().LANGFUSE_PUBLIC_KEY,
  langfuseHost: (): string => parseOptional().LANGFUSE_HOST,

  sentryDsn: (): string | undefined => parseOptional().SENTRY_DSN,

  /**
   * Validate required env eagerly. Call from boot scripts or test entrypoints
   * to surface misconfiguration before any request lands.
   */
  validateRequired: (): void => {
    parseRequired();
    parseOptional();
  },
} as const;

export type Env = typeof env;
