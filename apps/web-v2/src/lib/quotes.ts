import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Quote, QuoteOffer } from "@/lib/quote-status";

// Server-only data access for quotes + offers. Uses the service-role key
// (bypasses RLS); never import this module from a client component. Types and
// presentation helpers live in ./quote-status (client-safe) and are re-exported
// below so existing `@/lib/quotes` imports keep working.
export * from "@/lib/quote-status";
export type { Quote, QuoteOffer };

const QUOTE_COLUMNS =
  "id,created_at,updated_at,expires_at,customer_name,customer_phone,service," +
  "car_make,car_model,car_year,problem_description,area,urgency,photos,status," +
  "customer_token,matched_workshops,admin_notes,source";

const OFFER_COLUMNS =
  "id,quote_id,workshop_name,workshop_phone,pricing_type,price_kwd,price_max_kwd," +
  "assumed_diagnosis,inspection_fee_kwd,parts_type,validity_days,warranty_days,warranty_note," +
  "estimated_duration,notes,status,created_at,accepted_at";

/** All quotes, newest first. Throws on Supabase/config error. */
export async function fetchQuotes(limit = 500): Promise<Quote[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Quote[];
}

/** A single quote by id, or null if not found. */
export async function fetchQuote(id: string): Promise<Quote | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Quote) ?? null;
}

/** A single quote by its public customer_token, or null. Powers /offers/[token]. */
export async function fetchQuoteByToken(token: string): Promise<Quote | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .eq("customer_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Quote) ?? null;
}

/** All offers for a quote, newest first. */
export async function fetchOffers(quoteId: string): Promise<QuoteOffer[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_offers")
    .select(OFFER_COLUMNS)
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as QuoteOffer[];
}
