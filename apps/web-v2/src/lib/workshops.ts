import { supabasePublic } from "@/lib/supabase/public";
import { normalizeArabic } from "@/lib/normalize";
import { expandToken, SEARCH_STOPWORDS } from "@/lib/searchSynonyms";
import { isOpenNow } from "@/lib/hours";
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
  sort?: string; // "relevance" (default) | "top-rated" | "most-reviews" | "az" | "distance"
  lat?: number; // user location (for sort=distance)
  lng?: number;
  open_now?: boolean; // keep only places open right now (Kuwait time)
  limit?: number;
  offset?: number;
}

export type WorkshopWithDistance = Workshop & { distance_km?: number | null };

export interface SearchResult {
  workshops: WorkshopWithDistance[];
  total: number;
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

  // JS pipeline — needed for "open now" (free-text hours, can't filter in SQL) and
  // "near me" (Supabase can't ORDER BY distance without PostGIS). They compose:
  // nearest OPEN garage. Fetch a bounded, relevance-ordered candidate set first.
  const wantDistance = sort === "distance" && Number.isFinite(lat) && Number.isFinite(lng);
  if (wantDistance || open_now) {
    const { data, error } = await q
      .order("rank_score", { ascending: false, nullsFirst: false })
      .range(0, JS_CANDIDATE_CAP - 1);
    if (error) throw new Error(`searchWorkshops(pipeline) failed: ${error.message}`);
    let rows = (data ?? []) as Workshop[];
    if (open_now) rows = rows.filter((w) => isOpenNow(w.opening_hours));

    let ordered: WorkshopWithDistance[];
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
          ...w,
          distance_km: Number.isFinite(d) ? Math.round(d / 100) / 10 : null,
        }));
    } else {
      ordered = rows; // already relevance-ordered by rank_score
    }
    const page = ordered.slice(offset, offset + limit);
    return { workshops: page, total: ordered.length };
  }

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

/**
 * Extract a stable "chain key" from a workshop name so that branches of the
 * same business (e.g. "AlBabtain Auto, Al Faiha", "AlBabtain Auto - Jahra")
 * collapse to a single bucket. Used to diversify the homepage carousel.
 */
function chainKey(name: string): string {
  const cleaned = (name || "")
    .toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670]/g, "") // Arabic diacritics
    .replace(/[^a-z\u0600-\u06ff\s]/g, " ") // keep latin + arabic letters
    .split(/[\-–—,،|()\s]+/)
    .filter(Boolean);
  // first 2 tokens are usually the brand (e.g. "albabtain auto")
  return cleaned.slice(0, 2).join(" ").trim() || (name || "").trim().toLowerCase();
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
