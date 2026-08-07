import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// NOTE: the public Arabic vanity URLs (/كراج/… → /garage/…, /ماركة/… → /make/…)
// are rewritten in src/proxy.ts, NOT here. A next.config `rewrites` source with
// non-ASCII text does not work on Vercel (its edge matches the source against the
// ENCODED request path, so the source never matches and 404s), and CI's
// `next start` matches the decoded path so it can't catch the divergence. The
// proxy runs the same on both and matches reliably. See src/proxy.ts.

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers — متوافقة مع معايير 2026 (securityheaders.com Grade A)
// المراجع:
//   - https://owasp.org/www-project-secure-headers/
//   - https://web.dev/articles/security-headers
//   - CITRA Kuwait Data Protection Resolution 26/2024
// ─────────────────────────────────────────────────────────────────────────────
//
// CSP: نسمح فقط بالمصادر اللي بنستخدمها فعلاً (GA, Clarity, Snap Pixel, Google
// Maps, Vercel Analytics, PostHog EU capture, Supabase). 'unsafe-inline' لازم للـ
// Next.js inline scripts و JSON-LD. لو احتجنا nonces نعمل تحديث لاحق.
const csp = [
  "default-src 'self'",
  // Dropped 'unsafe-eval' — Next 16 + our scripts don't need it; shrink XSS blast radius.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://sc-static.net https://*.snapchat.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://www.google-analytics.com https://*.clarity.ms https://*.googleusercontent.com",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://sc-static.net https://tr.snapchat.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://eu.i.posthog.com https://api.anthropic.com",
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

  async redirects() {
    return [
      // The flagship "اسأل دق سلف" page moved from /asaali (read as the feminine
      // "اسألي") to /isal-degself. 308 permanent so old links + indexing carry over.
      { source: "/asaali", destination: "/isal-degself", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);