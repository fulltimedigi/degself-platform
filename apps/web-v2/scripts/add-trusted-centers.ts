/**
 * Add a few TRUSTWORTHY Kuwait centers surfaced by re-mining the cached
 * missing-centers-search.json (free; no new sweep). Strict trust bar so only
 * well-reviewed, operational, Kuwait automotive centers get in.
 *
 * Trust bar: rating >= 4.0 AND reviews >= 50 AND OPERATIONAL AND inside Kuwait
 *            AND automotive type AND not already in DB (by place_id or name).
 *
 * Run:  npx tsx scripts/add-trusted-centers.ts            (dry-run)
 *       npx tsx scripts/add-trusted-centers.ts --commit
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GKEY || !SKEY) { console.error("❌ need keys"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

const KW = { latMin: 28.45, latMax: 30.15, lngMin: 46.5, lngMax: 48.55 };
const MIN_RATING = 4.0, MIN_REVIEWS = 50;

// vetted candidate place_ids from missing-centers-search.json (Kuwait, trustworthy)
const CANDIDATES = [
  "ChIJpUddeZeazz8ROLopBC5acAg", // نيسان البابطين - الري
  "ChIJa_xJts-azz8RU5Bw-crsIh4", // عادل الغانم - ام جي
  "ChIJawyGPTmbzz8RuBfWgXAYe2s", // علي الغانم وأولاده - جيلي
  "ChIJ7SuJymubzz8RFqvT9fhKdhk", // مرسيدس الملا - معرض الري
  "ChIJUSuQtdibzz8RhkyazCrO78A", // مرسيدس الملا - مستعملة الري
];

const norm = (x: string) => (x || "").toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
function haversine(a: number, b: number, c: number, d: number) { const R = 6371000, t = (x: number) => x * Math.PI / 180; const dl = t(c - a), dn = t(d - b); const x = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
async function details(placeId: string) {
  const fields = ["place_id", "name", "geometry", "formatted_address", "vicinity", "address_component",
    "formatted_phone_number", "international_phone_number", "website", "current_opening_hours", "opening_hours",
    "rating", "user_ratings_total", "business_status", "types"].join(",");
  return (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=ar&key=${GKEY}`)).json();
}
function neighborhoodOf(g: any): string | null {
  for (const w of ["neighborhood", "sublocality", "sublocality_level_1"]) { const c = (g.address_components ?? []).find((x: any) => (x.types ?? []).includes(w)); if (c) return c.long_name; }
  return null;
}

async function main() {
  const PAGE = 1000; const db: any[] = [];
  for (let f = 0; ; f += PAGE) { const { data } = await supabase.from("workshops").select("place_id,name,lat,lng,area,governorate").range(f, f + PAGE - 1); const b = data ?? []; db.push(...b); if (b.length < PAGE) break; }
  const ids = new Set(db.map((r) => r.place_id));
  const dbNorm = db.map((r) => ({ ...r, n: norm(r.name) }));
  const coords = db.filter((r) => r.lat != null && r.lng != null);

  const NOW = new Date().toISOString();
  const toInsert: any[] = []; const skipped: string[] = [];

  for (const pid of CANDIDATES) {
    if (ids.has(pid)) { skipped.push(`${pid} — already in DB`); continue; }
    const d = await details(pid);
    if (d.status !== "OK") { skipped.push(`${pid} — Details ${d.status}`); continue; }
    const g = d.result; const loc = g.geometry?.location;
    if (!loc) { skipped.push(`${g.name} — no coords`); continue; }
    if (loc.lat < KW.latMin || loc.lat > KW.latMax || loc.lng < KW.lngMin || loc.lng > KW.lngMax) { skipped.push(`${g.name} — خارج الكويت`); continue; }
    if (g.business_status !== "OPERATIONAL") { skipped.push(`${g.name} — ${g.business_status}`); continue; }
    const rating = g.rating ?? 0, reviews = g.user_ratings_total ?? 0;
    if (rating < MIN_RATING || reviews < MIN_REVIEWS) { skipped.push(`${g.name} — تحت معيار الثقة (⭐${rating}/${reviews})`); continue; }
    const cn = norm(g.name);
    const nameDup = dbNorm.find((r) => cn && (r.n.includes(cn) || cn.includes(r.n)) && Math.min(cn.length, r.n.length) >= 5);
    if (nameDup) { skipped.push(`${g.name} — اسم مكرر «${nameDup.name}»`); continue; }

    const entity = /معرض|showroom/i.test(g.name) ? "معرض" : "وكيل";
    let near: any = null, nearD = Infinity;
    for (const r of coords) { const dist = haversine(loc.lat, loc.lng, r.lat, r.lng); if (dist < nearD) { nearD = dist; near = r; } }
    const area = near?.area ?? null, governorate = near?.governorate ?? null;
    const phoneIntl = g.international_phone_number ?? null;
    const phone = g.formatted_phone_number ?? phoneIntl ?? "";
    const hours = (g.current_opening_hours?.weekday_text ?? g.opening_hours?.weekday_text ?? []).join(" | ");
    const searchText = norm([g.name, "وكيل", g.formatted_address, governorate, area].filter(Boolean).join(" "));

    toInsert.push({
      place_id: pid, name: g.name, specialty: "وكيل", entity_type: entity, service_mode: "fixed",
      category_raw: "وكيل سيارات", specialty_hints: ["وكيل"], area, governorate,
      address: g.formatted_address ?? g.vicinity ?? "", street: "", lat: loc.lat, lng: loc.lng,
      phone, phone_intl: phoneIntl ? phoneIntl.replace(/\s/g, "") : null, website: g.website ?? null,
      google_rating: rating, google_reviews_count: reviews, opening_hours: hours,
      images_count: 0, main_image: null, payments: "", emergency_service: false,
      permanently_closed: false, active: true, is_claimed: false, claimed_by: null,
      internal_rating_avg: null, internal_reviews_count: 0, fb_mentions_count: 0,
      search_text: searchText, reviewed_specialty: "وكيل", is_automotive: true, out_of_scope: false,
      audit_confidence: "HIGH", audit_reviewed_at: NOW, neighborhood: neighborhoodOf(g) ?? area,
      created_at: NOW, updated_at: NOW,
    });
    console.log(`  ✓ ${g.name} | ${entity} | ${governorate}/${area} | ⭐${rating}(${reviews}) | ${phone || "بلا هاتف"}`);
  }

  console.log(`\nprepared: ${toInsert.length} · skipped: ${skipped.length}`);
  for (const s of skipped) console.log(`  ⏭️ ${s}`);
  if (!COMMIT) { console.log("\n🟡 DRY-RUN — أعد التشغيل بـ --commit."); return; }

  let added = 0;
  for (const row of toInsert) { const { error } = await supabase.from("workshops").upsert(row, { onConflict: "place_id", ignoreDuplicates: true }); if (error) console.error(`❌ ${row.name}: ${error.message}`); else added++; }
  console.log(`\n✅ added: ${added}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
