/**
 * Search-findability aliases (Task #6 follow-up): make brands findable under
 * common alternate spellings. e.g. AUTO1 / أوتو1 is written with a digit, so a
 * search for "Auto One" / "اوتو ون" never matched. We add the alias spellings to
 * `specialty_hints` — a real source field of the search_text trigger (migration
 * 002) — so updating it cleanly rebuilds search_text WITH the aliases (no hacking
 * the trigger-maintained column directly). Idempotent.
 *
 * Run: npx tsx scripts/apply-search-aliases.ts            (dry-run)
 *      npx tsx scripts/apply-search-aliases.ts --commit
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SKEY) { console.error("❌ need SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

function norm(x: string): string {
  return (x || "").toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}

// extensible brand-alias rules: if name matches `test`, add `aliases` to specialty_hints
const RULES: { label: string; test: RegExp; aliases: string[] }[] = [
  { label: "AUTO1 → Auto One", test: /auto ?1|اوتو ?1/, aliases: ["Auto One", "اوتو ون"] },
];

type Row = { place_id: string; name: string; specialty_hints: string[] | null };

async function main() {
  const all: Row[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase.from("workshops").select("place_id,name,specialty_hints")
      .eq("active", true).eq("permanently_closed", false).range(f, f + 999);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as Row[]; all.push(...b);
    if (b.length < 1000) break;
  }

  const updates: { pid: string; name: string; hints: string[]; rule: string }[] = [];
  for (const r of all) {
    const n = norm(r.name);
    for (const rule of RULES) {
      if (!rule.test.test(n)) continue;
      const existing = r.specialty_hints ?? [];
      const existingNorm = new Set(existing.map(norm));
      const toAdd = rule.aliases.filter((a) => !existingNorm.has(norm(a)));
      if (toAdd.length) updates.push({ pid: r.place_id, name: r.name, hints: [...existing, ...toAdd], rule: rule.label });
    }
  }

  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"} · ${updates.length} rows to alias\n`);
  for (const u of updates) console.log(`  [${u.rule}] «${u.name}» → hints+${JSON.stringify(u.hints.slice(-2))}`);
  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — re-run with --commit.`); return; }

  let done = 0, failed = 0;
  for (const u of updates) {
    const { error } = await supabase.from("workshops").update({ specialty_hints: u.hints }).eq("place_id", u.pid);
    if (error) { failed++; console.error(`  ❌ ${u.pid}: ${error.message}`); } else done++;
  }
  console.log(`\n✅ aliased ${done}, failed ${failed} (search_text rebuilt by trigger)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
