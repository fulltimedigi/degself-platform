/**
 * VALIDATION ONLY — does NOT write to the DB.
 * Previews extracting missing specialties from workshop NAMES so we can verify
 * the matching logic before any migration. Data accuracy is the priority.
 *
 * Run: npx tsx scripts/validate-specialty-extraction.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

// Each category: `name`/`en` patterns matched against the workshop NAME;
// `already` matches the existing specialty/hints to estimate what's NEW.
const CATEGORIES = [
  {
    key: "كهرباء سيارات",
    name: /كهربا|الكترو|إلكترو/,
    en: /electr/i,
    already: /كهربا|الكترو|إلكترو/,
  },
  {
    key: "الهيئة (suspension)",
    name: /هيئة|هيأة|هيئه|مساعدين|عفشة/,
    en: /suspension/i,
    already: /هيئة|هيئه|مساعدين/,
  },
  {
    key: "ميزان عجلات",
    name: /ميزان|ترصيص/,
    en: /alignment|balanc/i,
    already: /ميزان|ترصيص/,
  },
  {
    key: "قير وفتيس",
    name: /قير|فتيس/,
    en: /\bgear|transmission/i,
    already: /قير|فتيس/,
  },
];

type Row = {
  place_id: string;
  name: string;
  specialty: string;
  specialty_hints: string[] | null;
};

// fetch all rows (paginated past the 1000-row cap)
async function fetchAll(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id, name, specialty, specialty_hints")
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
  console.log(`فحص ${rows.length} منشأة (بدون أي تعديل على الداتا)\n`);

  for (const cat of CATEGORIES) {
    const matches = rows.filter((w) => cat.name.test(w.name) || cat.en.test(w.name));
    const alreadyClassified = matches.filter(
      (w) =>
        cat.already.test(w.specialty) ||
        (w.specialty_hints ?? []).some((h) => cat.already.test(h))
    );
    const fresh = matches.length - alreadyClassified.length;

    console.log("══════════════════════════════════════════");
    console.log(`▶ ${cat.key}`);
    console.log(
      `  مطابقات في الاسم: ${matches.length}  |  مصنّفة بالفعل: ${alreadyClassified.length}  |  جديدة: ${fresh}`
    );
    console.log("  عينات (أول 10):");
    matches.slice(0, 10).forEach((w) =>
      console.log(`    • ${w.name.slice(0, 48).padEnd(48)} [specialty: ${w.specialty}]`)
    );
    console.log("");
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
