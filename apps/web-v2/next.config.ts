import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Public Arabic vanity URLs (/كراج/… , /ماركة/…). Next matches a rewrite `source`
// against the DECODED pathname (path-to-regexp), so the source must use the decoded
// Arabic text — a percent-encoded source never matches a real request and 404s
// (a browser hitting /%D9%83.../ is decoded to /كراج/... before rewrite matching).
// decodeURIComponent keeps the RTL literal out of the source strings below.
const KARAJ = decodeURIComponent("%D9%83%D8%B1%D8%A7%D8%AC"); // كراج
const MARKA = decodeURIComponent("%D9%85%D8%A7%D8%B1%D9%83%D8%A9"); // ماركة

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
  // Dropped 'unsafe-eval' — Next 16 + our scripts don't need it; shrink XSS blast radius.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://sc-static.net https://*.snapchat.com https://va.vercel-scripts.com https://vercel.live",
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

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Guarantee the Cairo font files are bundled with the dynamic OG/Twitter image
  // functions. In a monorepo, Vercel's file tracer can miss assets read via
  // fs at runtime (join(process.cwd(), "assets/…")), which would make the image
  // 500 in production while working locally. Listing them here makes it explicit.
  outputFileTracingIncludes: {
    "/[locale]/workshop/[place_id]/opengraph-image": ["./assets/Cairo-*.ttf"],
    "/[locale]/workshop/[place_id]/twitter-image": ["./assets/Cairo-*.ttf"],
  },

  async headers() {
    return [
      {
        // كل الصفحات. Next.js/Vercel manage hashed /_next/static caching; setting
        // it manually triggers build warnings and can override framework behavior.
        source: "/(.*)",
        headers: securityHeaders,
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
    // beforeFiles: these run BEFORE the next-intl proxy so the pretty
    // Arabic URLs resolve to the ASCII routes first; next-intl then maps the
    // unprefixed path to the default (ar) locale.
    return {
      beforeFiles: [
        // Public Arabic URL → internal ASCII route (Turbopack doesn't register
        // non-ASCII route folders, so the folder is /garage but the URL stays /كراج).
        { source: `/${KARAJ}/:specialty/:area`, destination: "/garage/:specialty/:area" },
        // Specialty index (one level): /كراج/ميكانيكا → /garage/ميكانيكا
        { source: `/${KARAJ}/:specialty`, destination: "/garage/:specialty" },
        // Car-make pages: /ماركة/تويوتا → /make/تويوتا  and  /ماركة → /make
        { source: `/${MARKA}/:brand`, destination: "/make/:brand" },
        { source: `/${MARKA}`, destination: "/make" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    return [
      // The flagship "اسأل دق سلف" page moved from /asaali (read as the feminine
      // "اسألي") to /isal-degself. 308 permanent so old links + indexing carry over.
      { source: "/asaali", destination: "/isal-degself", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
