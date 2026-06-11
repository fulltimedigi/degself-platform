/**
 * Apply the data-accuracy audit to the workshops table (NON-destructive).
 * Reads scripts/audit-corrections.json and fills the audit columns added by
 * migration 003 — it never touches the original `specialty`.
 *
 * Prereq: run supabase/migrations/003_audit_columns.sql first.
 * Run:    npx tsx scripts/apply-audit.ts
 * Needs:  .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

type Corr = {
  reviewed_specialty: string | null;
  is_automotive: boolean;
  confidence: string;
  flag: string;
  current: string;
  name: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const corrections = JSON.parse(
  readFileSync(resolve(__dirname, "audit-corrections.json"), "utf8")
) as Record<string, Corr>;

const NOW = new Date().toISOString();
const entries = Object.entries(corrections);
console.log(`📋 ${entries.length} records to apply`);

let done = 0;
let failed = 0;
const CHUNK = 25;
for (let i = 0; i < entries.length; i += CHUNK) {
  const slice = entries.slice(i, i + CHUNK);
  const results = await Promise.all(
    slice.map(([placeId, c]) =>
      supabase
        .from("workshops")
        .update({
          reviewed_specialty: c.is_automotive ? c.reviewed_specialty : null,
          is_automotive: c.is_automotive,
          out_of_scope: c.flag === "out_of_scope",
          audit_confidence: c.confidence,
          audit_reviewed_at: NOW,
        })
        .eq("place_id", placeId) // ⚠️ place_id verbatim — case-sensitive
        .then(({ error }) => (error ? { error, placeId } : null))
    )
  );
  for (const r of results) {
    if (r) {
      failed++;
      console.error(`❌ ${r.placeId}: ${r.error.message}`);
    } else done++;
  }
  process.stdout.write(`\r  applied ${done}/${entries.length} (failed ${failed})`);
}
console.log(`\n✅ done: ${done} updated, ${failed} failed.`);

// quick verification
const { count: nonCar } = await supabase
  .from("workshops")
  .select("place_id", { count: "exact", head: true })
  .eq("is_automotive", false);
console.log(`   is_automotive=false: ${nonCar}`);
