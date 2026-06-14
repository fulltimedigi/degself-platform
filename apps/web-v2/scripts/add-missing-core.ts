/**
 * Add the "core" missing automotive centers surfaced by re-mining the cached
 * discover-by-location.json (candidates dropped by the 60m coord-dedup, like
 * كراج كاردف). Scope = repair garages + dealers/service + spare parts.
 * Excludes car_wash / car_rental / gas_station and obvious non-auto noise.
 *
 * Mirrors add-group-a.ts: Place Details → inherit governorate/area from nearest
 * DB row → build search_text → insert one active row each. Idempotent on place_id.
 *
 * Run:  npx tsx scripts/add-missing-core.ts            (dry-run; NO writes)
 *       npx tsx scripts/add-missing-core.ts --commit   (performs inserts)
 * Needs: GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY in .env.local
 * ⚠️ place_id is case-sensitive.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

config({ path: ".env.local" });
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GKEY || !SKEY) { console.error("❌ need GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const norm = (x: string) => (x || "").toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
function haversine(a: number, b: number, c: number, d: number) { const R = 6371000, t = (x: number) => x * Math.PI / 180; const dl = t(c - a), dn = t(d - b); const x = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

const NOISE = /caf[eé]|coffee|كوفي|قهوة|مطعم|restaurant|بقاله|بقالة|صيدلي|pharmac|hotel|فندق/i;
// Car washes are out of scope for this batch — drop even when tagged car_repair.
const WASH = /غسيل|wash|كار ?واش|تلميع|detailing/i;

function classify(name: string, types: string[]): { specialty: string; entity_type: string; category_raw: string } {
  const n = name || "";
  const isParts = /قطع غيار|spare|parts/i.test(n);
  if (isParts) return { specialty: "قطع غيار", entity_type: "محل", category_raw: "قطع غيار سيارات" };
  if (types.includes("car_dealer")) {
    const entity = /معرض|showroom/i.test(n) ? "معرض" : "وكيل";
    return { specialty: "وكيل", entity_type: entity, category_raw: "وكيل سيارات" };
  }
  // car_repair → refine specialty by name keywords
  let specialty = "صيانة عامة";
  if (/بنشر|تواير|إطار|اطار|tyre|tire/i.test(n)) specialty = "تواير وبنشر";
  else if (/بودي|صبغ|سمكر|دهان|paint|body/i.test(n)) specialty = "بودي وصبغ";
  else if (/بطاري|battery/i.test(n)) specialty = "بطاريات";
  else if (/تكييف|فريون|تبريد/i.test(n)) specialty = "تكييف";
  else if (/زيت|زيوت|oil|lube|تشحيم/i.test(n)) specialty = "زيوت وصيانة";
  return { specialty, entity_type: "كراج", category_raw: "مركز خدمة سيارات" };
}

async function details(placeId: string) {
  const fields = ["place_id", "name", "geometry", "formatted_address", "vicinity", "address_component",
    "formatted_phone_number", "international_phone_number", "website", "current_opening_hours", "opening_hours",
    "rating", "user_ratings_total", "business_status", "types"].join(",");
  const u = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=ar&key=${GKEY}`;
  return (await fetch(u)).json();
}
function neighborhoodOf(g: any): string | null {
  for (const want of ["neighborhood", "sublocality", "sublocality_level_1"]) {
    const c = (g.address_components ?? []).find((x: any) => (x.types ?? []).includes(want));
    if (c) return c.long_name;
  }
  return null;
}

async function main() {
  const cache = JSON.parse(readFileSync("scripts/discover-by-location.json", "utf8"));
  const all = cache.all as any[];

  // current DB
  const PAGE = 1000; const db: any[] = [];
  for (let f = 0; ; f += PAGE) { const { data } = await supabase.from("workshops").select("place_id,name,lat,lng,area,governorate").range(f, f + PAGE - 1); const b = data ?? []; db.push(...b); if (b.length < PAGE) break; }
  const ids = new Set(db.map((r) => r.place_id));
  const dbNorm = db.map((r) => ({ ...r, n: norm(r.name) }));
  const coords = db.filter((r) => r.lat != null && r.lng != null);

  // core candidates: not in DB, OPERATIONAL, reviews>=10, repair/dealer (not wash-only/rental/gas), not name-dup, not noise
  const core = all.filter((r) => {
    if (ids.has(r.place_id)) return false;
    if (r.business_status !== "OPERATIONAL") return false;
    if ((r.reviews ?? 0) < 10) return false;
    const t: string[] = r.types ?? [];
    if (t.includes("car_rental") || t.includes("gas_station")) return false;
    const isRepairOrDealer = t.includes("car_repair") || t.includes("car_dealer");
    if (!isRepairOrDealer) return false; // drops wash-only
    if (NOISE.test(r.name)) return false;
    if (WASH.test(r.name)) return false; // car washes out of scope this batch
    const cn = norm(r.name);
    const nameDup = dbNorm.find((d) => cn && (d.n.includes(cn) || cn.includes(d.n)) && Math.min(cn.length, d.n.length) >= 5);
    if (nameDup) return false;
    return true;
  });

  console.log(`core candidates (pre-Details): ${core.length}\n`);

  const NOW = new Date().toISOString();
  const toInsert: any[] = [];
  const skipped: string[] = [];
  let i = 0;
  for (const c of core) {
    i++;
    const d = await details(c.place_id);
    if (d.status !== "OK") { skipped.push(`${c.name} — Details ${d.status}`); continue; }
    const g = d.result;
    const loc = g.geometry?.location;
    if (!loc) { skipped.push(`${c.name} — no coords`); continue; }
    if (g.business_status === "CLOSED_PERMANENTLY") { skipped.push(`${c.name} — closed`); continue; }
    const types: string[] = g.types ?? [];
    // re-validate it's still automotive per fresh Details
    if (!types.some((t) => ["car_repair", "car_dealer", "car_wash", "store"].includes(t))) { skipped.push(`${c.name} — non-auto types [${types.join(",")}]`); continue; }

    const { specialty, entity_type, category_raw } = classify(g.name, types);
    let near: any = null, nearD = Infinity;
    for (const r of coords) { const dist = haversine(loc.lat, loc.lng, r.lat, r.lng); if (dist < nearD) { nearD = dist; near = r; } }
    const area = near?.area ?? null, governorate = near?.governorate ?? null;
    const neighborhood = neighborhoodOf(g) ?? area;
    const phoneIntl = g.international_phone_number ?? null;
    const phone = g.formatted_phone_number ?? phoneIntl ?? "";
    const hours = (g.current_opening_hours?.weekday_text ?? g.opening_hours?.weekday_text ?? []).join(" | ");
    const searchText = norm([g.name, specialty, g.formatted_address, governorate, area].filter(Boolean).join(" "));

    toInsert.push({
      place_id: c.place_id, name: g.name, specialty, entity_type, service_mode: "fixed",
      category_raw, specialty_hints: [specialty], area, governorate,
      address: g.formatted_address ?? g.vicinity ?? "", street: "",
      lat: loc.lat, lng: loc.lng, phone, phone_intl: phoneIntl ? phoneIntl.replace(/\s/g, "") : null,
      website: g.website ?? null, google_rating: g.rating ?? null, google_reviews_count: g.user_ratings_total ?? 0,
      opening_hours: hours, images_count: 0, main_image: null, payments: "", emergency_service: false,
      permanently_closed: false, active: true, is_claimed: false, claimed_by: null,
      internal_rating_avg: null, internal_reviews_count: 0, fb_mentions_count: 0,
      search_text: searchText, reviewed_specialty: specialty, is_automotive: true, out_of_scope: false,
      audit_confidence: "MEDIUM", audit_reviewed_at: NOW, neighborhood, created_at: NOW, updated_at: NOW,
    });
    if (i % 20 === 0) process.stdout.write(`\r  details fetched ${i}/${core.length}…`);
    await sleep(120);
  }
  console.log("");

  // summary by specialty/entity
  const bySpec: Record<string, number> = {};
  for (const r of toInsert) bySpec[`${r.entity_type}/${r.specialty}`] = (bySpec[`${r.entity_type}/${r.specialty}`] ?? 0) + 1;
  writeFileSync("scripts/missing-core-additions.json", JSON.stringify(toInsert, null, 2), "utf8");
  console.log(`\nprepared: ${toInsert.length} · skipped: ${skipped.length}`);
  console.log("breakdown:", JSON.stringify(bySpec, null, 0));
  console.log("\nأمثلة (أعلى 12 بالتقييمات):");
  for (const r of [...toInsert].sort((a, b) => b.google_reviews_count - a.google_reviews_count).slice(0, 12))
    console.log(`  ⭐${String(r.google_rating ?? "-").padEnd(3)}(${String(r.google_reviews_count).padStart(4)}) | ${r.entity_type}/${r.specialty} | ${r.name} | ${r.governorate}/${r.area} | ${r.phone || "بلا هاتف"}`);
  if (skipped.length) { console.log("\nمُستبعَد:"); for (const s of skipped.slice(0, 20)) console.log(`  ⏭️ ${s}`); }

  if (!COMMIT) { console.log("\n🟡 DRY-RUN — لا كتابة. أعد التشغيل بـ --commit."); return; }

  const before = (await supabase.from("workshops").select("place_id", { count: "exact", head: true }).eq("active", true).eq("permanently_closed", false).eq("is_automotive", true).eq("out_of_scope", false)).count ?? -1;
  let added = 0, failed = 0;
  for (const row of toInsert) {
    const { error } = await supabase.from("workshops").upsert(row, { onConflict: "place_id", ignoreDuplicates: true });
    if (error) { failed++; console.error(`  ❌ ${row.name}: ${error.message}`); } else added++;
  }
  const after = (await supabase.from("workshops").select("place_id", { count: "exact", head: true }).eq("active", true).eq("permanently_closed", false).eq("is_automotive", true).eq("out_of_scope", false)).count ?? -1;
  console.log(`\n✅ inserted/ensured: ${added} · failed: ${failed}`);
  console.log(`📊 searchable active: ${before} → ${after} (Δ ${after - before})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
