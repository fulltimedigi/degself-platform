import { supabasePublic } from "@/lib/supabase/public";

export interface Review {
  id: string;
  rating: number;
  author_name: string | null;
  body: string;
  created_at: string;
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
export async function getApprovedReviews(
  placeId: string,
  limit = 100
): Promise<ReviewSummary> {
  try {
    const { data, error } = await supabasePublic
      .from("reviews")
      .select("id,rating,author_name,body,created_at")
      .eq("place_id", placeId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return EMPTY;
    const reviews = data as Review[];
    const count = reviews.length;
    const avg = count
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null;
    return { reviews, count, avg };
  } catch {
    return EMPTY;
  }
}
