import { supabasePublic } from "@/lib/supabase/public";
import { normalizeArabic } from "@/lib/normalize";
import { expandToken, SEARCH_STOPWORDS } from "@/lib/searchSynonyms";
import type { Workshop } from "@/lib/types";

export interface SearchParams {
  query?: string;
  area?: string;
  neighborhood?: string;
  governorate?: string;
  specialty?: string; // matched against reviewed_specialty (the audited field)
  entity_type?: string;
  service_mode?: string;
  min_rating?: number;
  sort?: string; // "relevance" (default) | "top-rated" | "most-reviews" | "az"
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  workshops: Workshop[];
  total: number;
}

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
    limit = 24,
    offset = 0,
  } = params;

  const supabase = supabasePublic;

  let q = supabase
    .from("workshops")
    .select("*", { count: "exact" })
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
      if (uniq.length === 1) {
        q = q.ilike("search_text", `%${uniq[0]}%`);
      } else {
        q = q.or(uniq.map((v) => `search_text.ilike.%${v}%`).join(","));
      }
    }
  }
  if (area) q = q.eq("area", area);
  if (neighborhood) q = q.eq("neighborhood", neighborhood);
  if (governorate) q = q.eq("governorate", governorate);
  if (specialty) q = q.eq("reviewed_specialty", specialty); // audited specialty
  if (entity_type) q = q.eq("entity_type", entity_type);
  if (service_mode) q = q.eq("service_mode", service_mode);
  if (min_rating) q = q.gte("google_rating", min_rating);

  // sort
  if (sort === "most-reviews") {
    q = q.order("google_reviews_count", { ascending: false, nullsFirst: false });
  } else if (sort === "az") {
    q = q.order("name", { ascending: true });
  } else if (sort === "top-rated") {
    q = q
      .order("google_rating", { ascending: false, nullsFirst: false })
      .order("google_reviews_count", { ascending: false, nullsFirst: false });
  } else {
    // default: relevance — Bayesian rating + review volume + dealer boost
    q = q
      .order("rank_score", { ascending: false, nullsFirst: false })
      .order("google_reviews_count", { ascending: false, nullsFirst: false });
  }

  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(`searchWorkshops failed: ${error.message}`);
  return { workshops: (data ?? []) as Workshop[], total: count ?? 0 };
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

/** Most relevant (trusted + established) live workshops for the homepage. */
export async function getFeaturedWorkshops(limit = 12): Promise<Workshop[]> {
  const supabase = supabasePublic;
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
    .limit(limit);
  if (error) throw new Error(`getFeaturedWorkshops failed: ${error.message}`);
  return (data ?? []) as Workshop[];
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
