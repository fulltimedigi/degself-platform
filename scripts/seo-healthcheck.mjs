#!/usr/bin/env node
// SEO health check for degself.com — run after any deploy.
//
//   node scripts/seo-healthcheck.mjs                 # checks https://degself.com
//   node scripts/seo-healthcheck.mjs http://localhost:3000
//
// Verifies, against the LIVE site (no accounts/keys needed):
//   1. JSON-LD on every page type parses and carries its required fields.
//   2. Each page type exposes the schema we expect.
//   3. A sample of sitemap URLs return 200 and are indexable (no noindex).
//   4. A non-existent page correctly returns 404.
// Exits 1 on any problem so it can gate a deploy / run in CI.

const BASE = (process.argv[2] || "https://degself.com").replace(/\/$/, "");
const enc = encodeURIComponent;

// Representative page per type → schema @types we expect to find.
const PAGES = {
  home: { url: `/`, expect: ["Organization", "WebSite", "LocalBusiness", "FAQPage"] },
  workshop: { url: `/workshop/ChIJqzUtBc2bzz8R7VHMk07S5N4`, expect: ["AutoRepair", "BreadcrumbList"] },
  best: { url: `/best`, expect: ["ItemList", "BreadcrumbList"] },
  best_category: { url: `/best/${enc("صيانة عامة")}`, expect: ["ItemList", "BreadcrumbList"] },
  landing: { url: `/${enc("كراج")}/${enc("صيانة")}/${enc("الشويخ")}`, expect: ["ItemList", "BreadcrumbList"] },
  specialty_index: { url: `/${enc("كراج")}/${enc("صيانة")}`, expect: ["ItemList", "BreadcrumbList"] },
  make: { url: `/${enc("ماركة")}/${enc("تويوتا")}`, expect: ["ItemList", "BreadcrumbList"] },
  mukhtarat: { url: `/mukhtarat`, expect: ["ItemList", "BreadcrumbList"] },
  blog_post: { url: `/blog/mata-taghyer-zayt-alsayyara`, expect: ["Article", "BreadcrumbList"] },
};

// Minimum required fields per schema @type (Google-relevant subset).
const REQUIRED = {
  AutoRepair: ["name", "address"],
  BreadcrumbList: ["itemListElement"],
  ItemList: ["itemListElement"],
  Article: ["headline"],
  Organization: ["name", "url"],
  WebSite: ["url"],
  FAQPage: ["mainEntity"],
  LocalBusiness: ["name"],
};

let problems = 0;
const fail = (msg) => { console.log(`  ✗ ${msg}`); problems++; };

function ldBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

async function checkSchema() {
  console.log("\n# Structured data");
  for (const [label, { url, expect }] of Object.entries(PAGES)) {
    let html;
    try { html = await (await fetch(BASE + url)).text(); }
    catch (e) { fail(`${label}: fetch failed — ${e.message}`); continue; }

    const found = new Set();
    for (const block of ldBlocks(html)) {
      let parsed;
      try { parsed = JSON.parse(block.replace(/\\u003c/g, "<")); }
      catch (e) { fail(`${label}: JSON-LD parse error — ${e.message.slice(0, 60)}`); continue; }
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        const t = node["@type"];
        found.add(t);
        for (const f of REQUIRED[t] ?? []) {
          if (node[f] == null) fail(`${label}: ${t} missing "${f}"`);
        }
      }
    }
    for (const t of expect) if (!found.has(t)) fail(`${label}: expected schema "${t}" not found`);
    console.log(`  • ${label.padEnd(15)} [${[...found].join(", ")}]`);
  }
}

async function checkCrawl() {
  console.log("\n# Crawl health (sitemap sample)");
  let urls = [];
  try {
    const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
    urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } catch (e) { fail(`sitemap.xml fetch failed — ${e.message}`); return; }
  if (!urls.length) { fail("sitemap.xml has no <loc> entries"); return; }
  console.log(`  sitemap: ${urls.length} URLs`);

  const typeOf = (u) =>
    u.includes("/workshop/") ? "workshop"
    : u.includes("/blog/") ? "blog"
    : /\/(%D9%83%D8%B1%D8%A7%D8%AC|كراج)\//.test(u) ? "landing"
    : u.includes("best") ? "best"
    : /(%D9%85%D8%A7%D8%B1%D9%83%D8%A9|ماركة)/.test(u) ? "make"
    : "other";
  const seen = {}, sample = [];
  for (const u of urls) { const t = typeOf(u); seen[t] = (seen[t] || 0) + 1; if (seen[t] <= 4) sample.push(u); }

  const checks = await Promise.all(sample.map(async (u) => {
    try {
      const r = await fetch(u, { redirect: "manual" });
      const html = r.status === 200 ? await r.text() : "";
      return { u, status: r.status, noindex: /<meta[^>]*name="robots"[^>]*noindex/i.test(html) };
    } catch (e) { return { u, status: "ERR", noindex: false }; }
  }));
  for (const c of checks) {
    if (c.status !== 200) fail(`${c.status} ${c.u}`);
    else if (c.noindex) fail(`noindex on indexable page ${c.u}`);
  }
  console.log(`  checked ${sample.length} pages across types`);

  // Negative control: a missing page must 404, not 200 (soft-404 guard).
  const r = await fetch(`${BASE}/workshop/__does-not-exist__`, { redirect: "manual" });
  if (r.status !== 404) fail(`missing page returned ${r.status}, expected 404`);
}

console.log(`SEO health check → ${BASE}`);
await checkSchema();
await checkCrawl();
console.log(`\n${problems === 0 ? "PASS — no problems" : `FAIL — ${problems} problem(s)`}`);
process.exit(problems === 0 ? 0 : 1);
