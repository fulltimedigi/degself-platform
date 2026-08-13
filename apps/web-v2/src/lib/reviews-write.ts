// Server-only writes for verified-transaction reviews (Phase B). Service-role
// only (reviews RLS blocks anon writes). A verified review is created from a
// confirmed completion, linked to its quote + settlement, one per job, and lands
// as 'pending' for the same manual moderation as public reviews.
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidRating } from "@/lib/settlement-review";

export type CreateVerifiedReviewInput = {
  quoteId: string;
  settlementId: string;
  placeId: string;
  rating: number;
  body?: string | null;
};

/**
 * Insert a verified review. Returns the new review id, or null when it is a
 * no-op (invalid rating / missing place, or a review already exists for this
 * quote — the unique index on quote_id enforces one-per-job).
 */
export async function createVerifiedReview(
  input: CreateVerifiedReviewInput
): Promise<string | null> {
  if (!isValidRating(input.rating)) return null;
  if (!input.placeId) return null;

  const admin = getSupabaseAdmin();
  const trimmed = input.body?.trim() ?? "";
  const body = trimmed.length >= 3 ? trimmed.slice(0, 1000) : null;

  const { data, error } = await admin
    .from("reviews")
    .insert({
      place_id: input.placeId,
      rating: input.rating,
      body,
      status: "pending",
      verified: true,
      source: "whatsapp_flow",
      quote_id: input.quoteId,
      settlement_id: input.settlementId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Unique violation on quote_id → already reviewed; treat as a no-op.
    if ((error as { code?: string }).code === "23505") return null;
    throw new Error(error.message);
  }
  return (data?.id as string | undefined) ?? null;
}

/** Garage right-of-reply on a review (admin-moderated). */
export async function setGarageReply(reviewId: string, reply: string): Promise<boolean> {
  const text = reply.trim().slice(0, 1000);
  if (!text) return false;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("reviews")
    .update({ garage_reply: text, garage_reply_at: new Date().toISOString() })
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}
