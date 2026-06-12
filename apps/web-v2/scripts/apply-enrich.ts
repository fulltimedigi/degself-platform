/**
 * Apply ADDITIVE enrichment from enrich-full.json. Non-destructive:
 *   • fills phone / opening_hours / neighborhood ONLY where the row was empty
 *   • refreshes google_rating + google_reviews_count to current values
 *   • NEVER touches specialty / reviewed_specialty / name / area
 *   • does NOT deactivate anything (closures are handled in the review step)
 * Idempotent — re-running sets identical values.
 *
 * Run: npx tsx scripts/apply-enrich.ts            (dry-run)
 *      npx tsx scripts/apply-enrich.ts --commit   (writes)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SKEY) { console.error("❌ need SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const report = JSON.parse(readFileSync(resolve(__dirname, "enrich-full.json"), "utf8")) as Record<string, any>;
  const NOW = new Date().toISOString();
  const updates: { pid: string; patch: any; kinds: string[] }[] = [];

  for (const [pid, r] of Object.entries(report)) {
    if (r.error) continue;
    const patch: any = {}; const kinds: string[] = [];
    if (r.add_phone) { patch.phone = r.add_phone; kinds.push("phone"); }
    if (r.add_phone_intl) patch.phone_intl = r.add_phone_intl;
    if (r.add_hours) { patch.opening_hours = r.add_hours; kinds.push("hours"); }
    if (r.add_neighborhood) { patch.neighborhood = r.add_neighborhood; kinds.push("nbhd"); }
    if (r.rating_new != null && r.rating_new !== r.rating_old) { patch.google_rating = r.rating_new; kinds.push("rating"); }
    if (r.reviews_new != null && r.reviews_new !== r.reviews_old) { patch.google_reviews_count = r.reviews_new; kinds.push("reviews"); }
    if (Object.keys(patch).length) { patch.updated_at = NOW; updates.push({ pid, patch, kinds }); }
  }

  const tally: Record<string, number> = {};
  for (const u of updates) for (const k of u.kinds) tally[k] = (tally[k] ?? 0) + 1;
  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"} · rows to update: ${updates.length}`);
  console.log(`  ${Object.entries(tally).map(([k, v]) => `${k}:${v}`).join("  ")}`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — no writes. Re-run with --commit.`); return; }

  let done = 0, failed = 0;
  const CHUNK = 25;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const res = await Promise.all(updates.slice(i, i + CHUNK).map((u) =>
      supabase.from("workshops").update(u.patch).eq("place_id", u.pid).then(({ error }) => (error ? { error, pid: u.pid } : null))
    ));
    for (const r of res) { if (r) { failed++; console.error(`  ❌ ${r.pid}: ${r.error.message}`); } else done++; }
    process.stdout.write(`\r  updated ${done}/${updates.length} (failed ${failed})`);
  }
  console.log(`\n✅ updated ${done}, failed ${failed}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
