/**
 * Data fix — restore the 3 Automak (أوتوماك) Shuwaikh branches that were
 * soft-removed during the Places enrichment run with removal_reason='invalid_place_id'.
 *
 * Root cause: their stored place_id was corrupted in the tail (garbled after the
 * `zz8R` marker), so Google Place Details returned INVALID_REQUEST and they were
 * (correctly, by the rule) dropped — even though they are real, automotive branches.
 *
 * The correct place_ids were recovered via Google "Find Place From Text" (name +
 * locationbias on the stored lat/lng). This script swaps each corrupted place_id
 * for the verified one and clears the soft-removal (active=true).
 *
 * Idempotent: re-running after it has applied is a no-op (it then just re-asserts
 * the restored state on the NEW ids). DRY by default.
 *
 * Dry-run (default):  npx tsx scripts/fix-automak-place-ids.ts
 * Apply for real:     APPLY=1 npx tsx scripts/fix-automak-place-ids.ts
 * Needs: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const DRY = process.env.APPLY !== "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// corrupted place_id  →  verified place_id (Find Place From Text)
const FIXES = [
  { branch: "Headoffice (الشويخ الصناعية 1)", old: "ChIJbbF1I1Kbzz-XCbWBGHWWEw", neu: "ChIJbbF1I1Kbzz8Rlwm1gRh1lhM" },
  { branch: "Showroom (الشويخ الغزالي)",       old: "ChIJt0p1RgCFzz_ku95AdGLKBw", neu: "ChIJt0p1RgCFzz8R5LveQHRiygc" },
  { branch: "Shuwaikh 2 (الشويخ الصناعية 2)",  old: "ChIJI5cK3wSbzz8sJ_16L6-fCQ", neu: "ChIJI5cK3wSbzz8RLCf9ei-vnwk" },
] as const;

const RESTORE = { active: true, removal_reason: null, removed_at: null } as const;

async function exists(placeId: string): Promise<boolean> {
  const { count } = await supabase
    .from("workshops")
    .select("place_id", { count: "exact", head: true })
    .eq("place_id", placeId);
  return (count ?? 0) > 0;
}

async function main() {
  console.log(`\n${DRY ? "🟡 DRY-RUN (no writes)" : "🔴 APPLY"} — restore 3 Automak branches\n`);

  for (const f of FIXES) {
    const hasOld = await exists(f.old);
    const hasNew = await exists(f.neu);

    if (hasOld) {
      // first apply: swap corrupted id → verified id + clear soft-removal
      if (hasNew) {
        console.log(`⏭️  ${f.branch}: BOTH ids present — skipping to avoid PK conflict (review manually)`);
        continue;
      }
      console.log(`${DRY ? "would fix " : "✅ fixed "}${f.branch}: ${f.old} → ${f.neu}`);
      if (!DRY) {
        const { error } = await supabase
          .from("workshops")
          .update({ place_id: f.neu, ...RESTORE })
          .eq("place_id", f.old);
        if (error) console.error(`   ❌ ${error.message}`);
      }
    } else if (hasNew) {
      // already swapped — just re-assert restored state (idempotent)
      console.log(`${DRY ? "would re-assert " : "✓ re-asserted "}${f.branch}: ${f.neu} active`);
      if (!DRY) {
        const { error } = await supabase.from("workshops").update(RESTORE).eq("place_id", f.neu);
        if (error) console.error(`   ❌ ${error.message}`);
      }
    } else {
      console.log(`⚠️  ${f.branch}: NEITHER id found in DB — nothing to do`);
    }
  }

  // verification — list every Automak row and its active flag
  const { data } = await supabase
    .from("workshops")
    .select("place_id,name,area,active,is_automotive")
    .or("name.ilike.%automak%,name.ilike.%أوتوماك%,name.ilike.%اوتوماك%")
    .order("active", { ascending: false });
  console.log("\n--- Automak rows ---");
  for (const w of data ?? [])
    console.log(`  active=${w.active} | ${w.name} | ${w.area} | ${w.place_id}`);
  if (DRY) console.log("\n(dry-run — nothing written. Re-run with APPLY=1 to persist.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
