/**
 * Add a single missing garage reported by a user: «كراج كاردف تويوتا و لكزس».
 * Mirrors add-group-a.ts: pulls Place Details, inherits governorate/area from the
 * nearest existing DB row, builds search_text, inserts one active row.
 *
 * Run:  npx tsx scripts/add-cardiff.ts            (dry-run report; NO writes)
 *       npx tsx scripts/add-cardiff.ts --commit   (performs the insert)
 * Needs: GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY in .env.local
 * ⚠️ place_id is case-sensitive — never lowercase it.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GKEY || !SKEY) { console.error("❌ need GOOGLE_MAPS_API_KEY + SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

const PLACE_ID = "ChIJD2nyZXCbzz8R2w3H4Cx4sEY";
const SPECIALTY = "صيانة عامة";
const ENTITY_TYPE = "كراج";

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

async function main() {
  const { data: existing } = await supabase.from("workshops").select("place_id").eq("place_id", PLACE_ID);
  if (existing && existing.length) { console.log("موجود بالفعل — لا حاجة للإضافة."); return; }

  const { data: db } = await supabase.from("workshops").select("place_id,name,lat,lng,area,governorate").not("lat", "is", null);
  const coords = (db ?? []) as { name: string; lat: number; lng: number; area: string | null; governorate: string | null }[];

  const d = await details(PLACE_ID);
  if (d.status !== "OK") { console.error("❌ Details:", d.status); process.exit(1); }
  const g = d.result;
  const loc = g.geometry.location;

  let near: any = null, nearD = Infinity;
  for (const r of coords) { const dist = haversine(loc.lat, loc.lng, r.lat, r.lng); if (dist < nearD) { nearD = dist; near = r; } }
  console.log(`أقرب صف موجود: «${near?.name}» على بُعد ${Math.round(nearD)}م → ${near?.governorate}/${near?.area}`);
  // Authoritative dedup is place_id (already checked above). A nearby row in an
  // industrial block is a different establishment (verified: distinct place_id +
  // name), so proximity is a WARNING here, not a stop.
  if (nearD < 40) console.log(`ℹ️ ملاحظة: جار قريب (${Math.round(nearD)}م) لكن place_id مختلف — منشأة مستقلة، نُكمل.`);

  const NOW = new Date().toISOString();
  const phoneIntl = g.international_phone_number ?? null;
  const phone = g.formatted_phone_number ?? phoneIntl ?? "";
  const hours = (g.current_opening_hours?.weekday_text ?? g.opening_hours?.weekday_text ?? []).join(" | ");
  const area = near?.area ?? null;
  const governorate = near?.governorate ?? null;
  const neighborhood = neighborhoodOf(g) ?? area;
  const searchText = norm([g.name, SPECIALTY, g.formatted_address, governorate, area].filter(Boolean).join(" "));

  const row = {
    place_id: PLACE_ID,
    name: g.name,
    specialty: SPECIALTY,
    entity_type: ENTITY_TYPE,
    service_mode: "fixed",
    category_raw: "مركز خدمة سيارات",
    specialty_hints: [SPECIALTY],
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
    reviewed_specialty: SPECIALTY,
    is_automotive: true,
    out_of_scope: false,
    audit_confidence: "HIGH",
    audit_reviewed_at: NOW,
    neighborhood,
    created_at: NOW, updated_at: NOW,
  };

  console.log("\nالصف الجاهز للإدراج:");
  console.log(JSON.stringify({ name: row.name, specialty: row.specialty, entity_type: row.entity_type, governorate: row.governorate, area: row.area, neighborhood: row.neighborhood, phone: row.phone, website: row.website, rating: row.google_rating, reviews: row.google_reviews_count, hours: row.opening_hours, search_text: row.search_text }, null, 2));

  if (!COMMIT) { console.log("\n🟡 DRY-RUN — لا كتابة. أعد التشغيل بـ --commit للإدراج."); return; }

  const { error } = await supabase.from("workshops").upsert(row, { onConflict: "place_id", ignoreDuplicates: true });
  if (error) { console.error("❌ insert:", error.message); process.exit(1); }
  console.log("\n✅ تمّت الإضافة.");
}

main().catch((e) => { console.error(e); process.exit(1); });
