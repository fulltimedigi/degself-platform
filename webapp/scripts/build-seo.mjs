#!/usr/bin/env node
/**
 * Post-build SEO generator for degself.com
 * Runs after `vite build` to add SEO assets to dist/public:
 *   - sitemap.xml (with all workshop URLs)
 *   - robots.txt
 *   - Prerendered HTML for each workshop (/workshop/:place_id) with unique
 *     <title>, <meta description>, OpenGraph, and JSON-LD LocalBusiness
 *   - Prerendered HTML for each governorate page (/governorate/:slug)
 *   - Prerendered HTML for hub pages (/, /search, /map, /emergency, /about)
 *
 * Each prerendered page contains:
 *   - SEO-friendly meta + structured data in <head>
 *   - Crawler-visible H1/H2 content + canonical URL
 *   - The original React app bundle (via <script>) — for human visitors,
 *     React mounts and takes over, navigating to the hash-equivalent route.
 *
 * This way: Google sees rich static HTML; users see the live SPA.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist", "public");
const DATA = path.join(DIST, "data", "workshops.json");
const INDEX_HTML = path.join(DIST, "index.html");

const SITE = "https://degself.com";
const TODAY = new Date().toISOString().slice(0, 10);

// ----- read inputs -----
if (!fs.existsSync(INDEX_HTML)) {
  console.error("[seo] dist/public/index.html not found — run `vite build` first.");
  process.exit(1);
}
let indexHtml = fs.readFileSync(INDEX_HTML, "utf8");

// Strip the default <title>, <meta name=description>, and <meta property=og:*>
// from the shell so prerendered pages can inject their own without duplicates.
// The home page will get fresh tags too via hubHtml().
indexHtml = indexHtml
  .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
  .replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, "")
  .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
  .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
  .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "");
const workshops = JSON.parse(fs.readFileSync(DATA, "utf8"));

// only active (non-closed) workshops with place_id
const active = workshops.filter(
  (w) => w && w.place_id && !w.permanently_closed
);

console.log(`[seo] active workshops: ${active.length} / total ${workshops.length}`);

// ----- utilities -----
const ESC = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeSlug = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u0652]/g, "") // strip Arabic diacritics
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

// build a unique URL path per workshop. Hash form is /#/workshop/:place_id
// Browser form (for SEO) is /workshop/:place_id (Netlify SPA fallback returns index.html)
const workshopPath = (w) => `/workshop/${encodeURIComponent(w.place_id)}`;

// ----- SEO copy -----
const GOVERNORATES = [
  { ar: "العاصمة", slug: "capital" },
  { ar: "حولي", slug: "hawalli" },
  { ar: "الفروانية", slug: "farwaniya" },
  { ar: "مبارك الكبير", slug: "mubarak-al-kabeer" },
  { ar: "الأحمدي", slug: "ahmadi" },
  { ar: "الجهراء", slug: "jahra" },
];

// ----- workshop page generator -----
function workshopHtml(w) {
  const name = w.name || "كراج صيانة سيارات";
  const area = w.area || "";
  const gov = w.governorate || "";
  const spec = w.specialty || "كراج";
  const phone = w.phone_intl || w.phone || "";
  const addr = [w.street, area, gov].filter(Boolean).join("، ") || "الكويت";
  const rating = w.rating ? Number(w.rating) : null;
  const reviewCount = w.reviews_count ? Number(w.reviews_count) : null;
  const lat = w.latitude;
  const lng = w.longitude;
  const placeId = w.place_id;
  const url = `${SITE}${workshopPath(w)}`;
  const hashUrl = `${SITE}/#${workshopPath(w)}`;

  const title = `${name} — ${spec} في ${area || gov || "الكويت"} | degself`;
  const description = `${name} ${spec} يقع في ${addr}.${
    phone ? ` للتواصل: ${phone}.` : ""
  } اعثر على كراجات ومراكز صيانة السيارات في الكويت على منصة degself دق سلف.`;

  // JSON-LD LocalBusiness / AutoRepair
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": url,
    name,
    description: `${spec} في ${addr}`,
    url,
    ...(phone ? { telephone: phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: w.street || "",
      addressLocality: area || gov || "Kuwait",
      addressRegion: gov || "Kuwait",
      addressCountry: "KW",
    },
    ...(lat && lng
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: lat,
            longitude: lng,
          },
        }
      : {}),
    ...(rating && reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount,
          },
        }
      : {}),
    areaServed: {
      "@type": "Country",
      name: "Kuwait",
    },
  };

  // Breadcrumbs
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "البحث عن كراج",
        item: `${SITE}/search`,
      },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };

  // Inject SEO-specific tags into the original index.html
  const seoHead = `
    <title>${ESC(title)}</title>
    <meta name="description" content="${ESC(description)}" />
    <link rel="canonical" href="${ESC(url)}" />
    <meta property="og:type" content="business.business" />
    <meta property="og:title" content="${ESC(name)}" />
    <meta property="og:description" content="${ESC(description)}" />
    <meta property="og:url" content="${ESC(url)}" />
    <meta property="og:locale" content="ar_KW" />
    <meta property="og:site_name" content="degself دق سلف" />
    <meta property="og:image" content="${SITE}/icons/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ESC(name)}" />
    <meta name="twitter:description" content="${ESC(description)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
    <script>
      // Forward human visitors to the SPA hash route so React handles the UI.
      // Crawlers (Googlebot, Bingbot, FB, Twitter, WhatsApp) skip JS or wait —
      // either way they read the static <head> above first.
      (function () {
        var p = window.location.pathname;
        if (p !== "/" && p.indexOf("/workshop/") === 0) {
          // Replace path with hash equivalent so SPA boots into the right page.
          window.history.replaceState(null, "", "/#" + p + window.location.search);
        }
      })();
    </script>`;

  // SEO body content (visible to crawlers when JS is disabled / before React mounts)
  const seoBody = `
    <noscript>
      <div style="padding:24px;font-family:system-ui,sans-serif;direction:rtl;max-width:720px;margin:0 auto">
        <h1>${ESC(name)}</h1>
        <p>${ESC(spec)}${area ? ` في ${ESC(area)}` : ""}${gov ? `، ${ESC(gov)}` : ""}</p>
        ${phone ? `<p><strong>الهاتف:</strong> <a href="tel:${ESC(phone)}">${ESC(phone)}</a></p>` : ""}
        <p><strong>العنوان:</strong> ${ESC(addr)}</p>
        ${rating ? `<p><strong>التقييم:</strong> ${rating} / 5 ${reviewCount ? `(${reviewCount} مراجعة)` : ""}</p>` : ""}
        ${lat && lng ? `<p><a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${ESC(placeId)}">عرض على خرائط جوجل</a></p>` : ""}
        <p><a href="${ESC(hashUrl)}">عرض في تطبيق degself</a></p>
      </div>
    </noscript>`;

  return indexHtml
    .replace("</head>", `${seoHead}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>${seoBody}`);
}

// ----- hub-page generator (home, search, map, emergency, about, governorate hubs) -----
function hubHtml({ pathName, title, description, h1, intro, jsonLd }) {
  const url = `${SITE}${pathName}`;
  const hashUrl = `${SITE}/#${pathName === "/" ? "/" : pathName}`;
  const seoHead = `
    <title>${ESC(title)}</title>
    <meta name="description" content="${ESC(description)}" />
    <link rel="canonical" href="${ESC(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${ESC(title)}" />
    <meta property="og:description" content="${ESC(description)}" />
    <meta property="og:url" content="${ESC(url)}" />
    <meta property="og:locale" content="ar_KW" />
    <meta property="og:site_name" content="degself دق سلف" />
    <meta property="og:image" content="${SITE}/icons/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
    <script>
      (function () {
        var p = window.location.pathname;
        if (p !== "/" && p !== "/index.html") {
          window.history.replaceState(null, "", "/#" + p + window.location.search);
        }
      })();
    </script>`;

  const seoBody = `
    <noscript>
      <div style="padding:24px;font-family:system-ui,sans-serif;direction:rtl;max-width:720px;margin:0 auto">
        <h1>${ESC(h1)}</h1>
        ${intro ? `<p>${ESC(intro)}</p>` : ""}
        <p><a href="${ESC(hashUrl)}">افتح تطبيق degself</a></p>
      </div>
    </noscript>`;

  return indexHtml
    .replace("</head>", `${seoHead}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>${seoBody}`);
}

// ----- write workshop pages as <id>.html (preserves case-sensitive place_ids) -----
const workshopDir = path.join(DIST, "workshop");
fs.mkdirSync(workshopDir, { recursive: true });
let written = 0;
for (const w of active) {
  fs.writeFileSync(
    path.join(workshopDir, `${w.place_id}.html`),
    workshopHtml(w),
    "utf8"
  );
  written++;
}
console.log(`[seo] wrote ${written} workshop pages`);

// ----- write hub pages -----
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "degself دق سلف",
  alternateName: "degself",
  url: SITE,
  logo: `${SITE}/icons/icon-512.png`,
  description: "منصة كويتية تجمع كراجات ومراكز صيانة السيارات",
  areaServed: { "@type": "Country", name: "Kuwait" },
};
const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "degself دق سلف",
  url: SITE,
  inLanguage: "ar-KW",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE}/search?q={query}`,
    "query-input": "required name=query",
  },
};

const hubPages = [
  {
    pathName: "/",
    title: "degself — دق سلف | منصة كراجات ومراكز صيانة السيارات في الكويت",
    description:
      "ابحث عن أفضل كراجات وورش صيانة السيارات في الكويت — جميع المحافظات، تخصصات متعددة، أرقام تواصل مباشرة، وخدمة سطحة وكراج متنقل للطوارئ. لا تحاتي، بنصلحها.",
    h1: "degself دق سلف — منصة كراجات الكويت",
    intro:
      "دليل شامل لأكثر من 1800 كراج ومركز صيانة سيارات في جميع محافظات الكويت. ابحث، اتصل، احجز.",
    jsonLd: [orgJsonLd, siteJsonLd],
  },
  {
    pathName: "/search",
    title: "بحث | كراجات ومراكز صيانة السيارات في الكويت | degself",
    description:
      "ابحث في أكثر من 1800 كراج ومركز صيانة سيارات بالكويت حسب المحافظة، التخصص، أو الاسم. نتائج فورية مع أرقام تواصل وعناوين.",
    h1: "بحث الكراجات",
    intro: "ابحث حسب المحافظة أو نوع التخصص أو اسم الكراج.",
    jsonLd: orgJsonLd,
  },
  {
    pathName: "/map",
    title: "خريطة كراجات السيارات في الكويت | degself",
    description:
      "خريطة تفاعلية لجميع كراجات ومراكز صيانة السيارات في الكويت. ابحث عن أقرب كراج لموقعك حسب المحافظة والتخصص.",
    h1: "خريطة الكراجات",
    intro: "اعرض جميع الكراجات على الخريطة.",
    jsonLd: orgJsonLd,
  },
  {
    pathName: "/emergency",
    title: "طوارئ سيارات الكويت — سطحة وكراج متنقل | degself",
    description:
      "خدمات طوارئ السيارات في الكويت: سطحة لنقل السيارات وكراج متنقل لتصليح الأعطال في موقعك. أرقام تواصل مباشرة في جميع المحافظات.",
    h1: "خدمات الطوارئ — سطحة وكراج متنقل",
    intro: "للطوارئ في الكويت: سطحة لنقل السيارة أو كراج متنقل يأتي إليك.",
    jsonLd: orgJsonLd,
  },
  {
    pathName: "/about",
    title: "عن degself دق سلف | منصة كراجات الكويت",
    description:
      "degself دق سلف هي منصة كويتية تجمع كراجات ومراكز صيانة السيارات في جميع محافظات الكويت لمساعدة السائقين في إيجاد الخدمة المناسبة بسرعة.",
    h1: "عن degself",
    intro: "منصة كويتية مستقلة لربط أصحاب السيارات بكراجات الصيانة الموثوقة.",
    jsonLd: orgJsonLd,
  },
];

for (const page of hubPages) {
  if (page.pathName === "/") {
    fs.writeFileSync(INDEX_HTML, hubHtml(page), "utf8");
  } else {
    // Write as <name>.html (e.g. /search → search.html), matching Netlify rewrite rules.
    const name = page.pathName.replace(/^\//, "");
    fs.writeFileSync(path.join(DIST, `${name}.html`), hubHtml(page), "utf8");
  }
}
console.log(`[seo] wrote ${hubPages.length} hub pages`);

// ----- governorate hubs -----
for (const g of GOVERNORATES) {
  const items = active.filter((w) => w.governorate === g.ar);
  const page = {
    pathName: `/governorate/${g.slug}`,
    title: `كراجات ومراكز صيانة السيارات في ${g.ar} | degself`,
    description: `قائمة كاملة بكراجات وورش صيانة السيارات في محافظة ${g.ar} بالكويت — ${items.length} كراج مع أرقام تواصل وعناوين. ابحث عن الأقرب لك.`,
    h1: `كراجات ${g.ar}`,
    intro: `${items.length} كراج ومركز صيانة في محافظة ${g.ar}.`,
    jsonLd: orgJsonLd,
  };
  const govDir = path.join(DIST, "governorate");
  fs.mkdirSync(govDir, { recursive: true });
  fs.writeFileSync(path.join(govDir, `${g.slug}.html`), hubHtml(page), "utf8");
}
console.log(`[seo] wrote ${GOVERNORATES.length} governorate hubs`);

// ----- sitemap.xml -----
const urls = [
  { loc: SITE + "/", priority: "1.0", changefreq: "daily" },
  { loc: SITE + "/search", priority: "0.9", changefreq: "daily" },
  { loc: SITE + "/map", priority: "0.9", changefreq: "weekly" },
  { loc: SITE + "/emergency", priority: "0.9", changefreq: "weekly" },
  { loc: SITE + "/about", priority: "0.5", changefreq: "monthly" },
  ...GOVERNORATES.map((g) => ({
    loc: `${SITE}/governorate/${g.slug}`,
    priority: "0.8",
    changefreq: "weekly",
  })),
  ...active.map((w) => ({
    loc: SITE + workshopPath(w),
    priority: "0.6",
    changefreq: "monthly",
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
console.log(`[seo] wrote sitemap.xml with ${urls.length} URLs`);

// ----- robots.txt -----
const robots = `# robots for degself.com
User-agent: *
Allow: /
Disallow: /data/
Disallow: /icons/

Sitemap: ${SITE}/sitemap.xml
`;
fs.writeFileSync(path.join(DIST, "robots.txt"), robots, "utf8");
console.log(`[seo] wrote robots.txt`);

console.log("[seo] done.");
