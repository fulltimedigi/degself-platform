/**
 * Apply audit + Google Places enrichment to the workshops table.
 *
 * Three actions, all keyed by place_id (verbatim — case-sensitive):
 *   1. Audit corrections  → reviewed_specialty, is_automotive, out_of_scope,
 *                           audit_confidence, audit_reviewed_at   (from audit-corrections.json)
 *   2. Neighborhood (الحي) → neighborhood                          (from places-enrichment.json)
 *   3. Soft-removal of 45  → active=false, removal_reason, removed_at (from delete-set.json)
 *
 * Never touches the original `specialty`. Removals are SOFT (active=false) — reversible.
 *
 * Prereq: run supabase/migrations/003_audit_columns.sql + 004_neighborhood_and_soft_removal.sql
 * Dry-run (default, NO writes):   npx tsx scripts/apply-places.ts
 * Apply for real:                 APPLY=1 npx tsx scripts/apply-places.ts
 * Needs: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const DRY = process.env.APPLY !== "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), "utf8"));

type Corr = { reviewed_specialty: string | null; is_automotive: boolean; confidence: string; flag: string; current: string; name: string };

function removalReason(enrEntry: any): string {
  if (enrEntry?.error) return enrEntry.error === "INVALID_REQUEST" ? "invalid_place_id" : "not_found";
  if (enrEntry?.business_status === "CLOSED_PERMANENTLY") return "permanently_closed";
  if (enrEntry?.business_status === "CLOSED_TEMPORARILY") return "temporarily_closed";
  return "non_automotive";
}

async function chunked<T>(items: T[], size: number, fn: (item: T) => Promise<any>) {
  let done = 0, failed = 0;
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.all(items.slice(i, i + size).map(fn));
    for (const r of results) (r && r.error ? failed++ : done++);
    process.stdout.write(`\r  ${done}/${items.length} (failed ${failed})`);
  }
  process.stdout.write("\n");
  return { done, failed };
}

async function main() {
  const corrections = load("audit-corrections.json") as Record<string, Corr>;
  const enrichment = load("places-enrichment.json") as Record<string, any>;
  const deleteSet: string[] = load("delete-set.json");
  const deleteLookup = new Set(deleteSet);
  const NOW = new Date().toISOString();

  console.log(`\n${DRY ? "🟡 DRY-RUN (no writes)" : "🔴 APPLY (writing to DB)"} — degself-v2 workshops\n`);

  // ---- derive the numbers we will report (from the source files) ----
  const auditEntries = Object.entries(corrections);
  const nbhdEntries = Object.entries(enrichment).filter(([, v]) => v.neighborhood);
  const removalByReason: Record<string, number> = {};
  for (const pid of deleteSet) {
    const reason = removalReason(enrichment[pid]);
    removalByReason[reason] = (removalByReason[reason] || 0) + 1;
  }
  // kept = active automotive in-scope rows after removals
  const keptSpecialty: Record<string, number> = {};
  let keptWithSpecialty = 0;
  for (const [pid, c] of auditEntries) {
    if (deleteLookup.has(pid)) continue;            // removed → not counted
    if (!c.is_automotive || c.flag === "out_of_scope") continue;
    if (c.reviewed_specialty) {
      keptWithSpecialty++;
      keptSpecialty[c.reviewed_specialty] = (keptSpecialty[c.reviewed_specialty] || 0) + 1;
    }
  }
  const top10 = Object.entries(keptSpecialty).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ---- writes (skipped in dry-run) ----
  if (!DRY) {
    console.log("① audit corrections …");
    await chunked(auditEntries, 25, ([pid, c]) =>
      supabase.from("workshops").update({
        reviewed_specialty: c.is_automotive ? c.reviewed_specialty : null,
        is_automotive: c.is_automotive,
        out_of_scope: c.flag === "out_of_scope",
        audit_confidence: c.confidence,
        audit_reviewed_at: NOW,
      }).eq("place_id", pid).then(({ error }) => ({ error })));

    console.log("② neighborhood (الحي) …");
    await chunked(nbhdEntries, 25, ([pid, v]) =>
      supabase.from("workshops").update({ neighborhood: v.neighborhood })
        .eq("place_id", pid).then(({ error }) => ({ error })));

    console.log("③ soft-removals …");
    await chunked(deleteSet, 25, (pid) =>
      supabase.from("workshops").update({
        active: false,
        removal_reason: removalReason(enrichment[pid]),
        removed_at: NOW,
      }).eq("place_id", pid).then(({ error }) => ({ error })));
  }

  // ---- report ----
  console.log(`\n===== APPLY-PLACES ${DRY ? "DRY-RUN " : ""}SUMMARY =====`);
  console.log(`🗑️  soft-removed (active=false):   ${deleteSet.length}`);
  for (const [r, n] of Object.entries(removalByReason).sort((a, b) => b[1] - a[1]))
    console.log(`      • ${r.padEnd(20)} ${n}`);
  console.log(`🏘️  neighborhood (الحي) set:       ${nbhdEntries.length}`);
  console.log(`🏷️  reviewed_specialty (kept set): ${keptWithSpecialty}`);
  console.log(`✅  audit rows processed:          ${auditEntries.length}`);
  console.log(`📊  remaining active workshops:    ${1798 - deleteSet.length}`);
  console.log(`\nTop 10 specialties (kept, automotive in-scope):`);
  top10.forEach(([s, n], i) => console.log(`   ${String(i + 1).padStart(2)}. ${s.padEnd(28)} ${n}`));

  // ---- live verification against the DB (real run only) ----
  if (!DRY) {
    const q = (f: (b: any) => any) => f(supabase.from("workshops").select("place_id", { count: "exact", head: true }));
    const [{ count: activeNow }, { count: nbhdNow }, { count: nonCar }] = await Promise.all([
      q((b) => b.eq("active", true).eq("permanently_closed", false)),
      q((b) => b.not("neighborhood", "is", null)),
      q((b) => b.eq("is_automotive", false)),
    ]);
    console.log(`\n🔎 DB now → active&open: ${activeNow} · neighborhood set: ${nbhdNow} · is_automotive=false: ${nonCar}`);
  } else {
    console.log(`\n(dry-run — nothing written. Re-run with APPLY=1 after the migration to persist.)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
