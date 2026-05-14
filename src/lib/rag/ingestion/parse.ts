export type FileType = "pdf" | "md" | "txt";

export interface ParsedDocument {
  text: string;
  pageCount: number;
  fileType: FileType;
}

export interface ParseError {
  error: string;
}

export type ParseResult = ParsedDocument | ParseError;

async function parsePdf(
  buffer: Buffer | Uint8Array,
): Promise<{ text: string; pageCount: number }> {
  // Dynamic import keeps pdfjs-dist out of client bundles and lets Next.js
  // treat it as an external server package (see next.config.ts).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs-dist 5.x rejects Node Buffer (subclass of Uint8Array). Always copy
  // into a plain Uint8Array to satisfy the type check.
  const data = Uint8Array.from(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    disableFontFace: true,
    verbosity: 0,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pageCount; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
    page.cleanup();
  }

  await doc.destroy();

  return {
    text: pageTexts.join("\n\n").trim(),
    pageCount,
  };
}

export async function parseDocument(
  buffer: Buffer | Uint8Array,
  fileType: FileType,
): Promise<ParseResult> {
  try {
    if (fileType === "pdf") {
      const result = await parsePdf(buffer);
      return { ...result, fileType };
    }

    if (fileType === "md" || fileType === "txt") {
      const text = Buffer.isBuffer(buffer)
        ? buffer.toString("utf8")
        : Buffer.from(buffer).toString("utf8");
      return { text, pageCount: 1, fileType };
    }

    return { error: `Unsupported file type: ${String(fileType)}` };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to parse document",
    };
  }
}

export function isParseError(result: ParseResult): result is ParseError {
  return "error" in result;
}
