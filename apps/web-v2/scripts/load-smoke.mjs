#!/usr/bin/env node
/**
 * Lightweight load smoke against a deployed (or local) site.
 *
 * Usage:
 *   SITE_URL=https://degself.com node scripts/load-smoke.mjs
 *   SITE_URL=https://degself.com CONCURRENCY=40 REQUESTS=200 node scripts/load-smoke.mjs
 *
 * Does NOT hit paid Anthropic endpoints. Focuses on public HTML/search paths
 * that historically hammered PostgREST under Path D.
 */

const SITE = (process.env.SITE_URL || "https://degself.com").replace(/\/$/, "");
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 25));
const REQUESTS = Math.max(CONCURRENCY, Number(process.env.REQUESTS || 100));

const PATHS = [
  "/",
  "/search",
  "/search?specialty=%D8%B5%D9%8A%D8%A7%D9%86%D8%A9%20%D8%B9%D8%A7%D9%85%D8%A9",
  "/en/search",
  "/emergency?type=tow",
  "/karaj-mutanaqil",
];

function pickPath(i) {
  return PATHS[i % PATHS.length];
}

async function one(i) {
  const path = pickPath(i);
  const url = `${SITE}${path}`;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "degself-load-smoke/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    const ms = performance.now() - t0;
    // Drain body so sockets close cleanly.
    await res.arrayBuffer();
    return { ok: res.ok, status: res.status, ms, path };
  } catch (e) {
    const ms = performance.now() - t0;
    return { ok: false, status: 0, ms, path, err: String(e?.message || e) };
  }
}

async function pool(total, concurrency, fn) {
  const results = new Array(total);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      results[i] = await fn(i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

const started = performance.now();
console.log(
  `load-smoke → ${SITE}  concurrency=${CONCURRENCY} requests=${REQUESTS}`
);
const results = await pool(REQUESTS, CONCURRENCY, one);
const elapsed = performance.now() - started;

const ok = results.filter((r) => r.ok).length;
const fail = results.length - ok;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const byStatus = {};
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
}
const slow = results
  .filter((r) => r.ms > 3000 || !r.ok)
  .slice(0, 10)
  .map((r) => `${r.path} ${r.status} ${r.ms.toFixed(0)}ms${r.err ? " " + r.err : ""}`);

console.log(
  JSON.stringify(
    {
      site: SITE,
      concurrency: CONCURRENCY,
      requests: REQUESTS,
      ok,
      fail,
      elapsed_ms: Math.round(elapsed),
      rps: Number((REQUESTS / (elapsed / 1000)).toFixed(1)),
      latency_ms: {
        p50: Math.round(pct(times, 50)),
        p95: Math.round(pct(times, 95)),
        p99: Math.round(pct(times, 99)),
        max: Math.round(times[times.length - 1] || 0),
      },
      by_status: byStatus,
      samples_slow_or_fail: slow,
    },
    null,
    2
  )
);

if (fail > REQUESTS * 0.05 || pct(times, 95) > 8000) {
  console.error("load-smoke: FAILED thresholds (fail>5% or p95>8s)");
  process.exit(1);
}
console.error("load-smoke: OK");
