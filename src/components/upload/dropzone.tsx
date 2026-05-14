"use client";

import { useCallback, useId, useRef, useState } from "react";

type ChunkType = "cv" | "cover_letter" | "supporting";

type Stage = "uploading" | "parsing" | "embedding" | "done" | "error";

interface FileItem {
  id: string;
  name: string;
  size: number;
  stage: Stage;
  chunkCount?: number;
  errorMessage?: string;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".txt"] as const;
const ACCEPTED_MIME = [
  "application/pdf",
  "text/markdown",
  "text/plain",
] as const;
const MAX_BYTES = 10 * 1024 * 1024;

function isAccepted(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return ACCEPTED_MIME.some((mime) => file.type === mime);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const STAGE_LABELS: Record<Stage, string> = {
  uploading: "Uploading…",
  parsing: "Parsing…",
  embedding: "Embedding…",
  done: "Done",
  error: "Error",
};

function StageBadge({ stage }: { stage: Stage }): React.JSX.Element {
  const color =
    stage === "done"
      ? { bg: "#E0F9FA", fg: "#0097B2", border: "#B2EDEC" }
      : stage === "error"
        ? { bg: "#FFF5E0", fg: "#A05E00", border: "#FFDEA0" }
        : { bg: "#E0F9FA", fg: "#0C1A1C", border: "#B2EDEC" };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ background: color.bg, color: color.fg, borderColor: color.border }}
    >
      {stage === "done" ? "Done ✓" : STAGE_LABELS[stage]}
    </span>
  );
}

export function Dropzone(): React.JSX.Element {
  const [chunkType, setChunkType] = useState<ChunkType>("cv");
  const [items, setItems] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const updateItem = useCallback(
    (id: string, patch: Partial<FileItem>) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, id: string, type: ChunkType) => {
      if (!isAccepted(file)) {
        updateItem(id, { stage: "error", errorMessage: "Unsupported file type" });
        return;
      }
      if (file.size > MAX_BYTES) {
        updateItem(id, { stage: "error", errorMessage: "File exceeds 10MB" });
        return;
      }

      updateItem(id, { stage: "uploading" });

      const body = new FormData();
      body.append("file", file);
      body.append("chunkType", type);

      // Optimistic stage transitions while server runs the pipeline.
      const parsingTimer = window.setTimeout(() => {
        updateItem(id, { stage: "parsing" });
      }, 500);
      const embeddingTimer = window.setTimeout(() => {
        updateItem(id, { stage: "embedding" });
      }, 1500);

      try {
        const res = await fetch("/api/documents", { method: "POST", body });
        window.clearTimeout(parsingTimer);
        window.clearTimeout(embeddingTimer);

        if (!res.ok) {
          let message = `Upload failed (${res.status})`;
          try {
            const json = (await res.json()) as { error?: string };
            if (json.error) message = json.error;
          } catch {
            // ignore parse failure
          }
          updateItem(id, { stage: "error", errorMessage: message });
          return;
        }

        const json = (await res.json()) as { chunkCount?: number };
        updateItem(id, { stage: "done", chunkCount: json.chunkCount });
      } catch (err) {
        window.clearTimeout(parsingTimer);
        window.clearTimeout(embeddingTimer);
        updateItem(id, {
          stage: "error",
          errorMessage: err instanceof Error ? err.message : "Network error",
        });
      }
    },
    [updateItem],
  );

  const ingest = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const newItems: FileItem[] = arr.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        stage: "uploading",
      }));
      setItems((prev) => [...newItems, ...prev]);
      for (let i = 0; i < arr.length; i += 1) {
        const file = arr[i];
        const item = newItems[i];
        if (!file || !item) continue;
        void uploadFile(file, item.id, chunkType);
      }
    },
    [chunkType, uploadFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files.length > 0) {
        ingest(event.dataTransfer.files);
      }
    },
    [ingest],
  );

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        ingest(event.target.files);
        event.target.value = "";
      }
    },
    [ingest],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[#0C1A1C]">Document type</label>
        <select
          className="rounded-md border bg-white px-3 py-1.5 text-sm"
          style={{ borderColor: "#B2EDEC", color: "#0C1A1C" }}
          value={chunkType}
          onChange={(e) => setChunkType(e.target.value as ChunkType)}
        >
          <option value="cv">CV / Resume</option>
          <option value="cover_letter">Cover letter</option>
          <option value="supporting">Supporting (notes, portfolio)</option>
        </select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors"
        style={{
          borderColor: isDragging ? "#00B8D9" : "#B2EDEC",
          background: isDragging ? "#E0F9FA" : "#F5FFFE",
          color: "#0C1A1C",
        }}
      >
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg"
          style={{ background: "#00B8D9", color: "white" }}
        >
          <span className="text-lg font-extrabold">+</span>
        </div>
        <p className="text-sm font-medium">Drop files here, or click to browse</p>
        <p className="mt-1 text-xs" style={{ color: "#5A9EA8" }}>
          PDF, .md, .txt — up to 10MB each
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
          className="hidden"
          onChange={onFileInputChange}
        />
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border bg-white px-3 py-2"
              style={{ borderColor: "#D4F5F5" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "#0C1A1C" }}>
                  {item.name}
                </p>
                <p className="text-xs" style={{ color: "#8ABCC4" }}>
                  {formatBytes(item.size)}
                  {item.chunkCount !== undefined ? ` · ${item.chunkCount} chunks` : ""}
                </p>
                {item.stage === "error" && item.errorMessage ? (
                  <p className="mt-1 text-xs" style={{ color: "#A05E00" }}>
                    {item.errorMessage}
                  </p>
                ) : null}
              </div>
              <StageBadge stage={item.stage} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
