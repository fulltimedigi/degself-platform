import { supabasePublic } from "@/lib/supabase/public";
import { normalizeArabic } from "@/lib/normalize";
import { expandToken, SEARCH_STOPWORDS } from "@/lib/searchSynonyms";
import { isOpenNow } from "@/lib/hours";
import type { Workshop } from "@/lib/types";
import { getEnrichment, allEnrichments, type Enrichment } from "@/lib/enrichment";

// place_ids that carry review-analysis enrichment (smart_score, tags, …).
const ENRICHED_IDS = Object.keys(allEnrichments());

// PostgREST encodes the `IN (...)` filter into the query string, so passing all
// 538+ enriched ids at once builds a ~30KB URL that exceeds the platform's
// request-line limit and surfaces as `TypeError: fetch failed` (same root cause
// fixed for getEnrichedWorkshops in PR #32). Chunk the ids into safe batches.
const PLACE_ID_BATCH = 100;

export interface SearchParams {
  query?: string;
  area?: string;
  neighborhood?: string;
  governorate?: string;
  specialty?: string; // matched against reviewed_specialty (the audited field)
  entity_type?: string;
  service_mode?: string;
  min_rating?: number;
  sort?: string; // "relevance" (default) | "top-rated" | "most-reviews" | "az" | "distance"
  lat?: number; // user location (for sort=distance)
  lng?: number;
  open_now?: boolean; // keep only places open right now (Kuwait time)
  // review-analysis facets (degself enrichment overlay; apply to enriched only)
  trust?: string[]; // trust_signal ∈ selected
  positive?: string[]; // must have ALL selected positive tag labels
  negative?: string[]; // exclude if it has ANY selected negative tag label
  score_min?: number; // smart_score >= score_min
  limit?: number;
  offset?: number;
}

// Returned rows carry the enrichment overlay (and distance when sorted by it).
export type WorkshopWithEnrichment = Workshop & {
  distance_km?: number | null;
  enrichment?: Enrichment | null;
};
// Back-compat alias for existing callers.
export type WorkshopWithDistance = WorkshopWithEnrichment;

export interface SearchResult {
  workshops: WorkshopWithEnrichment[];
  total: number;
}

/** Attach the review-analysis overlay to a workshop row. */
function attach(w: Workshop): WorkshopWithEnrichment {
  return { ...w, enrichment: getEnrichment(w.place_id) };
}

/** Does an enriched row pass the active review-analysis facets? Non-enriched
 *  rows (enrichment === null) never pass once any such facet is selected. */
function passesEnrichment(
  e: Enrichment | null | undefined,
  f: Pick<SearchParams, "trust" | "positive" | "negative" | "score_min">
): boolean {
  if (!e) return false;
  if (f.trust?.length && !f.trust.includes(e.trust_signal)) return false;
  if (f.score_min != null && e.smart_score < f.score_min) return false;
  if (f.positive?.length) {
    const have = new Set(e.positive_tags.map((t) => t.label));
    if (!f.positive.every((p) => have.has(p))) return false;
  }
  if (f.negative?.length) {
    const have = new Set(e.negative_tags.map((t) => t.label));
    if (f.negative.some((n) => have.has(n))) return false;
  }
  return true;
}

/** Order a JS-side list. Default (relevance/smart) → smart_score desc. */
function sortList(
  list: WorkshopWithEnrichment[],
  sort?: string
): WorkshopWithEnrichment[] {
  if (sort === "top-rated")
    return list.sort(
      (a, b) =>
        (b.google_rating ?? 0) - (a.google_rating ?? 0) ||
        (b.google_reviews_count ?? 0) - (a.google_reviews_count ?? 0)
    );
  if (sort === "most-reviews")
    return list.sort(
      (a, b) => (b.google_reviews_count ?? 0) - (a.google_reviews_count ?? 0)
    );
  if (sort === "az") return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  // smart_score desc
  return list.sort(
    (a, b) => (b.enrichment?.smart_score ?? -1) - (a.enrichment?.smart_score ?? -1)
  );
}

// Great-circle distance in meters between two lat/lng points.
function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// The JS pipeline (open-now / distance) fetches at most this many most-relevant
// matches, then filters/sorts in JS. Real filtered searches are well under this;
// an unfiltered browse takes the top-N relevant.
const JS_CANDIDATE_CAP = 500;

// Default smart-ordered browse pages the whole filtered catalog into JS to put
// enriched (scored) workshops first. Bounded so catalog growth can't run away.
const FULL_CATALOG_CAP = 3000;

/**
 * Filtered, paginated search. Free-text `query` is normalized (Arabic-aware)
 * and matched token-by-token via ILIKE on the trigram-indexed search_text.
 * Default sort: rank_score DESC (relevance — Bayesian rating + review-volume +
 * dealer boost; see migration 004) so trusted established centers surface above
 * thin 5.0-with-3-reviews shops. Other sorts: top-rated | most-reviews | az.
 */
export async function searchWorkshops(
  params: SearchParams = {}
): Promise<SearchResult> {
  const {
    query,
    area,
    neighborhood,
    governorate,
    specialty,
    entity_type,
    service_mode,
    min_rating,
    sort,
    lat,
    lng,
    open_now,
    trust,
    positive,
    negative,
    score_min,
    limit = 24,
    offset = 0,
  } = params;

  // Fresh, fully-filtered base query (no order/range) — rebuildable so the
  // JS-side paths can fetch in pages. Supabase builders aren't reusable post-await.
  const buildBase = (withCount: boolean) => {
    let q = supabasePublic
      .from("workshops")
      .select("*", withCount ? { count: "exact" } : undefined)
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true) // audit: hide non-automotive places
      .eq("out_of_scope", false);

    if (query) {
      const raw = normalizeArabic(query).split(" ").filter(Boolean);
      // drop generic action/filler words so the meaningful noun carries the query;
      // fall back to the raw tokens if filtering would empty it.
      const meaningful = raw.filter((t) => !SEARCH_STOPWORDS.has(t));
      const tokens = meaningful.length ? meaningful : raw;
      for (const t of tokens) {
        // OR-expand each token with its synonyms (script/dialect/spelling variants),
        // then AND the groups together. Each variant is re-normalized to match the
        // normalized search_text column.
        const variants = expandToken(t).map((v) => normalizeArabic(v)).filter(Boolean);
        const uniq = [...new Set(variants)];
        if (uniq.length === 1) q = q.ilike("search_text", `%${uniq[0]}%`);
        else q = q.or(uniq.map((v) => `search_text.ilike.%${v}%`).join(","));
      }
    }
    if (area) q = q.eq("area", area);
    if (neighborhood) q = q.eq("neighborhood", neighborhood);
    if (governorate) q = q.eq("governorate", governorate);
    if (specialty) q = q.eq("reviewed_specialty", specialty); // audited specialty
    if (entity_type) q = q.eq("entity_type", entity_type);
    if (service_mode) q = q.eq("service_mode", service_mode);
    if (min_rating) q = q.gte("google_rating", min_rating);
    return q;
  };

  const enrichmentActive = !!(
    trust?.length ||
    positive?.length ||
    negative?.length ||
    score_min != null
  );
  const wantDistance =
    sort === "distance" && Number.isFinite(lat) && Number.isFinite(lng);
  const explicitSort =
    sort === "top-rated" || sort === "most-reviews" || sort === "az";

  // ── Path A: review-analysis facets active → enriched-only, ranked by smart_score.
  // Non-enriched rows can never satisfy these facets, so restrict to ENRICHED_IDS.
  // The id list (538+) is chunked into batches to keep the `IN (...)` URL under
  // the platform's request-line limit; results are unioned. No SQL range cap is
  // needed — the enriched set is naturally bounded by ENRICHED_IDS.length, and
  // a cap would risk dropping enriched rows with NULL rank_score (e.g. the newly
  // curated mechanics, which sort last). Final ordering is applied JS-side.
  if (enrichmentActive) {
    const collected: Workshop[] = [];
    for (let i = 0; i < ENRICHED_IDS.length; i += PLACE_ID_BATCH) {
      const batch = ENRICHED_IDS.slice(i, i + PLACE_ID_BATCH);
      const { data, error } = await buildBase(false).in("place_id", batch);
      if (error) throw new Error(`searchWorkshops(enriched) failed: ${error.message}`);
      if (data) collected.push(...(data as Workshop[]));
    }
    let rows = collected;
    if (open_now) rows = rows.filter((w) => isOpenNow(w.opening_hours));
    const list = sortList(
      rows.map(attach).filter((w) =>
        passesEnrichment(w.enrichment, { trust, positive, negative, score_min })
      ),
      sort
    );
    return { workshops: list.slice(offset, offset + limit), total: list.length };
  }

  // ── Path B: "open now" / "near me" JS pipeline (free-text hours / no PostGIS).
  if (wantDistance || open_now) {
    const { data, error } = await buildBase(false)
      .order("rank_score", { ascending: false, nullsFirst: false })
      .range(0, JS_CANDIDATE_CAP - 1);
    if (error) throw new Error(`searchWorkshops(pipeline) failed: ${error.message}`);
    let rows = (data ?? []) as Workshop[];
    if (open_now) rows = rows.filter((w) => isOpenNow(w.opening_hours));

    let ordered: WorkshopWithEnrichment[];
    if (wantDistance) {
      ordered = rows
        .map((w) => ({
          w,
          d:
            w.lat != null && w.lng != null
              ? haversineMeters(lat as number, lng as number, w.lat, w.lng)
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a, b) => a.d - b.d)
        .map(({ w, d }) => ({
          ...attach(w),
          distance_km: Number.isFinite(d) ? Math.round(d / 100) / 10 : null,
        }));
    } else {
      ordered = rows.map(attach); // already relevance-ordered by rank_score
    }
    return { workshops: ordered.slice(offset, offset + limit), total: ordered.length };
  }

  // ── Path C: explicit non-smart sort → SQL paginates; overlay attached per page.
  if (explicitSort) {
    let q = buildBase(true);
    if (sort === "most-reviews")
      q = q.order("google_reviews_count", { ascending: false, nullsFirst: false });
    else if (sort === "az") q = q.order("name", { ascending: true });
    else
      q = q
        .order("google_rating", { ascending: false, nullsFirst: false })
        .order("google_reviews_count", { ascending: false, nullsFirst: false });
    q = q.range(offset, offset + limit - 1);
    const { data, count, error } = await q;
    if (error) throw new Error(`searchWorkshops failed: ${error.message}`);
    return { workshops: (data ?? []).map((w) => attach(w as Workshop)), total: count ?? 0 };
  }

  // ── Path D (default): smart ordering across the whole filtered set — enriched
  // first by smart_score desc, then the rest in relevance (rank_score) order.
  // Loading the matched set is cheap for faceted queries; the unfiltered browse
  // pages the full catalog (bounded by FULL_CATALOG_CAP).
  const PAGE = 1000;
  const all: Workshop[] = [];
  for (let from = 0; from < FULL_CATALOG_CAP; from += PAGE) {
    const to = Math.min(from + PAGE, FULL_CATALOG_CAP) - 1;
    const { data, error } = await buildBase(false)
      .order("rank_score", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (error) throw new Error(`searchWorkshops(default) failed: ${error.message}`);
    const batch = (data ?? []) as Workshop[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  const rows = all.map(attach);
  const enriched = rows
    .filter((w) => w.enrichment)
    .sort(
      (a, b) => (b.enrichment?.smart_score ?? 0) - (a.enrichment?.smart_score ?? 0)
    );
  const rest = rows.filter((w) => !w.enrichment); // keep rank_score order
  const ordered = [...enriched, ...rest];
  return { workshops: ordered.slice(offset, offset + limit), total: ordered.length };
}

/** Single workshop by place_id. ⚠️ place_id is case-sensitive — never transform it. */
export async function getWorkshop(placeId: string): Promise<Workshop | null> {
  const supabase = supabasePublic;
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw new Error(`getWorkshop failed: ${error.message}`);
  return (data as Workshop | null) ?? null;
}

/**
 * Extract a stable "chain key" from a workshop name so that branches of the
 * same business (e.g. "AlBabtain Auto, Al Faiha", "Al Babtain Auto - Jahra",
 * "AlBabtain Auto Ahmadi") collapse to a single bucket. Used to diversify the
 * homepage carousel.
 *
 * Strategy:
 *  1. Lowercase + strip Arabic diacritics + keep only latin/arabic letters.
 *  2. Drop common prefixes that are essentially noise for chain detection
 *     ("al", "el", "the") and the generic suffix "auto".
 *  3. Take the first remaining meaningful token — that's the brand stem.
 *     e.g. "al babtain auto al faiha" → ["babtain", "faiha"] → "babtain".
 */
const CHAIN_NOISE = new Set([
  "al", "el", "the", "auto", "اوتو", "ال",
  "service", "center", "co", "company", "and", "for",
  "لصيانة", "للسيارات", "تجارة", "شركة",
]);
function chainKey(name: string): string {
  const tokens = (name || "")
    .toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670]/g, "") // Arabic diacritics
    .replace(/[^a-z\u0600-\u06ff\s]/g, " ") // keep letters only
    .split(/\s+/)
    .filter(Boolean);

  //  Normalize each token:
  //  • latin: drop glued "al" prefix ("albabtain" → "babtain")
  //  • arabic: drop leading "ال" article ("البابطين" → "بابطين")
  const normalized = tokens.map((t) => {
    if (/^al[a-z]{3,}$/.test(t)) return t.slice(2);
    if (/^ال[\u0600-\u06ff]{2,}$/.test(t)) return t.slice(2);
    return t;
  });
  const meaningful = normalized.filter((t) => !CHAIN_NOISE.has(t));
  if (meaningful.length === 0) return (name || "").trim().toLowerCase();

  // Prefer the first LATIN meaningful token when both scripts are present —
  // latin spellings are more consistent across Google Places entries
  // (e.g. "babtain" stable; arabic root may vary "بابطين" vs "البابطين").
  const latin = meaningful.find((t) => /^[a-z]/.test(t));
  return latin ?? meaningful[0];
}

/**
 * Most relevant (trusted + established) live workshops for the homepage.
 *
 * Diversification: we over-fetch then keep at most MAX_PER_CHAIN entries per
 * brand/chain so the carousel doesn't get monopolised by a single business
 * (e.g. AlBabtain Auto branches).
 */
export async function getFeaturedWorkshops(limit = 12): Promise<Workshop[]> {
  const supabase = supabasePublic;
  const MAX_PER_CHAIN = 2;
  const OVERFETCH = Math.max(limit * 8, 80);
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("active", true)
    .eq("permanently_closed", false)
    .eq("is_automotive", true)
    .eq("out_of_scope", false)
    .not("google_rating", "is", null)
    .order("rank_score", { ascending: false, nullsFirst: false })
    .order("google_reviews_count", { ascending: false, nullsFirst: false })
    .limit(OVERFETCH);
  if (error) throw new Error(`getFeaturedWorkshops failed: ${error.message}`);

  const rows = (data ?? []) as Workshop[];
  const seen = new Map<string, number>();
  const picked: Workshop[] = [];
  for (const w of rows) {
    if (picked.length >= limit) break;
    const key = chainKey(w.name);
    const count = seen.get(key) ?? 0;
    if (count >= MAX_PER_CHAIN) continue;
    seen.set(key, count + 1);
    picked.push(w);
  }
  // Fallback: if dedup left us short (very small dataset), top up from the
  // original list preserving order, ignoring the dedup cap.
  if (picked.length < limit) {
    const taken = new Set(picked.map((w) => w.place_id));
    for (const w of rows) {
      if (picked.length >= limit) break;
      if (taken.has(w.place_id)) continue;
      picked.push(w);
    }
  }
  return picked;
}

/**
 * place_ids for generateStaticParams. Pass a limit to pre-render only the most
 * popular N at build time (the rest render on-demand via ISR).
 */
export async function getAllPlaceIds(limit?: number): Promise<string[]> {
  // With a limit → single ordered query (used by generateStaticParams).
  if (limit) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("place_id")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .order("google_reviews_count", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(`getAllPlaceIds failed: ${error.message}`);
    return (data ?? []).map((r) => (r as { place_id: string }).place_id);
  }

  // No limit → paginate ALL (sitemap needs every place_id, past the 1000 cap).
  const PAGE = 1000;
  const all: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("place_id")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`getAllPlaceIds failed: ${error.message}`);
    const batch = (data ?? []) as { place_id: string }[];
    all.push(...batch.map((r) => r.place_id));
    if (batch.length < PAGE) break;
  }
  return all;
}

/**
 * place_ids of the hand-curated mechanics (place_id LIKE 'degself-mech-%').
 * They carry no google_reviews_count, so getAllPlaceIds(100) never picks them —
 * generateStaticParams adds these explicitly so every curated garage is
 * pre-rendered (not just ISR-on-demand). Bounded (~101 rows): a single query.
 */
export async function getCuratedMechanicPlaceIds(): Promise<string[]> {
  const { data, error } = await supabasePublic
    .from("workshops")
    .select("place_id")
    .eq("active", true)
    .eq("permanently_closed", false)
    .like("place_id", "degself-mech-%");
  if (error) throw new Error(`getCuratedMechanicPlaceIds failed: ${error.message}`);
  return (data ?? []).map((r) => (r as { place_id: string }).place_id);
}

/**
 * Full rows for the hand-curated mechanics — for the /mukhtarat index page.
 * Ordered area-then-name so the page can group by area without re-sorting.
 */
export async function getCuratedMechanics(): Promise<Workshop[]> {
  const { data, error } = await supabasePublic
    .from("workshops")
    .select("*")
    .eq("active", true)
    .eq("permanently_closed", false)
    .like("place_id", "degself-mech-%")
    .order("area", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`getCuratedMechanics failed: ${error.message}`);
  return (data ?? []) as Workshop[];
}

/** Every active place_id with its updated_at — for accurate sitemap <lastmod>. */
export async function getAllPlaceIdsWithLastmod(): Promise<
  { place_id: string; updated_at: string | null }[]
> {
  const PAGE = 1000;
  const all: { place_id: string; updated_at: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("place_id, updated_at")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`getAllPlaceIdsWithLastmod failed: ${error.message}`);
    const batch = (data ?? []) as { place_id: string; updated_at: string | null }[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

export interface MapPoint {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  entity_type: string;
}

/**
 * Minimal fields for every live, geocoded workshop — for the /map page.
 * Paginated: PostgREST caps a single response at 1000 rows, so we loop to fetch
 * ALL points (never silently drop markers — data-accuracy rule).
 */
export async function getMapPoints(): Promise<MapPoint[]> {
  const PAGE = 1000;
  const all: MapPoint[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("place_id, name, lat, lng, entity_type")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`getMapPoints failed: ${error.message}`);
    const batch = (data ?? []) as MapPoint[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

/**
 * Distinct non-null values of a text column across the live, in-scope set —
 * used to populate the Search filter dropdowns. Dedupes in JS (fine at this
 * scale; ~1753 short strings) and paginates past the 1000-row cap so NO value
 * is silently dropped. Can be swapped for a Postgres view/RPC later if needed.
 */
async function distinctColumn(
  col: "area" | "neighborhood" | "reviewed_specialty"
): Promise<string[]> {
  const PAGE = 1000;
  const set = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select(col)
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .not(col, "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`distinctColumn(${col}) failed: ${error.message}`);
    const batch = (data ?? []) as Record<string, string | null>[];
    for (const r of batch) {
      const v = r[col];
      if (v) set.add(v);
    }
    if (batch.length < PAGE) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}

/** Distinct area names for the Search filter dropdown. */
export const getDistinctAreas = () => distinctColumn("area");
/** Distinct neighborhoods (الحي) — 500+ values, use a datalist not a <select>. */
export const getDistinctNeighborhoods = () => distinctColumn("neighborhood");
/** Distinct audited specialties (~20 values) for the specialty <select>. */
export const getDistinctSpecialties = () => distinctColumn("reviewed_specialty");

/**
 * Up to `limit` workshops "similar" to the current one — for internal linking on
 * the workshop page. Tries progressively broader matches and stops once it has
 * enough, never repeating a place (or the current one):
 *   1. same area + same specialty   (most relevant)
 *   2. same area
 *   3. same specialty
 *   4. top-rated overall            (final fallback so the section can still fill)
 * Each pass orders by rank_score (relevance) DESC, NULLs last; excludes closed /
 * out-of-scope rows. The caller decides whether to render (we suggest ≥3).
 */
export async function getSimilarWorkshops(
  currentPlaceId: string,
  area: string | null,
  specialty: string | null,
  limit = 6
): Promise<Workshop[]> {
  const baseQuery = () =>
    supabasePublic
      .from("workshops")
      .select("*")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .neq("place_id", currentPlaceId);

  const collected: Workshop[] = [];
  const seen = new Set<string>([currentPlaceId]);

  const runPass = async (
    apply: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>
  ) => {
    if (collected.length >= limit) return;
    const { data, error } = await apply(baseQuery())
      .order("rank_score", { ascending: false, nullsFirst: false })
      .limit(limit * 3); // over-fetch so dedup across passes still fills the row
    if (error) throw new Error(`getSimilarWorkshops failed: ${error.message}`);
    for (const row of (data ?? []) as Workshop[]) {
      if (collected.length >= limit) break;
      if (seen.has(row.place_id)) continue;
      seen.add(row.place_id);
      collected.push(row);
    }
  };

  if (area && specialty)
    await runPass((q) => q.eq("area", area).eq("reviewed_specialty", specialty));
  if (area) await runPass((q) => q.eq("area", area));
  if (specialty) await runPass((q) => q.eq("reviewed_specialty", specialty));
  await runPass((q) => q); // top-rated overall

  return collected.slice(0, limit);
}
