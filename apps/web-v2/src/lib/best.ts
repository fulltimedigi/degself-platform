// Data for the "best garages" pages (/best, /best/[category]).
// Top workshops ranked by degself smart_score, drawn from the review-analysis
// overlay joined to the live Supabase rows (only active, automotive, in-scope).
import { supabasePublic } from "@/lib/supabase/public";
import { allEnrichments, type Enrichment } from "@/lib/enrichment";
import type { Workshop } from "@/lib/types";

export type BestWorkshop = Workshop & { enrichment: Enrichment };

/** Every enriched, listable workshop with its overlay, sorted by smart_score desc. */
export async function getEnrichedWorkshops(): Promise<BestWorkshop[]> {
  const enr = allEnrichments();
  const ids = Object.keys(enr);
  const { data, error } = await supabasePublic
    .from("workshops")
    .select("*")
    .in("place_id", ids)
    .eq("active", true)
    .eq("permanently_closed", false)
    .eq("is_automotive", true)
    .eq("out_of_scope", false);
  if (error) throw new Error(`getEnrichedWorkshops failed: ${error.message}`);
  return (data ?? [])
    .map((w) => ({ ...(w as Workshop), enrichment: enr[(w as Workshop).place_id] }))
    .filter((w): w is BestWorkshop => !!w.enrichment)
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
