/**
 * Compute & store search-relevance rank_score for every active row (Task #6).
 * Re-run after bulk data changes (it reads live ratings/reviews/specialty).
 *
 *   rank_score = bayes + 0.35*log10(1+reviews) + (reviewed_specialty='وكيل' ? 0.25 : 0)
 *   bayes      = (reviews*rating + m*C) / (reviews + m)    [m=25, C=live mean rating]
 *
 * Prereq: migration 004 (ADD COLUMN rank_score).
 * Run:    npx tsx scripts/compute-rank.ts            (dry-run: prints C + top 10)
 *         npx tsx scripts/compute-rank.ts --commit
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const SKEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SKEY) { console.error("❌ need SUPABASE_SECRET_KEY"); process.exit(1); }
const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SKEY, { auth: { persistSession: false } });

const M = 25; // Bayesian prior weight (≈ review-count threshold)

type Row = { place_id: string; name: string; google_rating: number | null; google_reviews_count: number | null; reviewed_specialty: string | null };

async function fetchActive(): Promise<Row[]> {
  const PAGE = 1000; const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("workshops")
      .select("place_id,name,google_rating,google_reviews_count,reviewed_specialty")
      .eq("active", true).eq("permanently_closed", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const b = (data ?? []) as Row[]; all.push(...b);
    if (b.length < PAGE) break;
  }
  return all;
}

function scoreOf(r: Row, C: number): number {
  const v = r.google_reviews_count ?? 0;
  const R = r.google_rating ?? 0;
  const bayes = (v * R + M * C) / (v + M);
  const vol = 0.35 * Math.log10(1 + v);
  const boost = r.reviewed_specialty === "وكيل" ? 0.25 : 0;
  return +(bayes + vol + boost).toFixed(4);
}

async function main() {
  const rows = await fetchActive();
  const rated = rows.filter((r) => r.google_rating != null);
  const C = +(rated.reduce((a, r) => a + (r.google_rating ?? 0), 0) / Math.max(1, rated.length)).toFixed(3);
  console.log(`\nmode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"} · ${rows.length} active · mean rating C=${C} · prior m=${M}\n`);

  const scored = rows.map((r) => ({ pid: r.place_id, name: r.name, sc: scoreOf(r, C), r }));
  scored.sort((a, b) => b.sc - a.sc);
  console.log("top 10 by rank_score:");
  for (const s of scored.slice(0, 10)) console.log(`  [${s.sc.toFixed(2)}] ${s.r.google_rating}★(${s.r.google_reviews_count}) ${s.r.reviewed_specialty === "وكيل" ? "🏷️" : ""} ${s.name}`.slice(0, 78));

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — re-run with --commit.`); return; }

  let done = 0, failed = 0;
  const CHUNK = 25;
  for (let i = 0; i < scored.length; i += CHUNK) {
    const res = await Promise.all(scored.slice(i, i + CHUNK).map((s) =>
      supabase.from("workshops").update({ rank_score: s.sc }).eq("place_id", s.pid).then(({ error }) => (error ? { error, pid: s.pid } : null))
    ));
    for (const r of res) { if (r) { failed++; if (failed <= 3) console.error(`  ❌ ${r.pid}: ${r.error.message}`); } else done++; }
    process.stdout.write(`\r  updated ${done}/${scored.length} (failed ${failed})`);
  }
  console.log(`\n✅ rank_score written: ${done}, failed ${failed}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
