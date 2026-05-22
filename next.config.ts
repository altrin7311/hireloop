import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
