/**
 * Migration: add "ميزان عجلات" to specialty_hints for garages whose NAME indicates
 * wheel alignment (ميزان / ترصيص / alignment / balancing) but aren't tagged yet.
 * Idempotent (safe to re-run). Prints every change. Updating specialty_hints also
 * refreshes search_text via the DB trigger, so these become searchable.
 *
 * Run: npx tsx scripts/migrate-add-meezan-hint.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

const HINT = "ميزان عجلات";
const NAME_AR = /ميزان|ترصيص/;
const NAME_EN = /alignment|balanc/i;

type Row = { place_id: string; name: string; specialty_hints: string[] | null };

async function fetchAll(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workshops")
      .select("place_id, name, specialty_hints")
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
  const matches = rows.filter((w) => NAME_AR.test(w.name) || NAME_EN.test(w.name));
  console.log(`مطابقات ميزان عجلات: ${matches.length}\n`);

  let updated = 0;
  let skipped = 0;
  for (const w of matches) {
    const hints = w.specialty_hints ?? [];
    if (hints.includes(HINT)) {
      console.log(`⏭️  موجود بالفعل: ${w.name.slice(0, 45)}`);
      skipped++;
      continue;
    }
    const newHints = [...hints, HINT];
    const { error } = await supabase
      .from("workshops")
      .update({ specialty_hints: newHints })
      .eq("place_id", w.place_id); // ⚠️ place_id verbatim — case-sensitive
    if (error) {
      console.error(`❌ فشل: ${w.name.slice(0, 45)} — ${error.message}`);
      continue;
    }
    console.log(`✅ ${w.name.slice(0, 45).padEnd(45)} | ${JSON.stringify(hints)} → ${JSON.stringify(newHints)}`);
    updated++;
  }

  console.log(`\nالخلاصة: ${updated} تم تحديثهم، ${skipped} كانوا متصنّفين بالفعل.`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
