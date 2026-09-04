import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static output: no server, no cold start. The dashboard is read-only,
  // and every number is precomputed at build time by data/build/export_web.py.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
