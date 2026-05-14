-- Enable pgvector extension for similarity search.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

-- Replace Pinecone-backed RAG with native pgvector storage on document_chunks.
ALTER TABLE "document_chunks" ALTER COLUMN "pinecone_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_chunks" DROP CONSTRAINT IF EXISTS "document_chunks_pinecone_id_unique";
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "file_id" uuid;
--> statement-breakpoint
UPDATE "document_chunks" SET "file_id" = gen_random_uuid() WHERE "file_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "file_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "embedding" vector(768);
--> statement-breakpoint

-- HNSW cosine index for fast similarity search.
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx"
  ON "document_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "document_chunks_user_id_idx"
  ON "document_chunks" ("user_id");
