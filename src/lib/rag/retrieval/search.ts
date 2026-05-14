import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedQuery } from "@/lib/rag/embeddings/google";

export interface RetrievedChunk {
  id: string;
  sourceFile: string;
  chunkType: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  fileType: string;
  similarity: number;
}

const TOP_K = 8;

export async function searchUserChunks(
  query: string,
  userId: string,
  topK: number = TOP_K,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db().execute(sql`
    SELECT
      id,
      source_file        AS "sourceFile",
      chunk_type         AS "chunkType",
      chunk_index        AS "chunkIndex",
      content,
      word_count         AS "wordCount",
      file_type          AS "fileType",
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM document_chunks
    WHERE user_id = ${userId}::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);

  return rows.map((row) => ({
    id: row.id as string,
    sourceFile: row.sourceFile as string,
    chunkType: row.chunkType as string,
    chunkIndex: Number(row.chunkIndex),
    content: row.content as string,
    wordCount: Number(row.wordCount),
    fileType: row.fileType as string,
    similarity: Number(row.similarity),
  }));
}
