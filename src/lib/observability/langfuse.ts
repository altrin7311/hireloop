import { Langfuse, type LangfuseTraceClient } from "langfuse";

/**
 * Lazy Langfuse singleton. If LANGFUSE_* env vars are missing we never
 * instantiate the client — traces become no-ops so dev / CI without keys
 * work unchanged.
 */

declare global {
  var __hireloopLangfuse: Langfuse | null | undefined;
}

function build(): Langfuse | null {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";

  if (!secretKey || !publicKey) {
    return null;
  }

  return new Langfuse({
    secretKey,
    publicKey,
    baseUrl,
    flushAt: 1,
    flushInterval: 1000,
    requestTimeout: 8000,
  });
}

export function langfuse(): Langfuse | null {
  if (globalThis.__hireloopLangfuse !== undefined) {
    return globalThis.__hireloopLangfuse;
  }
  try {
    globalThis.__hireloopLangfuse = build();
  } catch (err) {
    console.warn("[langfuse:init:WARN]", err);
    globalThis.__hireloopLangfuse = null;
  }
  return globalThis.__hireloopLangfuse;
}

export type AgentName =
  | "job-analyst"
  | "relevancy"
  | "cv-writer"
  | "cover-letter"
  | "qa-checker";

export interface PipelineTraceMeta {
  userId: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
}

export interface AgentSpanInput {
  trace: LangfuseTraceClient | null;
  agent: AgentName;
  model?: string;
  input: unknown;
}

export interface AgentSpanFinish {
  output: unknown;
  usage?: { input?: number; output?: number; total?: number };
  level?: "DEFAULT" | "ERROR" | "WARNING";
  statusMessage?: string;
}

export interface AgentSpan {
  finish: (finish: AgentSpanFinish) => void;
  fail: (err: unknown) => void;
}

const NOOP_SPAN: AgentSpan = {
  finish: () => undefined,
  fail: () => undefined,
};

export function createPipelineTrace(meta: PipelineTraceMeta): LangfuseTraceClient | null {
  const client = langfuse();
  if (!client) return null;
  try {
    return client.trace({
      name: "hireloop.pipeline",
      userId: meta.userId,
      metadata: {
        jobId: meta.jobId ?? null,
        jobTitle: meta.jobTitle ?? null,
        company: meta.company ?? null,
      },
    });
  } catch (err) {
    console.warn("[langfuse:trace:WARN]", err);
    return null;
  }
}

export function startAgentSpan({ trace, agent, model, input }: AgentSpanInput): AgentSpan {
  if (!trace) return NOOP_SPAN;
  let generation: ReturnType<LangfuseTraceClient["generation"]> | null = null;
  try {
    generation = trace.generation({
      name: agent,
      model: model ?? "unknown",
      input,
      startTime: new Date(),
      metadata: { agent },
    });
  } catch (err) {
    console.warn("[langfuse:span:WARN]", err);
    return NOOP_SPAN;
  }

  return {
    finish: ({ output, usage, level, statusMessage }) => {
      try {
        generation?.end({
          output,
          endTime: new Date(),
          usage,
          level,
          statusMessage,
        });
      } catch (err) {
        console.warn("[langfuse:finish:WARN]", err);
      }
    },
    fail: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      try {
        generation?.end({
          output: { error: message },
          endTime: new Date(),
          level: "ERROR",
          statusMessage: message,
        });
      } catch (innerErr) {
        console.warn("[langfuse:fail:WARN]", innerErr);
      }
    },
  };
}

export async function flushLangfuse(): Promise<void> {
  const client = langfuse();
  if (!client) return;
  try {
    await client.flushAsync();
  } catch (err) {
    console.warn("[langfuse:flush:WARN]", err);
  }
}
