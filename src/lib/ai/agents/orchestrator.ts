import type { DocumentChunk, UserPreferences } from "@/lib/db/schema";

import { runCoverLetter } from "@/lib/ai/agents/cover-letter";
import { runCVWriter } from "@/lib/ai/agents/cv-writer";
import { runJobAnalyst } from "@/lib/ai/agents/job-analyst";
import { runQAChecker } from "@/lib/ai/agents/qa-checker";
import { runRelevancy } from "@/lib/ai/agents/relevancy";
import type {
  AgentName,
  PipelineEvent,
  QAReport,
  TailoredCV,
} from "@/lib/ai/agents/types";
import {
  createPipelineTrace,
  flushLangfuse,
} from "@/lib/observability/langfuse";

export interface PipelineInput {
  userId: string;
  jobDescription: string;
  userPreferences: UserPreferences;
  jobId?: string;
  jobTitle?: string;
  company?: string;
}

export interface PipelineResult {
  tailoredCV: TailoredCV;
  coverLetter: string;
  qaReport: QAReport;
  relevantChunks: DocumentChunk[];
}

class AsyncQueue<T> {
  private buffer: T[] = [];
  private waiters: ((v: IteratorResult<T>) => void)[] = [];
  private closed = false;

  push(v: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: v, done: false });
    else this.buffer.push(v);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiters.length > 0) {
      const w = this.waiters.shift();
      w?.({ value: undefined as never, done: true });
    }
  }

  async *drain(): AsyncGenerator<T> {
    while (true) {
      const v = this.buffer.shift();
      if (v !== undefined) {
        yield v;
        continue;
      }
      if (this.closed) return;
      const next = await new Promise<IteratorResult<T>>((resolve) => {
        this.waiters.push(resolve);
      });
      if (next.done) return;
      yield next.value;
    }
  }
}

async function timed<T>(
  agent: AgentName,
  run: () => Promise<T>,
  emit: (e: PipelineEvent) => void,
): Promise<T> {
  emit({ type: "agent:start", agent });
  const t0 = Date.now();
  try {
    const result = await run();
    emit({ type: "agent:complete", agent, durationMs: Date.now() - t0 });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    emit({ type: "agent:error", agent, message });
    throw err;
  }
}

export async function* runPipeline(
  input: PipelineInput,
): AsyncGenerator<PipelineEvent, PipelineResult | null, void> {
  const trace = createPipelineTrace({
    userId: input.userId,
    jobId: input.jobId,
    jobTitle: input.jobTitle,
    company: input.company,
  });

  const eventBuffer: PipelineEvent[] = [];
  const emit = (e: PipelineEvent): void => {
    eventBuffer.push(e);
  };
  const flush = function* (): Generator<PipelineEvent> {
    while (eventBuffer.length > 0) {
      const e = eventBuffer.shift();
      if (e) yield e;
    }
  };

  try {
    // STEP 1 — Job Analyst
    const jobAnalysis = await timed(
      "job-analyst",
      () => runJobAnalyst(input.jobDescription, trace),
      emit,
    );
    yield* flush();

    // STEP 2 — Relevancy
    const relevantChunks = await timed(
      "relevancy",
      () => runRelevancy(input.userId, jobAnalysis, trace),
      emit,
    );
    yield* flush();

    if (relevantChunks.length === 0) {
      yield {
        type: "pipeline:error",
        message:
          "No relevant document chunks found. Upload your CV and supporting docs in Profile first.",
      };
      await flushLangfuse();
      return null;
    }

    // STEP 3 — CV Writer + Cover Letter in parallel.
    emit({ type: "agent:start", agent: "cv-writer" });
    emit({ type: "agent:start", agent: "cover-letter" });
    yield* flush();

    const queue = new AsyncQueue<PipelineEvent>();
    const cvT0 = Date.now();
    const clT0 = Date.now();

    const cvPromise = runCVWriter(jobAnalysis, relevantChunks, input.userPreferences, trace)
      .then((cv) => {
        queue.push({
          type: "agent:complete",
          agent: "cv-writer",
          durationMs: Date.now() - cvT0,
        });
        queue.push({ type: "content:delta", field: "cv", cv });
        return cv;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "cv-writer failed";
        queue.push({ type: "agent:error", agent: "cv-writer", message });
        throw err;
      });

    const clPromise = runCoverLetter(
      jobAnalysis,
      relevantChunks,
      input.userPreferences,
      {
        trace,
        onDelta: (delta) => {
          queue.push({ type: "content:delta", field: "coverLetter", text: delta });
        },
      },
    )
      .then((text) => {
        queue.push({
          type: "agent:complete",
          agent: "cover-letter",
          durationMs: Date.now() - clT0,
        });
        return text;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "cover-letter failed";
        queue.push({ type: "agent:error", agent: "cover-letter", message });
        throw err;
      });

    const writerSettled = Promise.allSettled([cvPromise, clPromise]).then((res) => {
      queue.close();
      return res;
    });

    for await (const ev of queue.drain()) {
      yield ev;
    }

    const [cvSettled, clSettled] = await writerSettled;
    if (cvSettled.status === "rejected" || clSettled.status === "rejected") {
      const reason =
        cvSettled.status === "rejected" ? cvSettled.reason : clSettled.status === "rejected" ? clSettled.reason : null;
      const message = reason instanceof Error ? reason.message : "writer agent failed";
      yield { type: "pipeline:error", message };
      await flushLangfuse();
      return null;
    }

    const tailoredCV = cvSettled.value;
    const coverLetter = clSettled.value;

    // STEP 4 — QA
    const qaReport = await timed(
      "qa-checker",
      () => runQAChecker(tailoredCV, coverLetter, relevantChunks, jobAnalysis, trace),
      emit,
    );
    yield* flush();

    await flushLangfuse();
    return { tailoredCV, coverLetter, qaReport, relevantChunks };
  } catch (err) {
    yield* flush();
    const message = err instanceof Error ? err.message : "pipeline failed";
    yield { type: "pipeline:error", message };
    await flushLangfuse();
    return null;
  }
}
