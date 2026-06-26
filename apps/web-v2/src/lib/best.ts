// Data for the "best garages" pages (/best, /best/[category]).
// Top workshops ranked by degself smart_score, drawn from the review-analysis
// overlay joined to the live Supabase rows (only active, automotive, in-scope).
import { supabasePublic } from "@/lib/supabase/public";
import { allEnrichments, isReviewBacked, type Enrichment } from "@/lib/enrichment";
import type { Workshop } from "@/lib/types";

export type BestWorkshop = Workshop & { enrichment: Enrichment };

// The PostgREST `IN (...)` filter is encoded into the query string, so a long
// list of place_ids (538+ after the curated mechanics) can produce a URL
// larger than the platform's request-line limit and surface as `fetch failed`
// at build time. Chunk the IDs into safe batches and union the results.
const PLACE_ID_BATCH = 100;

/** Every enriched, listable workshop with its overlay, sorted by smart_score desc. */
export async function getEnrichedWorkshops(): Promise<BestWorkshop[]> {
  const enr = allEnrichments();
  const ids = Object.keys(enr);

  const rows: Workshop[] = [];
  for (let i = 0; i < ids.length; i += PLACE_ID_BATCH) {
    const batch = ids.slice(i, i + PLACE_ID_BATCH);
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("*")
      .in("place_id", batch)
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false);
    if (error) throw new Error(`getEnrichedWorkshops failed: ${error.message}`);
    if (data) rows.push(...(data as Workshop[]));
  }

  // "Best" must be review-proven: keep only workshops whose smart_score is backed
  // by analyzed Google reviews. Curated entries (reviews_total = null) are shown
  // elsewhere (/mukhtarat, search, area pages) but never ranked as "best".
  return rows
    .map((w) => ({ ...w, enrichment: enr[w.place_id] }))
    .filter((w): w is BestWorkshop => isReviewBacked(w.enrichment))
    .sort((a, b) => b.enrichment.smart_score - a.enrichment.smart_score);
}

export interface BestCategory {
  specialty: string;
  count: number;
}

/** Specialties present among enriched workshops, most-populated first. */
export function bestCategories(list: BestWorkshop[]): BestCategory[] {
  const counts = new Map<string, number>();
  for (const w of list) {
    const s = w.reviewed_specialty;
    if (!s) continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count);
}

export const BEST_LIMIT = 20;
