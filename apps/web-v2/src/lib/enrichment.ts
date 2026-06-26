// Review-analysis enrichment overlay (degself-owned, derived from review analysis —
// never raw Google review text). Keyed by Google place_id and merged onto the
// Supabase-backed Workshop at read time. Source: scripts that produced
// data/workshops_enriched.json → src/data/workshops_enriched_lookup.json.
import lookup from "@/data/workshops_enriched_lookup.json";

export type TrustSignal = "high" | "medium" | "low" | "warning";
export type Confidence = "high" | "medium" | "low";

export interface EnrichmentTag {
  label: string; // e.g. "جودة عمل ممتازة"
  category: string; // e.g. "quality"
  icon: string; // e.g. "⭐"
  evidence_count: number;
}

export interface Enrichment {
  smart_score: number; // 0–100
  confidence: Confidence;
  trust_signal: TrustSignal;
  positive_tags: EnrichmentTag[];
  negative_tags: EnrichmentTag[];
  summary_ar: string; // 1–2 جملة فصحى — صياغة degself، ليست اقتباساً
  reviews_total: number | null; // إجمالي تقييمات جوجل التي يقوم عليها التقييم
  reviews_analyzed: number | null; // عدد التقييمات المُحلَّلة لاستخلاص التاجات
}

// Typed view over the bundled JSON map (place_id → Enrichment).
const ENRICHMENT = lookup as unknown as Record<string, Enrichment>;

/** Enrichment for a single workshop, or null when it has not been analyzed. */
export function getEnrichment(placeId: string | null | undefined): Enrichment | null {
  if (!placeId) return null;
  return ENRICHMENT[placeId] ?? null;
}

/**
 * True only when the smart_score is backed by actually-analyzed Google reviews.
 * Curated entries (e.g. the hand-added mechanics) carry a smart_score derived
 * from a bare rating with reviews_total = null — trustworthy enough to display,
 * but NOT enough to outrank review-proven workshops. Ranking surfaces use this
 * so an unreviewed garage never leapfrogs an established, well-reviewed one.
 */
export function isReviewBacked(e: Enrichment | null | undefined): boolean {
  return !!e && e.reviews_total != null && e.reviews_total > 0;
}

/** Merge enrichment onto an object carrying a place_id (read-time overlay). */
export function withEnrichment<T extends { place_id: string }>(
  workshop: T
): T & { enrichment: Enrichment | null } {
  return { ...workshop, enrichment: getEnrichment(workshop.place_id) };
}

/** Whole map — for build-time pages (e.g. the "best" page and search facets). */
export function allEnrichments(): Record<string, Enrichment> {
  return ENRICHMENT;
}
