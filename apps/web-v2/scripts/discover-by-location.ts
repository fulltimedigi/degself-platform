/**
 * Location-based discovery of automotive centers across Kuwait — REPORT ONLY.
 * NO DB writes, NO additions. Anchored to Kuwait coordinates (kills cross-border noise).
 *
 *   • Nearby Search (radius) per grid point × {car_repair, car_dealer, car_wash}, paginated.
 *   • Text Search "قطع غيار سيارات" per grid point (auto-parts has no Nearby type).
 *   • Search responses already carry business_status + rating + user_ratings_total +
 *     place_id + geometry → NO Place Details calls (keeps cost ~$6).
 *
 *   Strict dedup vs the 1756 active rows: by place_id, normalized name, AND coord proximity.
 *   Acceptance for a "missing" center: OPERATIONAL && reviews >= 10 && not already ours.
 *
 *   HARD CAP on requests — stops & reports partial if hit (no surprises).
 *
 * Run:  npx tsx scripts/discover-by-location.ts   (needs GOOGLE_MAPS_API_KEY)
 * ⚠️ place_id is case-sensitive — never lowercase it.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const GKEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GKEY) { console.error("❌ Missing GOOGLE_MAPS_API_KEY"); process.exit(1); }
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_REQUESTS = 280;     // hard cap — stop & report if reached
const MAX_PAGES = 3;          // up to 60 results per point-type
const RADIUS = 4000;          // meters
const MIN_REVIEWS = 10;
const DUP_METERS = 60;        // coord-proximity dedup threshold

// Kuwait bounding box — discard any stray foreign result.
const KW = { latMin: 28.45, latMax: 30.15, lngMin: 46.5, lngMax: 48.55 };

// grid: industrial zones + governorate centers
const POINTS: { area: string; lat: number; lng: number }[] = [
  { area: "الشويخ الصناعية", lat: 29.3380, lng: 47.9280 },
  { area: "الري الصناعية", lat: 29.3050, lng: 47.9250 },
  { area: "العارضية الحرفية", lat: 29.2970, lng: 47.9160 },
  { area: "الدجيج", lat: 29.2680, lng: 47.9450 },
  { area: "الجهراء الصناعية", lat: 29.3370, lng: 47.6750 },
  { area: "الجهراء البلد", lat: 29.3370, lng: 47.6580 },
  { area: "الفحيحيل", lat: 29.0820, lng: 48.1300 },
  { area: "صبحان الصناعية", lat: 29.2700, lng: 48.0200 },
  { area: "أمغرة", lat: 29.3550, lng: 47.8000 },
  { area: "شرق / مدينة الكويت", lat: 29.3780, lng: 47.9850 },
  { area: "ميناء عبدالله/الشعيبة", lat: 29.0300, lng: 48.1400 },
  { area: "المنقف", lat: 29.0950, lng: 48.1280 },
  { area: "حولي", lat: 29.3330, lng: 48.0280 },
  { area: "الفروانية", lat: 29.2770, lng: 47.9580 },
  { area: "الأحمدي", lat: 29.0770, lng: 48.0830 },
  { area: "خيطان", lat: 29.2850, lng: 47.9700 },
  { area: "السالمية", lat: 29.3330, lng: 48.0770 },
  { area: "القرين/مبارك الكبير", lat: 29.2000, lng: 48.0700 },
];
const NEARBY_TYPES = ["car_repair", "car_dealer", "car_wash"];

function norm(s: string): string {
  return (s || "").toLowerCase()
    .replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}
function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let requests = 0;
class StopCap extends Error {}
async function gReq(url: string): Promise<any> {
  if (requests >= MAX_REQUESTS) throw new StopCap();
  requests++;
  return (await fetch(url)).json();
}
async function nearby(lat: number, lng: number, type: string, token?: string) {
  const base = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const u = token
    ? `${base}?pagetoken=${token}&key=${GKEY}`
    : `${base}?location=${lat},${lng}&radius=${RADIUS}&type=${type}&language=ar&key=${GKEY}`;
  return gReq(u);
}
async function textParts(lat: number, lng: number, token?: string) {
  const base = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const u = token
    ? `${base}?pagetoken=${token}&key=${GKEY}`
    : `${base}?query=${encodeURIComponent("قطع غيار سيارات")}&location=${lat},${lng}&radius=${RADIUS}&language=ar&key=${GKEY}`;
  return gReq(u);
}

type DbRow = { place_id: string; name: string; lat: number | null; lng: number | null };
async function fetchDb(): Promise<DbRow[]> {
  const PAGE = 1000; const all: DbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops").select("place_id,name,lat,lng")
      .eq("active", true).eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as DbRow[]; all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}

async function main() {
  const db = await fetchDb();
  const dbIds = new Set(db.map((r) => r.place_id));
  const dbNorm = db.map((r) => ({ ...r, n: norm(r.name) }));
  const withCoords = dbNorm.filter((r) => r.lat != null && r.lng != null);
  console.log(`\n🗺️  DB: ${db.length} active (${withCoords.length} with coords). Grid: ${POINTS.length} points × ${NEARBY_TYPES.length} types + parts.\n`);

  const found = new Map<string, any>(); // place_id → candidate
  let stopped = false, coveredPoints = 0;

  function collect(results: any[]) {
    for (const r of results ?? []) {
      const loc = r.geometry?.location;
      if (!loc) continue;
      if (loc.lat < KW.latMin || loc.lat > KW.latMax || loc.lng < KW.lngMin || loc.lng > KW.lngMax) continue; // foreign
      const prev = found.get(r.place_id);
      const reviews = r.user_ratings_total ?? 0;
      if (!prev || reviews > (prev.reviews ?? 0)) {
        found.set(r.place_id, {
          place_id: r.place_id, name: r.name, lat: loc.lat, lng: loc.lng,
          rating: r.rating ?? null, reviews,
          business_status: r.business_status ?? "OPERATIONAL", // search omits status when operational
          types: (r.types ?? []).filter((t: string) => t !== "point_of_interest" && t !== "establishment"),
          vicinity: r.vicinity ?? r.formatted_address ?? null,
        });
      }
    }
  }

  try {
    for (const p of POINTS) {
      // nearby per type
      for (const type of NEARBY_TYPES) {
        let token: string | undefined, page = 0;
        do {
          const res = await nearby(p.lat, p.lng, type, token);
          if (res.status === "OVER_QUERY_LIMIT") { console.error("\n⛔ OVER_QUERY_LIMIT — billing/quota. Stopping."); throw new StopCap(); }
          collect(res.results);
          token = res.next_page_token; page++;
          if (token && page < MAX_PAGES) await sleep(2100); else token = undefined;
        } while (token);
      }
      // auto parts via text search
      {
        let token: string | undefined, page = 0;
        do {
          const res = await textParts(p.lat, p.lng, token);
          if (res.status === "OVER_QUERY_LIMIT") { console.error("\n⛔ OVER_QUERY_LIMIT. Stopping."); throw new StopCap(); }
          collect(res.results);
          token = res.next_page_token; page++;
          if (token && page < MAX_PAGES) await sleep(2100); else token = undefined;
        } while (token);
      }
      coveredPoints++;
      process.stdout.write(`\r  covered ${coveredPoints}/${POINTS.length} points · ${requests} requests · ${found.size} unique places`);
    }
  } catch (e) {
    if (e instanceof StopCap) stopped = true; else throw e;
  }
  console.log("");

  // classify each found place vs DB
  const rows = [...found.values()].map((c) => {
    const cn = norm(c.name);
    // nearest DB row by distance
    let near: any = null, nearDist = Infinity;
    for (const d of withCoords) {
      const dist = haversine(c.lat, c.lng, d.lat!, d.lng!);
      if (dist < nearDist) { nearDist = dist; near = d; }
    }
    const nameDupRow = dbNorm.find((d) => cn && (d.n.includes(cn) || cn.includes(d.n)) && Math.min(cn.length, d.n.length) >= 5);
    const byId = dbIds.has(c.place_id);
    const byCoord = near && nearDist <= DUP_METERS;
    const isAuto = c.types.some((t: string) => ["car_repair", "car_dealer", "car_wash"].includes(t));

    let verdict: string;
    if (byId) verdict = "DUP_ID";
    else if (byCoord) verdict = "DUP_COORD";
    else if (nameDupRow) verdict = "DUP_NAME";
    else if (c.business_status !== "OPERATIONAL") verdict = "SKIP_CLOSED";
    else if (c.reviews < MIN_REVIEWS) verdict = "SKIP_FEW";
    else if (!isAuto) verdict = "SKIP_TYPE";
    else verdict = "MISSING"; // genuinely new + qualifies

    return {
      ...c,
      verdict,
      nearest_name: near?.name ?? null,
      nearest_m: Math.round(nearDist),
      name_dup: nameDupRow?.name ?? null,
    };
  });

  const missing = rows.filter((r) => r.verdict === "MISSING").sort((a, b) => b.reviews - a.reviews);
  const counts = rows.reduce((m: any, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {});

  writeFileSync(resolve(__dirname, "discover-by-location.json"),
    JSON.stringify({ stopped, requests, coveredPoints, totalPoints: POINTS.length, counts, missing, all: rows }, null, 2), "utf8");

  // ---- report ----
  console.log(`\n${"=".repeat(110)}`);
  if (stopped) console.log(`⚠️  STOPPED at request cap (${requests}/${MAX_REQUESTS}) — covered ${coveredPoints}/${POINTS.length} points. Report is PARTIAL.`);
  else console.log(`✅ done — ${requests} requests, all ${POINTS.length} points covered.`);
  console.log(`unique places seen: ${rows.length} | dedup → DUP_ID:${counts.DUP_ID ?? 0} DUP_COORD:${counts.DUP_COORD ?? 0} DUP_NAME:${counts.DUP_NAME ?? 0} | filtered → closed:${counts.SKIP_CLOSED ?? 0} few(<${MIN_REVIEWS}):${counts.SKIP_FEW ?? 0} nonAuto:${counts.SKIP_TYPE ?? 0}`);
  console.log(`${"=".repeat(110)}`);
  console.log(`\n🟢 MISSING centers (OPERATIONAL · reviews ≥ ${MIN_REVIEWS} · not in DB) — sorted by reviews desc: ${missing.length}\n`);

  for (const r of missing) {
    console.log(`⭐${String(r.rating ?? "-").padEnd(3)} (${String(r.reviews).padStart(4)}) | ${r.name}`);
    console.log(`        ${r.vicinity ?? ""}`);
    console.log(`        types=[${r.types.join(",")}] · place_id=${r.place_id}`);
    console.log(`        🔎 أقرب موجود: «${r.nearest_name ?? "-"}» على ${r.nearest_m}م` + (r.name_dup ? `  ⚠️ تشابه اسم: «${r.name_dup}»` : ""));
  }
  console.log(`\nfull JSON: scripts/discover-by-location.json — review before any add.`);
  if (stopped) console.log(`\n👉 hit the cap — say the word and I'll continue from point ${coveredPoints + 1}/${POINTS.length}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
