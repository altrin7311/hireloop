// Must come before any transitive pdfjs-dist import.
import "@/lib/pdf-polyfill";

import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/db/supabase/server";
import { db, schema } from "@/lib/db";
import { parseDocument, isParseError, type FileType } from "@/lib/rag/ingestion/parse";
import { chunkDocument, type ChunkType } from "@/lib/rag/chunking/strategies";
import { embedTexts } from "@/lib/rag/embeddings/google";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const STORAGE_BUCKET = "documents";
const ALLOWED_CHUNK_TYPES = new Set<ChunkType>(["cv", "cover_letter", "supporting"]);

function detectFileType(fileName: string, mimeType: string): FileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (lower.endsWith(".md") || mimeType === "text/markdown") return "md";
  if (lower.endsWith(".txt") || mimeType === "text/plain") return "txt";
  return null;
}

function log(stage: string, info: Record<string, unknown> = {}): void {
  console.log(`[documents:${stage}]`, info);
}

function logError(stage: string, err: unknown, extra: Record<string, unknown> = {}): void {
  if (err instanceof Error) {
    console.error(`[documents:${stage}:ERROR]`, {
      ...extra,
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error(`[documents:${stage}:ERROR]`, { ...extra, err });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID().slice(0, 8);
  log("start", { requestId });

  // STEP 1 — Auth
  let userId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Missing session is an expected unauthenticated case, not a server error.
    if (error && error.name === "AuthSessionMissingError") {
      log("auth:no-session", { requestId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error) throw error;
    if (!user) {
      log("auth:no-user", { requestId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    log("auth:ok", { requestId, userId });
  } catch (err) {
    logError("auth", err, { requestId });
    return NextResponse.json(
      { error: `Auth failure: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  // STEP 2 — Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
    log("formdata:ok", { requestId });
  } catch (err) {
    logError("formdata", err, { requestId });
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  // STEP 3 — Validate inputs
  const file = formData.get("file");
  const rawChunkType = formData.get("chunkType");

  if (!(file instanceof File)) {
    log("validate:missing-file", { requestId });
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof rawChunkType !== "string" || !ALLOWED_CHUNK_TYPES.has(rawChunkType as ChunkType)) {
    log("validate:bad-chunktype", { requestId, rawChunkType });
    return NextResponse.json(
      { error: "Invalid chunkType (cv | cover_letter | supporting)" },
      { status: 400 },
    );
  }
  const chunkType = rawChunkType as ChunkType;

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const fileType = detectFileType(file.name, file.type);
  if (!fileType) {
    log("validate:bad-filetype", { requestId, name: file.name, mime: file.type });
    return NextResponse.json(
      { error: "Unsupported file type (PDF, .md, .txt only)" },
      { status: 400 },
    );
  }

  log("validate:ok", {
    requestId,
    name: file.name,
    mime: file.type,
    size: file.size,
    fileType,
    chunkType,
  });

  // STEP 4 — Buffer
  const fileId = randomUUID();
  const storagePath = `${userId}/${fileId}/${file.name}`;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
    log("buffer:ok", { requestId, bytes: buffer.length });
  } catch (err) {
    logError("buffer", err, { requestId });
    return NextResponse.json(
      { error: `Buffer read failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  // STEP 5 — Storage upload
  let supabaseRef: Awaited<ReturnType<typeof createClient>>;
  try {
    supabaseRef = await createClient();
  } catch (err) {
    logError("supabase-client", err, { requestId });
    return NextResponse.json(
      { error: `Supabase client init failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  try {
    const upload = await supabaseRef.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) {
      logError("storage:upload", upload.error, { requestId, storagePath, bucket: STORAGE_BUCKET });
      return NextResponse.json(
        { error: `Storage upload failed: ${upload.error.message}`, stage: "storage" },
        { status: 500 },
      );
    }
    log("storage:ok", { requestId, path: upload.data?.path });
  } catch (err) {
    logError("storage:exception", err, { requestId, storagePath });
    return NextResponse.json(
      {
        error: `Storage exception: ${err instanceof Error ? err.message : "unknown"}`,
        stage: "storage",
      },
      { status: 500 },
    );
  }

  // STEP 6 — Parse document
  let parsed;
  try {
    parsed = await parseDocument(buffer, fileType);
    if (isParseError(parsed)) {
      log("parse:error", { requestId, error: parsed.error });
      await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
      return NextResponse.json(
        { error: `Parse failed: ${parsed.error}`, stage: "parse" },
        { status: 422 },
      );
    }
    log("parse:ok", { requestId, pageCount: parsed.pageCount, textLen: parsed.text.length });
  } catch (err) {
    logError("parse:exception", err, { requestId });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      {
        error: `Parse exception: ${err instanceof Error ? err.message : "unknown"}`,
        stage: "parse",
      },
      { status: 500 },
    );
  }

  // STEP 7 — Chunk
  let chunks;
  try {
    chunks = chunkDocument(parsed.text, fileType, chunkType);
    log("chunk:ok", { requestId, count: chunks.length });
  } catch (err) {
    logError("chunk:exception", err, { requestId });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      {
        error: `Chunk exception: ${err instanceof Error ? err.message : "unknown"}`,
        stage: "chunk",
      },
      { status: 500 },
    );
  }

  if (chunks.length === 0) {
    log("chunk:empty", { requestId });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      { error: "Document produced no chunks", stage: "chunk" },
      { status: 422 },
    );
  }

  // STEP 8 — Embeddings
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    log("embed:no-api-key", { requestId });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not set on server", stage: "embed" },
      { status: 500 },
    );
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks.map((c) => c.content));
    log("embed:ok", {
      requestId,
      vectorCount: embeddings.length,
      firstDim: embeddings[0]?.length,
    });
  } catch (err) {
    logError("embed:exception", err, { requestId, chunkCount: chunks.length });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      {
        error: `Embedding failed: ${err instanceof Error ? err.message : "unknown"}`,
        stage: "embed",
      },
      { status: 502 },
    );
  }

  if (embeddings.length !== chunks.length) {
    log("embed:count-mismatch", {
      requestId,
      embeddings: embeddings.length,
      chunks: chunks.length,
    });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      { error: "Embedding/chunk count mismatch", stage: "embed" },
      { status: 500 },
    );
  }

  // STEP 9 — DB insert
  try {
    const rows = chunks.map((chunk, i) => {
      const embedding = embeddings[i];
      if (!embedding) throw new Error(`Missing embedding for chunk ${i}`);
      return {
        userId,
        sourceFile: file.name,
        fileId,
        chunkType,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        wordCount: chunk.wordCount,
        fileType,
        embedding,
      };
    });

    await db().insert(schema.documentChunks).values(rows);
    log("db:ok", { requestId, inserted: rows.length });
  } catch (err) {
    logError("db:exception", err, { requestId });
    await supabaseRef.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    return NextResponse.json(
      {
        error: `DB insert failed: ${err instanceof Error ? err.message : "unknown"}`,
        stage: "db",
      },
      { status: 500 },
    );
  }

  log("done", { requestId, fileId, chunkCount: chunks.length });
  return NextResponse.json({ success: true, fileId, chunkCount: chunks.length });
}
