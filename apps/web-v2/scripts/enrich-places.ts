/**
 * Google Places enrichment — REVIEW FIRST (does NOT write to the DB).
 * Pulls authoritative Google data for every place_id and writes a report to
 * scripts/places-enrichment.json + prints a summary. We review the deltas before
 * persisting anything (a separate apply-places.ts will do the DB writes).
 *
 * Run:   npx tsx scripts/enrich-places.ts   (needs GOOGLE_MAPS_API_KEY in .env.local)
 * Cost:  Place Details (Basic+Contact+Atmosphere) ≈ $30 one-time for ~1798;
 *        usually covered by Google's $200/mo free credit. Field mask kept tight.
 *
 * ⚠️ place_id is case-sensitive — never lowercase it.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GKEY) {
  console.error("❌ Missing GOOGLE_MAPS_API_KEY (env or .env.local). Enable 'Places API' for the key.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const __dirname = dirname(fileURLToPath(import.meta.url));

// Basic + Contact + Atmosphere only (controls cost).
const FIELDS = [
  // Basic
  "place_id", "name", "types", "business_status", "vicinity", "address_component",
  // Contact
  "formatted_phone_number", "international_phone_number", "current_opening_hours",
  // Atmosphere
  "rating", "user_ratings_total",
].join(",");

// Google place types that confirm an automotive business / clearly non-automotive.
const AUTO_GTYPES = new Set(["car_repair", "car_dealer", "car_wash"]);
const NONCAR_GTYPES = new Set([
  "electronics_store", "furniture_store", "supermarket", "home_goods_store",
  "shopping_mall", "department_store", "hospital", "doctor", "spa", "restaurant",
  "cafe", "lodging", "school", "gym", "clothing_store", "hardware_store",
  "convenience_store", "moving_company", "general_contractor", "real_estate_agency",
]);

// our prior audit verdict (is_automotive) for disagreement detection
const corrections = JSON.parse(
  readFileSync(resolve(__dirname, "audit-corrections.json"), "utf8")
) as Record<string, { is_automotive: boolean; reviewed_specialty: string | null; name: string }>;

type Row = { place_id: string; name: string; phone: string | null; phone_intl: string | null; area: string | null };
async function fetchRows(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id,name,phone,phone_intl,area")
      .eq("active", true).eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as Row[]));
    if ((data ?? []).length < PAGE) break;
  }
  return all;
}

function neighborhood(g: any): string | null {
  const comps = g.address_components ?? [];
  for (const want of ["neighborhood", "sublocality", "sublocality_level_1", "administrative_area_level_2"]) {
    const c = comps.find((x: any) => (x.types ?? []).includes(want));
    if (c) return c.long_name;
  }
  return g.vicinity ?? null;
}
function googleAuto(types: string[]): boolean | null {
  if (types.some((t) => AUTO_GTYPES.has(t))) return true;
  if (types.some((t) => NONCAR_GTYPES.has(t))) return false;
  return null; // generic (store/point_of_interest) — undetermined
}

async function details(placeId: string) {
  const u = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=${FIELDS}&language=ar&key=${GKEY}`;
  return (await fetch(u)).json();
}

const rows = await fetchRows();
console.log(`🔎 enriching ${rows.length} places…`);
const report: Record<string, any> = {};
let ok = 0, notFound = 0, errors = 0;
let phoneFillable = 0, permClosed = 0, tempClosed = 0, nbhdFound = 0;
let autoDisagree = 0; // Google says non-car but we kept it (or vice versa)

const CHUNK = 10;
for (let i = 0; i < rows.length; i += CHUNK) {
  const res = await Promise.all(
    rows.slice(i, i + CHUNK).map(async (r) => {
      try { return { r, d: await details(r.place_id) }; }
      catch { return { r, d: { status: "FETCH_ERROR" } }; }
    })
  );
  for (const { r, d } of res) {
    if (d.status === "OK") {
      ok++;
      const g = d.result;
      const types: string[] = g.types ?? [];
      const hadPhone = !!(r.phone || r.phone_intl);
      const gPhone = g.international_phone_number ?? g.formatted_phone_number ?? null;
      const nbhd = neighborhood(g);
      const gAuto = googleAuto(types);
      const ourAuto = corrections[r.place_id]?.is_automotive ?? true;
      if (!hadPhone && gPhone) phoneFillable++;
      if (g.business_status === "CLOSED_PERMANENTLY") permClosed++;
      else if (g.business_status === "CLOSED_TEMPORARILY") tempClosed++;
      if (nbhd) nbhdFound++;
      if (gAuto === false && ourAuto === true) autoDisagree++;
      report[r.place_id] = {
        name: r.name,
        google_types: types,
        google_is_automotive: gAuto,
        our_is_automotive: ourAuto,
        google_phone_intl: gPhone,
        had_phone: hadPhone,
        google_rating: g.rating ?? null,
        google_reviews: g.user_ratings_total ?? null,
        business_status: g.business_status ?? null,
        open_now: g.current_opening_hours?.open_now ?? null,
        neighborhood: nbhd,
        our_area: r.area,
      };
    } else if (["NOT_FOUND", "INVALID_REQUEST", "ZERO_RESULTS"].includes(d.status)) {
      notFound++; report[r.place_id] = { name: r.name, error: d.status };
    } else if (d.status === "OVER_QUERY_LIMIT") {
      console.error("\n⛔ OVER_QUERY_LIMIT — stopping; check billing/quota."); errors++;
    } else {
      errors++; report[r.place_id] = { name: r.name, error: d.status };
    }
  }
  process.stdout.write(`\r  ${ok} ok · ${notFound} not-found · ${errors} err`);
}

writeFileSync(resolve(__dirname, "places-enrichment.json"), JSON.stringify(report, null, 0), "utf8");
console.log(`\n\n===== ENRICHMENT SUMMARY =====`);
console.log(`fetched OK:                       ${ok}`);
console.log(`not found / invalid place_id:     ${notFound}`);
console.log(`API errors:                       ${errors}`);
console.log(`📞 phones we can ADD (had none):  ${phoneFillable}`);
console.log(`🔴 permanently CLOSED (Google):   ${permClosed}`);
console.log(`🟠 temporarily closed:            ${tempClosed}`);
console.log(`🏘️  neighborhood (الحي) found:     ${nbhdFound}`);
console.log(`⚠️  Google says NON-car but we kept it: ${autoDisagree}  (new mismatches to review)`);
console.log(`\nreport: scripts/places-enrichment.json — review, then we run apply-places.ts.`);
