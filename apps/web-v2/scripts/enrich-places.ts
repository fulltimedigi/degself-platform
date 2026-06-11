/**
 * Google Places enrichment — REVIEW FIRST (does NOT write to the DB).
 * Pulls the authoritative Google data for every place_id (official category,
 * phone, rating, review count, business_status, hours) and writes a report to
 * scripts/places-enrichment.json + prints what it would fix. We review the
 * deltas (missing phones, permanently-closed, category corrections) BEFORE
 * deciding what to persist.
 *
 * Run:   GOOGLE_MAPS_API_KEY=... npx tsx scripts/enrich-places.ts
 *   (or put GOOGLE_MAPS_API_KEY in .env.local — server-only, never NEXT_PUBLIC)
 * Cost:  Place Details (~$17/1000) × ~1798 ≈ $30 one-time; usually covered by
 *        Google's $200/mo free credit. Field mask keeps it minimal.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GKEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GKEY) {
  console.error("❌ Missing GOOGLE_MAPS_API_KEY (env or .env.local).");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const FIELDS = [
  "place_id",
  "name",
  "types",
  "formatted_phone_number",
  "international_phone_number",
  "rating",
  "user_ratings_total",
  "business_status",
  "current_opening_hours",
].join(",");

async function fetchPlaceIds(): Promise<{ place_id: string; name: string; phone: string | null; phone_intl: string | null }[]> {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id,name,phone,phone_intl")
      .eq("active", true)
      .eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return all;
}

async function details(placeId: string) {
  const u = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=${FIELDS}&language=ar&key=${GKEY}`;
  const res = await fetch(u);
  return res.json();
}

const rows = await fetchPlaceIds();
console.log(`🔎 enriching ${rows.length} places…`);
const report: Record<string, any> = {};
let ok = 0,
  notFound = 0,
  errors = 0,
  closed = 0,
  phoneFillable = 0;

const CHUNK = 10;
for (let i = 0; i < rows.length; i += CHUNK) {
  const slice = rows.slice(i, i + CHUNK);
  const res = await Promise.all(
    slice.map(async (r) => {
      try {
        const d = await details(r.place_id);
        return { r, d };
      } catch (e) {
        return { r, d: { status: "FETCH_ERROR" } };
      }
    })
  );
  for (const { r, d } of res) {
    if (d.status === "OK") {
      ok++;
      const g = d.result;
      const hadPhone = !!(r.phone || r.phone_intl);
      if (!hadPhone && (g.international_phone_number || g.formatted_phone_number)) phoneFillable++;
      if (g.business_status && g.business_status !== "OPERATIONAL") closed++;
      report[r.place_id] = {
        name: r.name,
        google_types: g.types ?? [],
        google_phone_intl: g.international_phone_number ?? null,
        google_phone: g.formatted_phone_number ?? null,
        had_phone: hadPhone,
        google_rating: g.rating ?? null,
        google_reviews: g.user_ratings_total ?? null,
        business_status: g.business_status ?? null,
        open_now: g.current_opening_hours?.open_now ?? null,
      };
    } else if (d.status === "NOT_FOUND" || d.status === "INVALID_REQUEST") {
      notFound++;
      report[r.place_id] = { name: r.name, error: d.status };
    } else if (d.status === "OVER_QUERY_LIMIT") {
      console.error("\n⛔ OVER_QUERY_LIMIT — stop and check billing/quota.");
      errors++;
    } else {
      errors++;
      report[r.place_id] = { name: r.name, error: d.status };
    }
  }
  process.stdout.write(`\r  ${ok} ok · ${notFound} not-found · ${errors} err`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "places-enrichment.json");
writeFileSync(out, JSON.stringify(report, null, 0), "utf8");
console.log(`\n\n=== SUMMARY ===`);
console.log(`OK: ${ok} · not-found: ${notFound} · errors: ${errors}`);
console.log(`phones we can fill (currently missing): ${phoneFillable}`);
console.log(`business_status NOT operational (stale/closed!): ${closed}`);
console.log(`report written: ${out}`);
console.log(`\nReview the report, then we decide which fields to persist (phones, closed flags, category).`);
