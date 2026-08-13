import { supabasePublic } from "@/lib/supabase/public";

export interface Review {
  id: string;
  rating: number;
  author_name: string | null;
  body: string | null;
  created_at: string;
  // Present only after the verified-transaction migration is applied.
  verified?: boolean;
  garage_reply?: string | null;
}

export interface ReviewSummary {
  reviews: Review[];
  count: number;
  avg: number | null;
}

const EMPTY: ReviewSummary = { reviews: [], count: 0, avg: null };

/**
 * Approved reviews for a workshop (RLS exposes only status='approved' to anon).
 * Fails soft → empty summary if the table doesn't exist yet or on any error, so
 * the page never breaks before the migration is applied.
 */
const BASE_COLS = "id,rating,author_name,body,created_at";
const VERIFIED_COLS = `${BASE_COLS},verified,garage_reply`;

export async function getApprovedReviews(
  placeId: string,
  limit = 100
): Promise<ReviewSummary> {
  try {
    const run = (cols: string) =>
      supabasePublic
        .from("reviews")
        .select(cols)
        .eq("place_id", placeId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);

    // Prefer the verified-transaction columns; fall back to base columns when the
    // migration hasn't been applied yet, so reviews never disappear in the interim.
    let { data, error } = await run(VERIFIED_COLS);
    if (error) ({ data, error } = await run(BASE_COLS));
    if (error || !data) return EMPTY;
    const reviews = data as unknown as Review[];
    const count = reviews.length;
    const avg = count
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null;
    return { reviews, count, avg };
  } catch {
    return EMPTY;
  }
}
