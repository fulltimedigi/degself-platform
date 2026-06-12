/**
 * Apply the SAFE, reversible data fixes the user approved:
 *   1. deactivate the permanently-closed row (active=false, permanently_closed=true)
 *   2. deactivate genuinely non-car rows (active=false) — reversible, keeps row + reason
 *   3. restore mis-flagged automotive rows (is_automotive=true)
 *
 * Conservative classifier: anything uncertain is HELD (no action) and reported.
 * Reversible: deactivation sets active=false + removal_reason + removed_at (no delete).
 *
 * Run: npx tsx scripts/apply-safe-fixes.ts            (dry-run, shows final lists)
 *      npx tsx scripts/apply-safe-fixes.ts --commit
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

// clearly NOT a car business → deactivate
const NONCAR = /ايكيا|ikea|لولو|lulu|هايبر|hyper|مول|\bmall\b|xcite|اكسايت|اكس ?سايت|يوريكا|eureka|true value|سبا|\bspa\b|مطعم|restaurant|cafe|كافيه|صيدلي|pharmac|مستشفى|hospital|فندق|hotel|اثاث|furnitur|تنجيد الاثاث|طاقة الشمس|طاقه الشمسي|الطاقة الشمسية|مولدات|سامسونج|samsung|للالكترونيات|للإلكترونيات/i;
// clearly a VEHICLE business that was mis-flagged → restore is_automotive=true.
// STRONG vehicle signals only (avoids healthcare→"car", Motorola→"motor", RC toy cars).
const AUTO = /كراج|ونش|الونشات|سطحة|سطحه|اطار|إطار|تواير|بنشر|دينمو|قير|سيارات|سيار|لإنقاذ السيارات|car seat|seat work/i;
// disqualifiers — NOT vehicles even if they hit AUTO
const NOT_VEHICLE = /data recovery|استرجاع البيانات|بيانات|computer|كمبيوتر|أجهزة كهربائية|الاجهزة الكهربائية|ثلاجات|غسالات|نشافات|تعليم قياد|الطب الرياضي|sports|healthcare|\bhealth\b|rehab|motorola|\brc\b|toy|بترولي|petroleum|construction|إنشاء|عقار|real estate|بنك|\bbank\b|vape/i;

async function main() {
  const { closedPerm, nonCar } = JSON.parse(readFileSync(resolve(__dirname, "review-issues.json"), "utf8"));

  const deactivate: any[] = [];
  const restore: any[] = [];
  const held: any[] = [];

  // 1. permanently closed
  for (const c of closedPerm) deactivate.push({ pid: c.pid, name: c.name, reason: "permanently_closed (Google)", closed: true });

  // 2/3. classify the 149
  for (const r of nonCar) {
    const n = r.name || "";
    if (NONCAR.test(n)) deactivate.push({ pid: r.pid, name: n, reason: "non-automotive (reviewed)", closed: false });
    else if (AUTO.test(n) && !NOT_VEHICLE.test(n)) restore.push({ pid: r.pid, name: n });
    else held.push({ pid: r.pid, name: n });
  }

  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);
  console.log(`🔴 تعطيل (${deactivate.length}):`);
  for (const d of deactivate) console.log(`   • «${d.name}» — ${d.reason}`);
  console.log(`\n🔧 ترجيع is_automotive=true (${restore.length}):`);
  for (const r of restore) console.log(`   • «${r.name}»`);
  console.log(`\n❓ محجوز بدون إجراء — غامض/مستبعَد (${held.length}):`);
  for (const h of held.slice(0, 40)) console.log(`   • «${h.name}»`);
  if (held.length > 40) console.log(`   … +${held.length - 40}`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — no writes. Re-run with --commit.`); return; }

  const NOW = new Date().toISOString();
  let okD = 0, okR = 0, fail = 0;
  for (const d of deactivate) {
    const patch: any = { active: false, removal_reason: d.reason, removed_at: NOW, updated_at: NOW };
    if (d.closed) patch.permanently_closed = true;
    const { error } = await supabase.from("workshops").update(patch).eq("place_id", d.pid);
    if (error) { fail++; console.error(`  ❌ ${d.pid}: ${error.message}`); } else okD++;
  }
  for (const r of restore) {
    const { error } = await supabase.from("workshops").update({ is_automotive: true, updated_at: NOW }).eq("place_id", r.pid);
    if (error) { fail++; console.error(`  ❌ ${r.pid}: ${error.message}`); } else okR++;
  }
  const { count } = await supabase.from("workshops").select("place_id", { count: "exact", head: true })
    .eq("active", true).eq("permanently_closed", false);
  console.log(`\n✅ deactivated ${okD} · restored ${okR} · failed ${fail}`);
  console.log(`📊 active garages now: ${count}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
