import type { NextConfig } from "next";

// "كراج" / "ماركة" percent-encoded — Next matches the rewrite source against the
// raw (encoded) request path, so the source must be encoded too.
const KARAJ = "%D9%83%D8%B1%D8%A7%D8%AC";
const MARKA = "%D9%85%D8%A7%D8%B1%D9%83%D8%A9";

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers — متوافقة مع معايير 2026 (securityheaders.com Grade A)
// المراجع:
//   - https://owasp.org/www-project-secure-headers/
//   - https://web.dev/articles/security-headers
//   - CITRA Kuwait Data Protection Resolution 26/2024
// ─────────────────────────────────────────────────────────────────────────────
//
// CSP: نسمح فقط بالمصادر اللي بنستخدمها فعلاً (GA, Clarity, Snap Pixel, Google
// Maps, Vercel Analytics, Supabase). 'unsafe-inline' لازم للـ Next.js inline
// scripts و JSON-LD. لو احتجنا nonces نعمل تحديث لاحق.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://sc-static.net https://*.snapchat.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://www.google-analytics.com https://*.clarity.ms https://*.googleusercontent.com",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://sc-static.net https://tr.snapchat.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.anthropic.com",
  "frame-src 'self' https://www.google.com https://*.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    // 2 سنوات + كل الـ subdomains + جاهز للـ HSTS preload list
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // يمنع المتصفح من تفعيل ميزات حساسة من sub-frames/origins غير معروفة
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=(self)",
      "geolocation=(self)",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Content-Security-Policy",
    value: csp,
  },
];

const nextConfig: NextConfig = {
  // ميزانية أداء: نسمح بصور أكبر فقط للـ OG/hero
  poweredByHeader: false,

  // Guarantee the Cairo font files are bundled with the dynamic OG/Twitter image
  // functions. In a monorepo, Vercel's file tracer can miss assets read via
  // fs at runtime (join(process.cwd(), "assets/…")), which would make the image
  // 500 in production while working locally. Listing them here makes it explicit.
  outputFileTracingIncludes: {
    "/workshop/[place_id]/opengraph-image": ["./assets/Cairo-*.ttf"],
    "/workshop/[place_id]/twitter-image": ["./assets/Cairo-*.ttf"],
  },

  async headers() {
    return [
      {
        // كل الصفحات
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // الـ assets الثابتة: cache طويل + immutable
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // /.well-known/security.txt
        source: "/.well-known/security.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },

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
