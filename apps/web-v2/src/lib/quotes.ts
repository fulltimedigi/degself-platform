import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveGarageOutreachToken } from "@/lib/garage-outreach";
import type { Quote, QuoteOffer } from "@/lib/quote-status";

export * from "@/lib/quote-status";
export type { Quote, QuoteOffer };

const QUOTE_COLUMNS =
  "id,created_at,updated_at,expires_at,customer_name,customer_phone,service," +
  "car_make,car_model,car_year,problem_description,area,urgency,photos,status," +
  "customer_token,garage_token,matched_workshops,admin_notes,source";

const GARAGE_QUOTE_COLUMNS =
  "id,service,car_make,car_model,car_year,problem_description,area,urgency,photos,status,created_at";

export interface GarageQuoteView {
  id: string;
  service: string;
  car_make: string | null;
  car_model: string | null;
  car_year: string | null;
  problem_description: string;
  area: string | null;
  urgency: string;
  photos: string[] | null;
  status: string;
  created_at: string;
}

export interface QuoteDeliveryTarget {
  id: string;
  workshop_id: string;
  status: "queued" | "sending" | "sent" | "failed" | "blocked_no_channel" | "cancelled";
  channel: "whatsapp" | "manual";
  target_rank: number;
  selection_score: number;
  selection_reason: string;
  attempts: number;
  sent_at: string | null;
  last_error: string | null;
  outreach_id: string | null;
  workshop: {
    name: string;
    phone: string | null;
    phone_intl: string | null;
  } | null;
}

const OFFER_COLUMNS =
  "id,quote_id,workshop_name,workshop_phone,pricing_type,price_kwd,price_max_kwd," +
  "assumed_diagnosis,inspection_fee_kwd,parts_type,validity_days,warranty_days,warranty_note," +
  "estimated_duration,notes,status,created_at,accepted_at";

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

export async function fetchQuoteByGarageToken(token: string): Promise<GarageQuoteView | null> {
  const resolution = await resolveGarageOutreachToken(token);
  if (!resolution) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quotes")
    .select(GARAGE_QUOTE_COLUMNS)
    .eq("id", resolution.quoteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as GarageQuoteView) ?? null;
}

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

/** Admin-only operational view of the automatic network routing queue. */
export async function fetchQuoteDeliveryQueue(quoteId: string): Promise<QuoteDeliveryTarget[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select(
      "id,workshop_id,status,channel,target_rank,selection_score,selection_reason,attempts,sent_at,last_error,outreach_id,workshop:workshops(name,phone,phone_intl)"
    )
    .eq("quote_id", quoteId)
    .order("target_rank", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as QuoteDeliveryTarget[];
}
