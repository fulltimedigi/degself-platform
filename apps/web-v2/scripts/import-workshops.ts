/**
 * One-time import of webapp/client/public/data/workshops.json (1801 records)
 * into the Supabase `workshops` table.
 *
 * Run:  npx tsx scripts/import-workshops.ts
 * Needs: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// workshops.json lives in v1 — single source of truth (../../../ = repo root)
const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../../../webapp/client/public/data/workshops.json");

type Raw = Record<string, unknown>;
const raw = JSON.parse(readFileSync(JSON_PATH, "utf8")) as Raw[];
console.log(`📦 Loaded ${raw.length} records from workshops.json`);

// Map JSON fields → DB columns (note the renamed fields)
const allRows = raw.map((r) => ({
  place_id: r.place_id, // ⚠️ never lowercase — case-sensitive Google Place ID
  name: r.name,
  specialty: r.specialty,
  entity_type: r.entity_type,
  service_mode: r.service_mode ?? "fixed",
  category_raw: r.category_raw ?? null,
  specialty_hints: r.specialty_hints ?? [],
  area: r.area ?? null,
  governorate: r.governorate ?? null,
  address: r.address ?? null,
  street: r.street ?? null,
  lat: r.latitude ?? null, // renamed: latitude → lat
  lng: r.longitude ?? null, // renamed: longitude → lng
  phone: r.phone ?? null,
  phone_intl: r.phone_intl ?? null,
  website: r.website ?? null,
  google_rating: r.rating ?? null, // renamed: rating → google_rating
  google_reviews_count: r.reviews_count ?? null, // renamed: reviews_count → google_reviews_count
  opening_hours: r.opening_hours ?? null,
  images_count: r.images_count ?? null,
  main_image: (r.main_image as string) || null,
  payments: r.payments ?? null,
  emergency_service: r.emergency_service ?? false,
  permanently_closed: r.permanently_closed ?? false,
  active: r.active ?? true,
}));

// Validation: place_id must be a non-empty string of at least 20 chars.
// (Google Place IDs are ~27 chars; kept in ORIGINAL case — never lowercased.)
// This should never trigger given our clean data, but it's a safety net.
const rows: typeof allRows = [];
let skipped = 0;
for (const row of allRows) {
  const pid = row.place_id;
  if (typeof pid !== "string" || pid.trim().length < 20) {
    skipped++;
    console.warn(
      `⚠️  Skipped row with invalid place_id ${JSON.stringify(pid)} (name: ${row.name ?? "?"})`
    );
    continue;
  }
  rows.push(row);
}
console.log(`✅ ${rows.length} valid rows to import, ${skipped} skipped.`);

async function main() {
const CHUNK = 500;
let done = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from("workshops")
    .upsert(batch, { onConflict: "place_id" });
  if (error) {
    console.error(`❌ Batch starting at ${i} failed:`, error.message);
    process.exit(1);
  }
  done += batch.length;
  console.log(`   upserted ${done}/${rows.length}`);
}

const { count, error } = await supabase
  .from("workshops")
  .select("*", { count: "exact", head: true });
if (error) {
  console.error("❌ Count check failed:", error.message);
  process.exit(1);
}
console.log(
  `\n✅ تم استيراد ${rows.length} ورشة بنجاح (تم تجاهل ${skipped}).` +
    `\n   workshops table now has ${count} rows (expected 1801).`
);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e);
  process.exit(1);
});
