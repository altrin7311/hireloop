import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { DocumentChunk } from "@/lib/db/schema";
import { embedQuery } from "@/lib/rag/embeddings/google";

import type { JobAnalysis } from "@/lib/ai/agents/types";

const TOP_K = 8;

type ChunkRow = {
  id: string;
  user_id: string;
  source_file: string;
  file_id: string;
  chunk_type: string;
  chunk_index: number;
  content: string;
  word_count: number;
  pinecone_id: string | null;
  file_type: string;
  embedding: string | null;
  uploaded_at: string;
  similarity: number | string;
};

function mapRow(row: ChunkRow): DocumentChunk {
  return {
    id: row.id,
    userId: row.user_id,
    sourceFile: row.source_file,
    fileId: row.file_id,
    chunkType: row.chunk_type,
    chunkIndex: row.chunk_index,
    content: row.content,
    wordCount: row.word_count,
    pineconeId: row.pinecone_id,
    fileType: row.file_type,
    embedding: null,
    uploadedAt: new Date(row.uploaded_at),
  };
}

export async function runRelevancy(
  userId: string,
  jobAnalysis: JobAnalysis,
): Promise<DocumentChunk[]> {
  const query = jobAnalysis.mustHaveSkills.join(", ").trim();
  if (!query) {
    console.log("[relevancy] no must-have skills, returning 0 chunks");
    return [];
  }

  const vector = await embedQuery(query);
  const vecLit = `[${vector.join(",")}]`;

  const rows = (await db().execute(sql`
    SELECT
      id,
      user_id,
      source_file,
      file_id,
      chunk_type,
      chunk_index,
      content,
      word_count,
      pinecone_id,
      file_type,
      uploaded_at,
      1 - (embedding <=> ${vecLit}::vector) AS similarity
    FROM document_chunks
    WHERE user_id = ${userId}::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLit}::vector
    LIMIT ${TOP_K}
  `)) as unknown as ChunkRow[];

  const chunks = rows.map(mapRow);
  const topSim = rows[0] ? Number(rows[0].similarity) : 0;
  console.log(
    `[relevancy] retrieved ${chunks.length} chunks, top similarity: ${topSim.toFixed(3)}`,
  );
  return chunks;
}
