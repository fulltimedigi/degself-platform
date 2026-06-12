/**
 * Full Places enrichment for every active row — REPORT ONLY (no DB writes).
 * Captures the deltas we can safely act on:
 *   • phone we can ADD (row has none, Google has one)
 *   • business_status (closed detection)
 *   • opening_hours we can ADD (row has none, Google has them)
 *   • fresh rating / reviews
 *   • neighborhood (الحي) we can ADD
 *
 * Writes scripts/enrich-full.json + prints a summary. A separate apply step
 * does the additive writes; closures/dups are reviewed before any deletion.
 *
 * Run:  npx tsx scripts/enrich-full.ts   (needs GOOGLE_MAPS_API_KEY)
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
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const __dirname = dirname(fileURLToPath(import.meta.url));

const FIELDS = [
  "place_id", "name", "types", "business_status",
  "formatted_phone_number", "international_phone_number",
  "current_opening_hours", "opening_hours",
  "rating", "user_ratings_total", "address_component",
].join(",");

function isKwMobile(p: string | null): boolean {
  if (!p) return false;
  const d = p.replace(/\D/g, "").replace(/^965/, "");
  return /^[569]\d{7}$/.test(d);
}
function neighborhoodOf(g: any): string | null {
  const comps = g.address_components ?? [];
  for (const want of ["neighborhood", "sublocality", "sublocality_level_1"]) {
    const c = comps.find((x: any) => (x.types ?? []).includes(want));
    if (c) return c.long_name;
  }
  return null;
}
async function details(placeId: string) {
  const u = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&language=ar&key=${GKEY}`;
  return (await fetch(u)).json();
}

type Row = { place_id: string; name: string; phone: string | null; phone_intl: string | null; opening_hours: string | null; google_rating: number | null; google_reviews_count: number | null; neighborhood: string | null };
async function fetchRows(): Promise<Row[]> {
  const PAGE = 1000; const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("workshops")
      .select("place_id,name,phone,phone_intl,opening_hours,google_rating,google_reviews_count,neighborhood")
      .eq("active", true).eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as Row[]; all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}

async function main() {
  const rows = await fetchRows();
  console.log(`\n🔎 enriching ${rows.length} active rows…\n`);
  const report: Record<string, any> = {};
  let ok = 0, notFound = 0, errors = 0;
  let phoneAdd = 0, hoursAdd = 0, nbhdAdd = 0, permClosed = 0, tempClosed = 0, ratingChg = 0;

  const CHUNK = 12;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await Promise.all(rows.slice(i, i + CHUNK).map(async (r) => {
      try { return { r, d: await details(r.place_id) }; }
      catch { return { r, d: { status: "FETCH_ERROR" } }; }
    }));
    for (const { r, d } of res) {
      if (d.status === "OVER_QUERY_LIMIT") { console.error("\n⛔ OVER_QUERY_LIMIT — stopping."); writeFileSync(resolve(__dirname, "enrich-full.json"), JSON.stringify(report, null, 0)); process.exit(1); }
      if (d.status !== "OK") {
        if (["NOT_FOUND", "INVALID_REQUEST", "ZERO_RESULTS"].includes(d.status)) notFound++; else errors++;
        report[r.place_id] = { name: r.name, error: d.status };
        continue;
      }
      ok++;
      const g = d.result;
      const gPhoneIntl = g.international_phone_number ?? null;
      const gPhone = g.formatted_phone_number ?? gPhoneIntl ?? null;
      const hadUsable = isKwMobile(r.phone) || isKwMobile(r.phone_intl) || !!(r.phone || r.phone_intl);
      const canAddPhone = !(r.phone || r.phone_intl) && !!gPhone;
      const gHours = (g.current_opening_hours?.weekday_text ?? g.opening_hours?.weekday_text ?? []).join(" | ");
      const canAddHours = !r.opening_hours && !!gHours;
      const nbhd = neighborhoodOf(g);
      const canAddNbhd = !r.neighborhood && !!nbhd;
      const status = g.business_status ?? "OPERATIONAL";
      const ratingChanged = g.rating != null && g.rating !== r.google_rating;

      if (canAddPhone) phoneAdd++;
      if (canAddHours) hoursAdd++;
      if (canAddNbhd) nbhdAdd++;
      if (status === "CLOSED_PERMANENTLY") permClosed++;
      else if (status === "CLOSED_TEMPORARILY") tempClosed++;
      if (ratingChanged) ratingChg++;

      report[r.place_id] = {
        name: r.name,
        business_status: status,
        google_types: (g.types ?? []).filter((t: string) => t !== "point_of_interest" && t !== "establishment"),
        add_phone: canAddPhone ? gPhone : null,
        add_phone_intl: canAddPhone && gPhoneIntl ? gPhoneIntl.replace(/\s/g, "") : null,
        had_usable_phone: hadUsable,
        add_hours: canAddHours ? gHours : null,
        add_neighborhood: canAddNbhd ? nbhd : null,
        rating_old: r.google_rating, rating_new: g.rating ?? null,
        reviews_old: r.google_reviews_count, reviews_new: g.user_ratings_total ?? null,
      };
    }
    process.stdout.write(`\r  ${ok} ok · ${notFound} not-found · ${errors} err · (${i + CHUNK}/${rows.length})`);
  }

  writeFileSync(resolve(__dirname, "enrich-full.json"), JSON.stringify(report, null, 0), "utf8");
  console.log(`\n\n===== ENRICHMENT SUMMARY =====`);
  console.log(`fetched OK:                    ${ok}`);
  console.log(`not found / invalid:           ${notFound}`);
  console.log(`API errors:                    ${errors}`);
  console.log(`📞 phones we can ADD:          ${phoneAdd}`);
  console.log(`🕒 opening-hours we can ADD:   ${hoursAdd}`);
  console.log(`🏘️  neighborhood we can ADD:   ${nbhdAdd}`);
  console.log(`⭐ ratings changed (refresh):  ${ratingChg}`);
  console.log(`🔴 permanently CLOSED:         ${permClosed}   ← review before deactivating`);
  console.log(`🟠 temporarily closed:         ${tempClosed}`);
  console.log(`\nreport: scripts/enrich-full.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
