/**
 * Polyfill DOM globals required by pdfjs-dist when running on Node.
 *
 * pdfjs-dist 5.x references DOMMatrix, ImageData and Path2D from the global
 * scope at import time — even on its text-only "legacy" Node path. Node 20
 * (and the alpine image we ship in Docker) lacks those globals, so importing
 * pdfjs-dist anywhere on the server crashes with `ReferenceError: DOMMatrix
 * is not defined` before our code ever runs.
 *
 * Import this module BEFORE any `import("pdfjs-dist/...")` (static or
 * dynamic). It is idempotent — if a global already exists it leaves it alone,
 * so it's safe to import from multiple places.
 *
 * Keep the stubs typed without `any` to satisfy CLAUDE.md.
 */

type StubCtor = new (...args: unknown[]) => object;

const g = globalThis as Record<string, unknown>;

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = class {} as StubCtor;
}
if (typeof g.ImageData === "undefined") {
  g.ImageData = class {} as StubCtor;
}
if (typeof g.Path2D === "undefined") {
  g.Path2D = class {} as StubCtor;
}

export {};
