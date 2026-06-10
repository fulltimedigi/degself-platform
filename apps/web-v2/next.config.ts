import type { NextConfig } from "next";

// "كراج" percent-encoded — Next matches the rewrite source against the raw
// (encoded) request path, so the source must be encoded too.
const KARAJ = "%D9%83%D8%B1%D8%A7%D8%AC";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Public Arabic URL → internal ASCII route (Turbopack doesn't register
      // non-ASCII route folders, so the folder is /garage but the URL stays /كراج).
      { source: `/${KARAJ}/:specialty/:area`, destination: "/garage/:specialty/:area" },
    ];
  },
};

export default nextConfig;
