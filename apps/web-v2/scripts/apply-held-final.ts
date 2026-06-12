/**
 * Final evidence-based decisions for the last 29 held rows.
 * Evidence = our category_raw + Google place types (from enrich-full.json).
 *   • RESTORE (4): Google types = car_repair → real garages (poorly named)
 *   • DEACTIVATE (25): category_raw/types prove non-car (electronics, phone repair,
 *     gym/health, oil factories, contracting, logistics, driving school, courier)
 * Reversible. Completes triage of all 149 NON_CAR rows.
 *
 * Run: npx tsx scripts/apply-held-final.ts --commit
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SKEY) { console.error("❌ need SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

const RESTORE: string[] = [
  "ChIJlYxFvDOfzz8RMc2r5iupbM4", // ورشة إصلاح وصيانة صبحان (google: car_repair)
  "ChIJyYLHbgCFzz8RVpvIVI_8eww", // Kuwait shuwaikh industrial block (car_repair)
  "ChIJa6_LXgCFzz8RmTICdQsO73Q", // Naseer center (car_repair)
  "ChIJOS4ePwCFzz8R0h8lDEON8jM", // Shuwaik (car_repair)
];

const DEACTIVATE: string[] = [
  "ChIJOTrXyH-Qzz8R7_uF41CfwAs", // ورشة باناسونيك (خدمة إصلاح أجهزة)
  "ChIJYzhzarMJ0D8R0j2nuoSdMKE", // السكراب النعايم (electronics_store)
  "ChIJax4-9kuFzz8RFlp-SuvxZVk", // BOSCH (brand store, no auto evidence)
  "ChIJlTPX-vabzz8RlO_8XxrrkzA", // تعليم قيادة السيارات (driving school)
  "ChIJV4R-KpqPzz8R7N1CbGcUM5Q", // TNT (courier/logistics, FTZ)
  "ChIJJfX42RQJzz8Rn9NQU5mW87c", // NEXT STORE (electronics/furniture)
  "ChIJT-bLUMeazz8R2CUoHoC5kfs", // الخبيزي للدراجات النارية (sports accessories)
  "ChIJI8EM3Cyfzz8RSnx0PwBBSUc", // عربي Projects (general_contractor)
  "ChIJgTUYzaWDzz8Ro1WA8Ml5ghs", // Cure Recovery (gym/health)
  "ChIJsX13jioKzz8R5hMAitkjXsk", // قصار لوجي (alt medicine)
  "ChIJJ_kEHbQJ0D8RHSgLwR2Kt_4", // Pakistan krag (electronics_store)
  "ChIJZy3bk0qFzz8R4fYjXMayaoc", // Mobile 2000 (phone store)
  "ChIJwTswZkGTzz8RnbOtp2k2JWo", // صقور صباح (volunteer org)
  "ChIJNYg3waGbzz8RhDz42Mc3ZpI", // AlMailem Garage Equipment (industrial supplier)
  "ChIJ5fh1ZYybzz8RGkK3wkmiHCQ", // AC maintenance (home AC)
  "ChIJ-9dPWrSFzz8RKHth3gtxa_Y", // Movewell Recovery (health/spa)
  "ChIJp8e8WnRWC6wRA8s42NGGc7I", // Gulf Secure Track (computer support)
  "ChIJXYB5_wcBzz8ROA3zNCZGk-k", // Kuwait Lube Oil Company (factory)
  "ChIJYd6HB3qFzz8R5fhY9OrrX2w", // فورسيل (corporate office)
  "ChIJQazxPbCdzz8R1uHAi_6EjNU", // Fixstorekw (phone repair)
  "ChIJbZGG-vDM2j8ROTsEapgraTo", // RFI (logistics)
  "ChIJ4UwV_Uyhzz8RayHehylu1co", // Crony (electronics_store)
  "ChIJeV9bqxCbzz8RZru6SRA63F8", // ستيل يونايتد خراطة معادن (metal factory)
  "ChIJUwvC-JCbzz8Rnus5bMPnizo", // ورشه تصليح الاندلس (mobile phone repair!)
  "ChIJK1CToOEHzz8RbBIGFAMDOWY", // KNLOC lube oil (factory)
];

async function main() {
  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"} · deactivate ${DEACTIVATE.length} · restore ${RESTORE.length}\n`);
  if (!COMMIT) { console.log("🟡 DRY-RUN — re-run with --commit."); return; }
  const NOW = new Date().toISOString();
  let okD = 0, okR = 0, fail = 0;
  for (const pid of DEACTIVATE) {
    const { error } = await supabase.from("workshops").update({ active: false, removal_reason: "non-automotive (manual review, evidence)", removed_at: NOW, updated_at: NOW }).eq("place_id", pid);
    if (error) { fail++; console.error(`  ❌ ${pid}: ${error.message}`); } else okD++;
  }
  for (const pid of RESTORE) {
    const { error } = await supabase.from("workshops").update({ is_automotive: true, updated_at: NOW }).eq("place_id", pid);
    if (error) { fail++; console.error(`  ❌ ${pid}: ${error.message}`); } else okR++;
  }
  const { count } = await supabase.from("workshops").select("place_id", { count: "exact", head: true }).eq("active", true).eq("permanently_closed", false);
  console.log(`✅ deactivated ${okD} · restored ${okR} · failed ${fail}`);
  console.log(`📊 active garages now: ${count}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
