/**
 * Add Group (A): 25 authorized dealers / brand service centers discovered via
 * location-based Places search and manually verified as genuinely missing.
 *
 *   • Pulls Place Details (Contact + Atmosphere) for each to fill the full schema.
 *   • governorate/area inherited from the NEAREST existing DB row (keeps taxonomy
 *     consistent with the other 1756) — falls back to Details address_components.
 *   • reviewed_specialty + specialty set per curated type; is_automotive = true;
 *     audit_confidence = HIGH (human-verified).
 *   • IDEMPOTENT: skips any place_id already present, and any candidate within 40m
 *     of an existing row (final coord dedup) — safe to re-run.
 *
 * Run:  npx tsx scripts/add-group-a.ts            (dry-run report; NO writes)
 *       npx tsx scripts/add-group-a.ts --commit   (performs the inserts)
 * Needs: GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY in .env.local
 * ⚠️ place_id is case-sensitive — never lowercase it.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GKEY || !SKEY) { console.error("❌ need GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });
const __dirname = dirname(fileURLToPath(import.meta.url));

// curated: place_id → { specialty, entity_type }   (reviewed_specialty = specialty)
type Spec = { specialty: string; entity_type: string };
const ITEMS: Record<string, Spec> = {
  // dealers / showrooms
  "ChIJ_7jwmZSazz8R1I1BbKNsd6M": { specialty: "وكيل", entity_type: "وكيل" }, // Kia المطوع
  "ChIJDWdE-JCazz8RJuT2chT7y9E": { specialty: "وكيل", entity_type: "وكيل" }, // Honda motorcycles
  "ChIJA3P1d5eazz8RNFPFVlYEh28": { specialty: "وكيل", entity_type: "وكيل" }, // رينو البابطين
  "ChIJBTLIo0qFzz8RUKIZYGtANck": { specialty: "وكيل", entity_type: "وكيل" }, // Ali Alghanim Certified Used Cars
  "ChIJbxVmZpSazz8RmnNX_dSJFBE": { specialty: "وكيل", entity_type: "وكيل" }, // المطوع والقاضي (الري)
  "ChIJWxrAZeyazz8R8IS6fGaYBNs": { specialty: "وكيل", entity_type: "وكيل" }, // مصطفى كرم
  "ChIJHVikNL2Ezz8R2xYQ5AR3rt4": { specialty: "وكيل", entity_type: "وكيل" }, // GMC Showroom Sharq
  "ChIJwV7U05Wazz8R17c34MUNDM8": { specialty: "وكيل", entity_type: "وكيل" }, // Jaguar Al Zayani
  "ChIJq-wXDjqFzz8R9F9M9p7Rd8c": { specialty: "وكيل", entity_type: "وكيل" }, // Volvo Studio
  "ChIJf-2SpPKazz8RU8W0kPH4VNE": { specialty: "وكيل", entity_type: "وكيل" }, // Aston Martin
  "ChIJ_a7nZX6bzz8RTYek--HkAN4": { specialty: "وكيل", entity_type: "وكيل" }, // AL MULLA SELECT
  "ChIJ3zjP4byEzz8RWqpvuxo7XYU": { specialty: "وكيل", entity_type: "وكيل" }, // شفروليه الغانم شرق
  "ChIJKWyppsL3zz8RFOmkC5UadP0": { specialty: "وكيل", entity_type: "وكيل" }, // GAC المطوع الجهراء
  "ChIJ-ZqE4fObzz8RP8WqdDWWrjo": { specialty: "وكيل", entity_type: "وكيل" }, // HongQi
  "ChIJfS-CRgD1zz8R4oTV7X2t1Yg": { specialty: "وكيل", entity_type: "وكيل" }, // علي الغانم الجهراء
  "ChIJZzGwKgT3zz8Rq2Uu9fNrbMk": { specialty: "وكيل", entity_type: "وكيل" }, // Geely الجهراء
  "ChIJq9Ra8OL3zz8R2U_OjttqrNw": { specialty: "وكيل", entity_type: "وكيل" }, // BMW Jahra
  "ChIJDRC5L2-Zzz8Rg0mYWJKw3hY": { specialty: "وكيل", entity_type: "وكيل" }, // علي الغانم 360
  // authorized service stations / centers
  "ChIJTzcwEMaFzz8RH_kwB1y9yUI": { specialty: "وكيل", entity_type: "خدمة" }, // ACDelco GMC Service
  "ChIJg3wGJNyEzz8RdqIjrkC78s4": { specialty: "وكيل", entity_type: "خدمة" }, // Porsche Service
  "ChIJ13zOTFWazz8RCUG6ayVLwlM": { specialty: "وكيل", entity_type: "خدمة" }, // Ali Alghanim Omariya
  "ChIJPVIO8hd3zz8RJd5bbuVHs6I": { specialty: "وكيل", entity_type: "خدمة" }, // Geely Salmiya
  "ChIJR8tj3CGbzz8RftY5lcVHczU": { specialty: "وكيل", entity_type: "خدمة" }, // Ali Alghanim Khaldiya
  // authorized spare parts
  "ChIJua4yjcWazz8RxINOlLE-E4g": { specialty: "قطع غيار", entity_type: "محل" }, // هيونداي قطع غيار
  "ChIJj7TWML2Ezz8R3ysLfInDsjA": { specialty: "قطع غيار", entity_type: "محل" }, // Al Sayer Spare parts
};

const CAT_RAW: Record<string, string> = { car_dealer: "وكيل سيارات", car_repair: "مركز خدمة سيارات", car_wash: "مغسلة سيارات" };

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
async function details(placeId: string) {
  const fields = ["place_id", "name", "geometry", "formatted_address", "vicinity", "address_component",
    "formatted_phone_number", "international_phone_number", "website", "current_opening_hours", "opening_hours",
    "rating", "user_ratings_total", "business_status", "types"].join(",");
  const u = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=ar&key=${GKEY}`;
  return (await fetch(u)).json();
}
function neighborhoodOf(g: any): string | null {
  const comps = g.address_components ?? [];
  for (const want of ["neighborhood", "sublocality", "sublocality_level_1"]) {
    const c = comps.find((x: any) => (x.types ?? []).includes(want));
    if (c) return c.long_name;
  }
  return null;
}

type DbRow = { place_id: string; name: string; lat: number | null; lng: number | null; area: string | null; governorate: string | null };
async function fetchDb(): Promise<DbRow[]> {
  const PAGE = 1000; const all: DbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("workshops").select("place_id,name,lat,lng,area,governorate").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as DbRow[]; all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}
async function countActive(): Promise<number> {
  const { count } = await supabase.from("workshops").select("place_id", { count: "exact", head: true })
    .eq("active", true).eq("permanently_closed", false);
  return count ?? -1;
}

async function main() {
  const db = await fetchDb();
  const dbIds = new Set(db.map((r) => r.place_id));
  const coords = db.filter((r) => r.lat != null && r.lng != null);
  const before = await countActive();
  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT (will insert)" : "🟡 DRY-RUN (no writes)"} · DB active before: ${before}\n`);

  const NOW = new Date().toISOString();
  const toInsert: any[] = [];
  const skipped: string[] = [];

  for (const [pid, spec] of Object.entries(ITEMS)) {
    if (dbIds.has(pid)) { skipped.push(`${pid} — موجود (place_id)`); continue; }
    const d = await details(pid);
    if (d.status !== "OK") { skipped.push(`${pid} — Details ${d.status}`); continue; }
    const g = d.result;
    const loc = g.geometry?.location;
    if (!loc) { skipped.push(`${pid} — لا إحداثيات`); continue; }

    // final coord dedup
    let near: DbRow | null = null, nearD = Infinity;
    for (const r of coords) { const dist = haversine(loc.lat, loc.lng, r.lat!, r.lng!); if (dist < nearD) { nearD = dist; near = r; } }
    if (nearD < 40) { skipped.push(`${pid} «${g.name}» — قريب جداً (${Math.round(nearD)}م) من «${near?.name}» → تخطّي`); continue; }

    const phoneIntl = g.international_phone_number ?? null;
    const phone = g.formatted_phone_number ?? phoneIntl ?? "";
    const hours = (g.current_opening_hours?.weekday_text ?? g.opening_hours?.weekday_text ?? []).join(" | ");
    const types: string[] = g.types ?? [];
    const catRaw = CAT_RAW[types.find((t) => CAT_RAW[t]) ?? ""] ?? "وكيل سيارات";
    const area = near?.area ?? null;
    const governorate = near?.governorate ?? null;
    const neighborhood = neighborhoodOf(g) ?? area;
    const reviewed = spec.specialty;
    const searchText = norm([g.name, spec.specialty, reviewed, g.formatted_address, governorate, area].filter(Boolean).join(" "));

    toInsert.push({
      place_id: pid,
      name: g.name,
      specialty: spec.specialty,
      entity_type: spec.entity_type,
      service_mode: "fixed",
      category_raw: catRaw,
      specialty_hints: [reviewed],
      area, governorate,
      address: g.formatted_address ?? g.vicinity ?? "",
      street: "",
      lat: loc.lat, lng: loc.lng,
      phone, phone_intl: phoneIntl ? phoneIntl.replace(/\s/g, "") : null,
      website: g.website ?? null,
      google_rating: g.rating ?? null,
      google_reviews_count: g.user_ratings_total ?? 0,
      opening_hours: hours,
      images_count: 0, main_image: null, payments: "",
      emergency_service: false,
      permanently_closed: g.business_status === "CLOSED_PERMANENTLY",
      active: g.business_status !== "CLOSED_PERMANENTLY",
      is_claimed: false, claimed_by: null,
      internal_rating_avg: null, internal_reviews_count: 0, fb_mentions_count: 0,
      search_text: searchText,
      reviewed_specialty: reviewed,
      is_automotive: true,
      out_of_scope: false,
      audit_confidence: "HIGH",
      audit_reviewed_at: NOW,
      neighborhood,
      created_at: NOW, updated_at: NOW,
    });
    console.log(`  ✓ ${g.name} | ${governorate}/${area} | ⭐${g.rating ?? "-"} (${g.user_ratings_total ?? 0}) | ${spec.entity_type}/${reviewed} | ${phone || "بلا هاتف"}`);
  }

  writeFileSync(resolve(__dirname, "group-a-additions.json"), JSON.stringify(toInsert, null, 2), "utf8");
  console.log(`\nprepared: ${toInsert.length} rows · skipped: ${skipped.length}`);
  for (const s of skipped) console.log(`  ⏭️  ${s}`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — no writes. Re-run with --commit to insert.`); return; }

  // idempotent insert: ignore conflicts on place_id
  let added = 0, failed = 0;
  for (const row of toInsert) {
    const { error } = await supabase.from("workshops").upsert(row, { onConflict: "place_id", ignoreDuplicates: true });
    if (error) { failed++; console.error(`  ❌ ${row.place_id}: ${error.message}`); } else added++;
  }
  const after = await countActive();
  console.log(`\n✅ inserted/ensured: ${added} · failed: ${failed}`);
  console.log(`📊 active garages: ${before} → ${after}  (Δ ${after - before})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
