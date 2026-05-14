/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

loadEnv({ path: ".env.local" });

import { parseDocument, isParseError } from "../src/lib/rag/ingestion/parse";
import { chunkDocument } from "../src/lib/rag/chunking/strategies";
import { embedTexts } from "../src/lib/rag/embeddings/google";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "documents";

function buildMinimalPdf(): Buffer {
  // Hand-rolled minimal PDF 1.4 containing the text "Hello HireLoop".
  // Built so pdfjs-dist can extract a few words for the parse stage.
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    "4 0 obj << /Length 70 >>\nstream\nBT\n/F1 24 Tf\n72 720 Td\n(Hello HireLoop. Experience and Skills.) Tj\nET\nendstream\nendobj\n",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}

async function main(): Promise<void> {
  const tmpPath = join(process.cwd(), "scripts/.sample.pdf");
  if (!existsSync(tmpPath)) {
    writeFileSync(tmpPath, buildMinimalPdf());
    console.log("[setup] wrote sample PDF:", tmpPath);
  }
  const buffer = readFileSync(tmpPath);
  console.log("[setup] sample PDF bytes:", buffer.length);

  // STAGE 1 — parse
  console.log("\n=== STAGE 1: parseDocument ===");
  const parsed = await parseDocument(buffer, "pdf");
  if (isParseError(parsed)) {
    console.error("PARSE FAILED:", parsed.error);
    process.exit(1);
  }
  console.log("parse OK. pageCount:", parsed.pageCount, "textLen:", parsed.text.length);
  console.log("text preview:", JSON.stringify(parsed.text.slice(0, 200)));

  // STAGE 2 — chunk
  console.log("\n=== STAGE 2: chunkDocument ===");
  const chunks = chunkDocument(parsed.text, "pdf", "cv");
  console.log("chunks:", chunks.length);
  if (chunks.length === 0) {
    console.error("CHUNK FAILED: zero chunks");
    process.exit(1);
  }
  console.log("first chunk preview:", JSON.stringify(chunks[0]?.content.slice(0, 100)));

  // STAGE 3 — embed
  console.log("\n=== STAGE 3: embedTexts ===");
  console.log("API key present:", Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY));
  try {
    const embeddings = await embedTexts(chunks.map((c) => c.content));
    console.log("embed OK. vectors:", embeddings.length, "dim:", embeddings[0]?.length);
  } catch (err) {
    console.error("EMBED FAILED:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  }

  // STAGE 4 — storage upload (service role)
  console.log("\n=== STAGE 4: Supabase Storage upload ===");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }
  const admin = createClient(url, serviceKey);
  const testPath = `__pipeline_test__/${Date.now()}/sample.pdf`;
  const up = await admin.storage.from(STORAGE_BUCKET).upload(testPath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) {
    console.error("STORAGE FAILED:", up.error.message);
    console.error(JSON.stringify(up.error, null, 2));
    process.exit(1);
  }
  console.log("storage OK. path:", up.data?.path);

  // Cleanup
  await admin.storage.from(STORAGE_BUCKET).remove([testPath]);
  console.log("storage cleanup OK");

  // STAGE 5 — DB connectivity (just a SELECT — no insert)
  console.log("\n=== STAGE 5: DB connectivity ===");
  const { db } = await import("../src/lib/db");
  try {
    const result = await db().execute("select 1 as ok");
    console.log("db OK. result:", result);
  } catch (err) {
    console.error("DB FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("\n✅ ALL STAGES PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("UNCAUGHT:", err);
  process.exit(1);
});
