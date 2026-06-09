import { supabasePublic } from "@/lib/supabase/public";
import { normalizeArabic } from "@/lib/normalize";
import type { Workshop } from "@/lib/types";

export interface SearchParams {
  query?: string;
  area?: string;
  governorate?: string;
  specialty?: string;
  entity_type?: string;
  service_mode?: string;
  min_rating?: number;
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
 * Sort: google_rating DESC, then google_reviews_count DESC.
 */
export async function searchWorkshops(
  params: SearchParams = {}
): Promise<SearchResult> {
  const {
    query,
    area,
    governorate,
    specialty,
    entity_type,
    service_mode,
    min_rating,
    limit = 24,
    offset = 0,
  } = params;

  const supabase = supabasePublic;

  let q = supabase
    .from("workshops")
    .select("*", { count: "exact" })
    .eq("active", true)
    .eq("permanently_closed", false)
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("google_reviews_count", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (query) {
    const tokens = normalizeArabic(query).split(" ").filter(Boolean);
    for (const t of tokens) q = q.ilike("search_text", `%${t}%`);
  }
  if (area) q = q.eq("area", area);
  if (governorate) q = q.eq("governorate", governorate);
  if (specialty) q = q.eq("specialty", specialty);
  if (entity_type) q = q.eq("entity_type", entity_type);
  if (service_mode) q = q.eq("service_mode", service_mode);
  if (min_rating) q = q.gte("google_rating", min_rating);

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

/** Top-rated live workshops for the homepage. */
export async function getFeaturedWorkshops(limit = 12): Promise<Workshop[]> {
  const supabase = supabasePublic;
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("active", true)
    .eq("permanently_closed", false)
    .not("google_rating", "is", null)
    .order("google_rating", { ascending: false, nullsFirst: false })
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
  const supabase = supabasePublic;
  let q = supabase
    .from("workshops")
    .select("place_id")
    .eq("active", true)
    .eq("permanently_closed", false)
    .order("google_reviews_count", { ascending: false, nullsFirst: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw new Error(`getAllPlaceIds failed: ${error.message}`);
  return (data ?? []).map((r) => (r as { place_id: string }).place_id);
}

/**
 * Distinct area names for the Search filter dropdown (live workshops only).
 * Fetches the area column and dedupes in JS — fine at this scale (~1801 short
 * strings). Can be swapped for a Postgres view/RPC later if needed.
 */
export async function getDistinctAreas(): Promise<string[]> {
  const { data, error } = await supabasePublic
    .from("workshops")
    .select("area")
    .eq("active", true)
    .eq("permanently_closed", false)
    .not("area", "is", null);
  if (error) throw new Error(`getDistinctAreas failed: ${error.message}`);

  const set = new Set<string>();
  for (const r of data ?? []) {
    const a = (r as { area: string | null }).area;
    if (a) set.add(a);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}
