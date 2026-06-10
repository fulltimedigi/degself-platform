/**
 * VALIDATION ONLY — does NOT write to the DB.
 * Scans workshop NAMES for car-brand keywords grouped by origin, to see how many
 * garages we can confidently classify by car make before deciding on a filter.
 *
 * Run: npx tsx scripts/validate-car-make.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

// Per origin: Arabic brand patterns + English brand patterns (case-insensitive).
// Deliberately conservative on collisions (e.g. dropped "بنز" → collides with بنزين).
const ORIGINS = [
  {
    key: "ألماني",
    ar: /مرسيدس|بنز |بي ام|بي إم|بمو|اودي|أودي|فولكس|بورش|اوبل|أوبل|ميني كوبر/,
    en: /mercedes|benz|\bbmw\b|audi|volkswagen|\bvw\b|porsche|opel|mini\s?cooper/i,
  },
  {
    key: "ياباني",
    ar: /تويوتا|نيسان|هوندا|ميتسوبيشي|ميتسوبيتشي|مازدا|مازده|سوزوكي|لكزس|لكسس|انفينيتي|إنفينيتي|سوبارو|ايسوزو|دايهاتسو/,
    en: /toyota|nissan|honda|mitsubishi|mazda|suzuki|lexus|infiniti|subaru|isuzu|daihatsu/i,
  },
  {
    key: "كوري",
    ar: /هيونداي|هونداي|هيونداي|كيا|جينيسيس|سانج يونج|سانغ يونغ/,
    en: /hyundai|\bkia\b|genesis|ssangyong/i,
  },
  {
    key: "أمريكي",
    ar: /فورد|شيفروليه|شيفي|شفر|جمس|جي ام سي|دودج|كرايسلر|جيب|كاديلاك|لينكولن|همر/,
    en: /\bford\b|chevrolet|chevy|\bgmc\b|dodge|chrysler|jeep|cadillac|lincoln|hummer/i,
  },
  {
    key: "صيني",
    ar: /شيري|جيلي|هافال|ام جي|شانجان|تشانجان|بي واي دي|جاك|بايك|جريت وول/,
    en: /chery|geely|haval|\bmg\b|changan|\bbyd\b|\bjac\b|baic|great\s?wall/i,
  },
] as const;

type Row = { name: string };

async function fetchAll(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("name")
      .eq("active", true)
      .eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

async function main() {
  const rows = await fetchAll();
  console.log(`فحص ${rows.length} منشأة (بدون أي تعديل)\n`);

  const matchedAny = new Set<string>();
  let multiOrigin = 0;

  for (const o of ORIGINS) {
    const matches = rows.filter((w) => o.ar.test(w.name) || o.en.test(w.name));
    matches.forEach((m) => {
      if (matchedAny.has(m.name)) multiOrigin++;
      matchedAny.add(m.name);
    });
    console.log("══════════════════════════════════════════");
    console.log(`▶ ${o.key}: ${matches.length} منشأة`);
    matches.slice(0, 8).forEach((w) => console.log(`    • ${w.name.slice(0, 52)}`));
    console.log("");
  }

  console.log("══════════════════════════════════════════");
  console.log(
    `الخلاصة: ${matchedAny.size} منشأة فريدة نقدر نعرف نوع سيارتها (${(
      (matchedAny.size / rows.length) *
      100
    ).toFixed(1)}% من الإجمالي). تطابقات متعددة المنشأ: ${multiOrigin}`
  );
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
