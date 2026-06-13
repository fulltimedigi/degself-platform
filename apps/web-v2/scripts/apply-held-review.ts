/**
 * Manual per-item decisions for the 106 HELD rows (reviewed by hand, not regex).
 *   • DEACTIVATE (66): genuinely non-car — reversible (active=false + reason + removed_at)
 *   • RESTORE (11):    genuinely automotive mis-flagged — is_automotive=true
 *   • (29 left untouched: truly ambiguous, need the owner's eyes)
 *
 * Run: npx tsx scripts/apply-held-review.ts            (dry-run)
 *      npx tsx scripts/apply-held-review.ts --commit
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SKEY) { console.error("❌ need SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

// genuinely NON-car → deactivate (reversible)
const DEACTIVATE: string[] = [
  "ChIJE7kjtt-dzz8RWhDcKYFo-qA", // Britco & Bridco comms
  "ChIJJS_Xje6azz8RJN_rASOHwRM", // مركز النخيل النسيجي (textile)
  "ChIJdXpBaIWazz8RLi-pRkDbtEY", // ميداس - الري (furniture)
  "ChIJB_MjZpePzz8Rs4EabFEWUE8", // Alghanim Engineering (home AC/elevators)
  "ChIJs8TrclOdzz8RF7gJpbEvsx8", // FIXITQ8 (phone repair)
  "ChIJ20uMqUuFzz8RlUz124F6PYQ", // Ali Abdulwahab Al Mutawa Commercial
  "ChIJozOvneWezz8RvGI1A7fBRyk", // Trolley (grocery)
  "ChIJjWJ8FaUAzz8RnyZNC8jsBPo", // Weatherford petroleum
  "ChIJBQavbpN1zz8RsgMLx9arEng", // Q8Vapes
  "ChIJP3_jLBsJzz8ROgHY1oPkC9E", // SESC sports medicine
  "ChIJ7051L-udzz8RzXXta5gxg0k", // A2Z gaming computer
  "ChIJyR_0FqKPzz8RvzR6HXvfNCA", // HOT Engineering & Construction
  "ChIJzapykEqbzz8RZsrwoaORhjY", // Kuwait Computer Repair on Call
  "ChIJ1yI0S10Gzz8RAD9R70djbZo", // Al Masiya Computers
  "ChIJbVWlhEqFzz8R0QKAcIDFATE", // alpha store (Apple service)
  "ChIJy76GSgObzz8R9Ezucv-bZqc", // نور الكويت كمبيوتر
  "ChIJHaaUm6Odzz8Ru4QtqTmPKv4", // FSHN Healthcare
  "ChIJM5MIGJCazz8RDmsRAoJNX2o", // ناصر الساير - Canon
  "ChIJaWfvAoqZzz8RZywFCxFvVHU", // PROPRINT
  "ChIJl_5Hkoqczz8RLUMVNLVW_Ic", // العريمان كشف الذهب
  "ChIJ57upPpeazz8R4elEKKeCvOs", // Alhasawi HQ
  "ChIJeQgII7Cbzz8R9SfKMTpWZYM", // AL-RABIA appliance repair
  "ChIJkdq6W5eczz8RJCx6RDqyIGw", // Micron Data Recovery
  "ChIJWd1_JPmVzj8R-aiPlJHPO1s", // ACE Hardware
  "ChIJBdpjyuKdzz8Rj0yD2uFjeyk", // ستائر المنار
  "ChIJoTgniZmczz8RJFL6F5QehzM", // Kuwait Data Recovery
  "ChIJpbPaNQCdzz8RGQu74TOzp2U", // كاميرات الوفاق
  "ChIJG_fGzTKazz8RmjYY5IfQeus", // German Group metal detectors
  "ChIJVc-OD0uFzz8RfEWB8pu7HpI", // الخنيني تجارة ومقاولات
  "ChIJc2K8wnCFzz8RHc9MO4VDfFg", // JUNAH Sunglasses
  "ChIJT5l_jr2dzz8RM5ilBmBqt0Q", // ستائر وتنجيد البطل (home)
  "ChIJD5McALedzz8RacSrfL0_CVE", // جامبو كمبيوتر
  "ChIJrakRmzafzz8R6dOm5QC9U2g", // الحساوي تبريد وتدفئة
  "ChIJzZa-MrmRzz8RJeMCmPeVU1Q", // IT PARASOL computer
  "ChIJD0tpFvmdzz8RI5iQz_IMiPc", // توب سكورتي كاميرات
  "ChIJkyIfrKZXzj8R282rU7S5Nzo", // صباح الاحمد السكنية (housing)
  "ChIJcTH-rAcJzz8R0lLryyJh-7M", // Cloud Vape
  "ChIJCS19hU0Hzz8RecuoPcrYY1g", // ترولي (grocery)
  "ChIJo4OfeNubzz8RzrwJiMMgfkY", // Arduino electronics
  "ChIJLWnYY5aczz8R-IG3BVesJAk", // Gold Star barcode
  "ChIJn5uEgYAJzz8RKOTpet8QOpA", // كمبيوتر الفنطاس
  "ChIJH8_89iKFzz8RcHf12NgNxY0", // beach Public Parking
  "ChIJcVz3BNbhxD8RCsaOlTk0qHw", // مزرعة النويران (farm)
  "ChIJQ5UO3Yp24iIRCBOgga75Q-c", // جيسكو appliance/AC repair
  "ChIJG2quk3Ohzz8RZ9nJJ5KJYEE", // فاست سيرفس appliance repair
  "ChIJj8mMQgCbzz8R9OuLH0LSQcM", // Star Computer
  "ChIJ5xfeP2LPzz8RwoTSzbMxG_U", // West Kuwait Mega Complex (KOC)
  "ChIJo2m7f-aFzz8Rt787lZ4qc3Q", // Bosch Power Tools
  "ChIJSyBxhjWVzj8RPJhPAlU-2Xs", // مخفر شرطة الزور (police)
  "ChIJKcHsg5iPzz8RW3M6pNfOlbA", // AIEE Motorola
  "ChIJt5TcZzOFzz8Ri31-681RlZw", // Zajil Datacentre
  "ChIJfx95MCP3zz8RT8vKJnpKopU", // تنجيد كنب قنفات (home)
  "ChIJqf2YOhKPzz8RLF7IHmVpy-A", // Rc car zone (toys)
  "ChIJ9c32Inadzz8RcRTMgSefmgQ", // تصليح ايفون (iphone)
  "ChIJmagy2ASSzz8RvALdn9JM1gA", // Al Hasawi Industrial (refrigeration)
  "ChIJYeUBBQAHzz8Rnnseqkl54fs", // Next Oil Solutions (oilfield)
  "ChIJHy0lmEqFzz8Ru_bisJ_4ynE", // The Bedroom Intercoil (mattress)
  "ChIJpc7nRQAHzz8Rp7I64LZRDcU", // Warba Electrical contracting
  "ChIJD9Mgb_aVzj8R1xH59tu8S-o", // Fantasy World Toys
  "ChIJA2f_EACFzz8RJGGEHehFJm4", // Modayan Elevators
  "ChIJVTJHuAJhzj8RmLh_FW0Oesc", // دوار دسمان (roundabout)
  "ChIJJeZkQ0mFzz8RrNB835YfV4w", // Isotech Insulation
  "ChIJH3eGyBULzz8R6-GH0CQKFxs", // Marafie IT Services
  "ChIJSYKaIgCFzz8R-MHMoAvas94", // صناعية خيران (area)
  "ChIJccFHZwCFzz8R0a88fHT3GdM", // NASR AL-OMAR cycle & toys
  "ChIJT5WBOqWFzz8RSxgnUAcfPpk", // Metaronik (electronics)
];

// genuinely AUTOMOTIVE mis-flagged → restore is_automotive=true
const RESTORE: string[] = [
  "ChIJxUMD5Et3zz8RqtL0621jwFI", // MAD Recovery (vehicle recovery)
  "ChIJxzXIyYmRzz8R0Ixle2CnwTU", // City Group (automotive group)
  "ChIJCbYe8q2bzz8RKfZQHOKbIJg", // Diamond protection (PPF)
  "ChIJ-StxRuiEzz8RGHmbQuXmWLk", // Liqui Moly (car oil)
  "ChIJafb-pAibzz8RGdmH2-5kDds", // بطاريات موتركرفت (car batteries)
  "ChIJaePyUDqbzz8RyMmu4Uog9tA", // الأندلس قطع غيار
  "ChIJIzE5al-bzz8Rwo4xlHqK4Mk", // Legend PPF
  "ChIJCWsTotebzz8Re5JMWPVN_lY", // تلبيس كشنات (car seat covers)
  "ChIJk6KBYACZzz8RBZGSZmpY8Lo", // Battery's & Axle shop
  "ChIJ3QoRNmmbzz8Rz9INm256q-0", // كرين سحب تريلات (towing)
  "ChIJ2ZzT14iFzz8RrASsAPL0zkE", // FUCHS Lubricants (car oil)
];

async function main() {
  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"} · deactivate ${DEACTIVATE.length} · restore ${RESTORE.length}\n`);
  if (!COMMIT) { console.log("🟡 DRY-RUN — re-run with --commit."); return; }
  const NOW = new Date().toISOString();
  let okD = 0, okR = 0, fail = 0;
  for (const pid of DEACTIVATE) {
    const { error } = await supabase.from("workshops").update({ active: false, removal_reason: "non-automotive (manual review)", removed_at: NOW, updated_at: NOW }).eq("place_id", pid);
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
