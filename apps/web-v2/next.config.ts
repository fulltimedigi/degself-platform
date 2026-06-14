import type { NextConfig } from "next";

// "كراج" / "ماركة" percent-encoded — Next matches the rewrite source against the
// raw (encoded) request path, so the source must be encoded too.
const KARAJ = "%D9%83%D8%B1%D8%A7%D8%AC";
const MARKA = "%D9%85%D8%A7%D8%B1%D9%83%D8%A9";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Public Arabic URL → internal ASCII route (Turbopack doesn't register
      // non-ASCII route folders, so the folder is /garage but the URL stays /كراج).
      { source: `/${KARAJ}/:specialty/:area`, destination: "/garage/:specialty/:area" },
      // Specialty index (one level): /كراج/ميكانيكا → /garage/ميكانيكا
      { source: `/${KARAJ}/:specialty`, destination: "/garage/:specialty" },
      // Car-make pages: /ماركة/تويوتا → /make/تويوتا  and  /ماركة → /make
      { source: `/${MARKA}/:brand`, destination: "/make/:brand" },
      { source: `/${MARKA}`, destination: "/make" },
    ];
  },
};

export default nextConfig;
