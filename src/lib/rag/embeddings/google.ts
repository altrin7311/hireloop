import { google } from "@ai-sdk/google";
import { embedMany } from "ai";

// gemini-embedding-001 is the current v1beta-supported model. Older
// text-embedding-004 lives on v1 and is not reachable through @ai-sdk/google v3.
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 64;

type Task = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function providerOptions(taskType: Task) {
  return {
    google: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  };
}

export async function embedTexts(
  texts: string[],
  taskType: Task = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = google.textEmbedding(EMBEDDING_MODEL);
  const out: number[][] = [];
  const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const { embeddings } = await embedMany({
      model,
      values: batch,
      providerOptions: providerOptions(taskType),
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[embeddings] batch ${batchNumber}/${totalBatches}: ${batch.length} texts → ${embeddings.length} vectors`,
      );
    }

    out.push(...embeddings);
  }

  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text], "RETRIEVAL_QUERY");
  if (!vector) throw new Error("Embedding query returned empty result");
  return vector;
}
