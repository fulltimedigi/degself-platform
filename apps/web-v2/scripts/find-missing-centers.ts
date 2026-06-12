/**
 * DIAGNOSTIC ONLY — no Google, no writes, no additions.
 * Checks the DB (active, not-permanently-closed rows) for the presence of the
 * big Kuwait car-service centers / authorized dealers. Pulls every name once,
 * matches locally (cheaper + fuzzier than N queries), prints a table:
 *   target | FOUND/MISSING | (if found) how many matches + sample names
 *
 * Run: npx tsx scripts/find-missing-centers.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

/**
 * Each target: a label + the substrings (Arabic & English) that, if any appears
 * in a workshop name, count as a match. Lowercased + Arabic-normalized at match.
 */
type Target = { label: string; needles: string[] };

const TARGETS: Target[] = [
  // ── الوكلاء الكبار (authorized dealers / their service arms) ──
  { label: "الساير (تويوتا/لكزس)", needles: ["الساير", "al sayer", "alsayer", "sayer"] },
  { label: "البابطين (نيسان/رينو/انفينيتي)", needles: ["البابطين", "babtain", "al babtain"] },
  { label: "يوسف الغانم (شفروليه/GMC/كاديلاك)", needles: ["الغانم", "alghanim", "al ghanim", "ghanim"] },
  { label: "علي الغانم وأولاده (BMW)", needles: ["علي الغانم", "ali alghanim", "ali al ghanim"] },
  { label: "المُلّا (ميتسوبيشي/كيا)", needles: ["الملا", "al mulla", "almulla", "mulla"] },
  { label: "الشايع والصقر (هيونداي)", needles: ["الشايع والصقر", "shaya", "al sagar", "alsagar", "صقر"] },
  { label: "بهبهاني (أودي/بورش/فولكس)", needles: ["بهبهاني", "behbehani"] },
  { label: "KAICO (أودي/بورش)", needles: ["kaico", "kuwait automotive"] },
  { label: "City Group / مرسيدس", needles: ["city group", "سيتي جروب", "مرسيدس", "mercedes"] },
  { label: "المطوع (هوندا)", needles: ["المطوع", "al mutawa", "mutawa"] },
  { label: "العيسى (Ford؟)", needles: ["العيسى", "al eisa", "aleisa"] },
  { label: "الجابر", needles: ["الجابر", "al jaber", "aljaber"] },
  { label: "النفيسي", needles: ["النفيسي", "al nafisi", "nafisi"] },
  { label: "الزياني (جاكوار/لاندروفر)", needles: ["الزياني", "zayani", "al zayani"] },

  // ── سلاسل الصيانة المستقلة متعددة العلامات ──
  { label: "Auto One", needles: ["auto one", "autoone", "اوتو ون", "أوتو ون"] },
  { label: "أوتو لاب (Auto Lab)", needles: ["auto lab", "autolab", "اوتو لاب", "أوتو لاب"] },
  { label: "AutoMAK", needles: ["automak", "auto mak", "اوتوماك", "أوتوماك"] },
  { label: "Bumper to Bumper", needles: ["bumper", "بمبر"] },
  { label: "Speedex / سبيدكس", needles: ["speedex", "سبيدكس"] },
  { label: "Galaxy / المجرة", needles: ["galaxy", "المجرة", "مجرة"] },
  { label: "Trust / الثقة", needles: ["trust auto", "trust car"] },
  { label: "Q8 Car / كويت", needles: ["q8 car", "q8car", "q8 auto"] },
  { label: "Midas", needles: ["midas", "مايدس"] },
  { label: "Bosch Car Service", needles: ["bosch", "بوش"] },
  { label: "Magic / ماجيك", needles: ["magic", "ماجيك"] },
  { label: "Express / إكسبريس", needles: ["express auto", "express car", "اكسبرس"] },
];

// normalize Arabic (alef variants, ة/ه, ى/ي, strip tatweel) + lowercase
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .trim();
}

type Row = { name: string; specialty: string | null; area: string | null };
async function fetchNames(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("name,specialty,area")
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
  const rows = await fetchNames();
  console.log(`\n📊 active garages in DB: ${rows.length}\n`);
  const normNames = rows.map((r) => ({ n: norm(r.name), r }));

  let missing = 0;
  console.log("الهدف".padEnd(40) + " | الحالة   | عدد | عيّنة");
  console.log("-".repeat(100));
  for (const t of TARGETS) {
    const needles = t.needles.map(norm);
    const hits = normNames.filter(({ n }) => needles.some((nd) => n.includes(nd)));
    const status = hits.length ? "✅ موجود " : "❌ ناقص  ";
    if (!hits.length) missing++;
    const sample = hits.slice(0, 3).map((h) => h.r.name).join(" ، ");
    console.log(
      t.label.padEnd(40) + ` | ${status} | ${String(hits.length).padStart(3)} | ${sample}`
    );
  }
  console.log("-".repeat(100));
  console.log(`\n❌ ناقص تماماً من الـ DB: ${missing} من ${TARGETS.length} هدف\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
