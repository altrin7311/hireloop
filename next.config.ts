import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist"],
  // Standalone tracer misses pdfjs-dist's worker (dynamically imported by
  // legacy/build/pdf.mjs). Include it explicitly for any route that parses PDFs.
  outputFileTracingIncludes: {
    "/api/documents/**": [
      "./node_modules/**/pdfjs-dist/legacy/build/**",
      "./node_modules/**/pdfjs-dist/package.json",
    ],
  },
};

export default nextConfig;
