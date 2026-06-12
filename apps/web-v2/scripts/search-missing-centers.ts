/**
 * Targeted Places Text Search for the centers our DB diagnostic flagged as missing.
 * STRICT acceptance — no writes, no additions. Produces a review report only.
 *
 *   accept rules per candidate:
 *     - business_status === "OPERATIONAL"
 *     - types ∩ {car_repair, car_dealer, car_wash}  (auto-parts has no legacy type → VERIFY)
 *     - user_ratings_total >= 5
 *     - not already in the 1756 (by place_id, or fuzzy name match → SKIP as dup)
 *
 * Cost: 1 Text Search call per query variant (~25 calls total). Cheap.
 * Run:  npx tsx scripts/search-missing-centers.ts   (needs GOOGLE_MAPS_API_KEY)
 *
 * ⚠️ place_id is case-sensitive — never lowercase it.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const GKEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GKEY) {
  console.error("❌ Missing GOOGLE_MAPS_API_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
const __dirname = dirname(fileURLToPath(import.meta.url));

const AUTO_TYPES = new Set(["car_repair", "car_dealer", "car_wash"]);

// targets → query variants (Arabic + English, Kuwait-scoped)
const TARGETS: { label: string; queries: string[] }[] = [
  { label: "Auto Lab (أوتو لاب)", queries: ["Auto Lab Kuwait car service", "اوتو لاب الكويت سيارات", "أوتو لاب صيانة سيارات الكويت"] },
  { label: "Speedex (سبيدكس)", queries: ["Speedex Kuwait", "سبيدكس الكويت", "Speedex auto Kuwait"] },
  { label: "Midas", queries: ["Midas Kuwait auto service", "مايدس الكويت سيارات"] },
  { label: "النفيسي", queries: ["النفيسي سيارات الكويت", "Al Nafisi automotive Kuwait", "Nafisi car service Kuwait"] },
  { label: "العيسى", queries: ["العيسى للسيارات الكويت", "Al Eisa automotive Kuwait", "Aleisa car Kuwait"] },
  { label: "Trust (الثقة)", queries: ["Trust auto service Kuwait", "الثقة لخدمة السيارات الكويت", "Trust car care Kuwait"] },
  { label: "Magic", queries: ["Magic auto service Kuwait", "ماجيك لخدمة السيارات الكويت", "Magic car wash Kuwait"] },
  { label: "Auto One (الكيان الحقيقي)", queries: ["Auto One Kuwait", "اوتو ون الكويت", "Auto One car service Kuwait"] },
];

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function textSearch(query: string) {
  const u = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&region=kw&language=ar&key=${GKEY}`;
  return (await fetch(u)).json();
}

type DbRow = { place_id: string; name: string };
async function fetchDb(): Promise<DbRow[]> {
  const PAGE = 1000;
  const all: DbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id,name")
      .eq("active", true)
      .eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as DbRow[];
    all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}

async function main() {
  const db = await fetchDb();
  const dbIds = new Set(db.map((r) => r.place_id));
  const dbNames = db.map((r) => ({ id: r.place_id, n: norm(r.name) }));
  console.log(`\n🔎 DB has ${db.length} active rows for dedup. Searching ${TARGETS.length} targets…\n`);

  const report: any[] = [];
  const seen = new Set<string>(); // place_ids seen across this run (avoid intra-run dups)

  for (const t of TARGETS) {
    const candidates = new Map<string, any>();
    for (const q of t.queries) {
      const res = await textSearch(q);
      if (res.status === "OVER_QUERY_LIMIT") {
        console.error("⛔ OVER_QUERY_LIMIT — stopping. Check billing/quota.");
        process.exit(1);
      }
      for (const r of res.results ?? []) {
        if (!candidates.has(r.place_id)) candidates.set(r.place_id, r);
      }
    }

    const rows: any[] = [];
    for (const c of candidates.values()) {
      const types: string[] = c.types ?? [];
      const isAuto = types.some((x) => AUTO_TYPES.has(x));
      const reviews = c.user_ratings_total ?? 0;
      const operational = c.business_status === "OPERATIONAL";
      const inDbById = dbIds.has(c.place_id);
      const cn = norm(c.name);
      const nameDup = dbNames.find((d) => cn && (d.n.includes(cn) || cn.includes(d.n)) && Math.min(cn.length, d.n.length) >= 4);
      const intraDup = seen.has(c.place_id);

      let verdict: string, reason: string;
      if (inDbById || intraDup) { verdict = "SKIP"; reason = "موجود بالفعل (place_id)"; }
      else if (nameDup) { verdict = "SKIP"; reason = `تطابق اسم مع موجود: «${db.find((d) => d.place_id === nameDup.id)?.name ?? ""}»`; }
      else if (!operational) { verdict = "SKIP"; reason = `business_status=${c.business_status ?? "?"}`; }
      else if (!isAuto) { verdict = "SKIP"; reason = `تصنيف غير سيارات: [${types.slice(0, 4).join(",")}]`; }
      else if (reviews < 5) { verdict = "VERIFY"; reason = `reviews=${reviews} < 5`; }
      else { verdict = "ADD"; reason = `auto + operational + ${reviews} مراجعة`; }

      seen.add(c.place_id);
      rows.push({
        target: t.label,
        name: c.name,
        area: c.formatted_address ?? null,
        place_id: c.place_id,
        rating: c.rating ?? null,
        reviews,
        types: types.filter((x) => x !== "point_of_interest" && x !== "establishment").slice(0, 4),
        business_status: c.business_status ?? null,
        verdict,
        reason,
      });
    }
    // keep the strongest candidates first
    rows.sort((a, b) => (b.verdict === "ADD" ? 1 : 0) - (a.verdict === "ADD" ? 1 : 0) || b.reviews - a.reviews);
    report.push({ target: t.label, candidates: rows });
  }

  writeFileSync(resolve(__dirname, "missing-centers-search.json"), JSON.stringify(report, null, 2), "utf8");

  // print report
  for (const block of report) {
    console.log(`\n══ ${block.target} ══`);
    if (!block.candidates.length) { console.log("  (لا نتائج)"); continue; }
    for (const r of block.candidates) {
      const tag = r.verdict === "ADD" ? "🟢 ADD   " : r.verdict === "VERIFY" ? "🟡 VERIFY" : "⚪ SKIP  ";
      console.log(`  ${tag} | ⭐${r.rating ?? "-"} (${r.reviews}) | ${r.name}`);
      console.log(`           ${r.area ?? ""}`);
      console.log(`           place_id=${r.place_id}`);
      console.log(`           types=[${r.types.join(",")}] · ${r.reason}`);
    }
  }

  const adds = report.flatMap((b: any) => b.candidates).filter((r: any) => r.verdict === "ADD");
  const verify = report.flatMap((b: any) => b.candidates).filter((r: any) => r.verdict === "VERIFY");
  console.log(`\n===== SUMMARY =====`);
  console.log(`🟢 ADD candidates:    ${adds.length}`);
  console.log(`🟡 VERIFY candidates: ${verify.length}`);
  console.log(`full report: scripts/missing-centers-search.json — review before any add.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
