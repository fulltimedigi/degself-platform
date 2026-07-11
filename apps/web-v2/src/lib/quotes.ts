import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Mirrors the public.quotes table (migration 013). SERVER ONLY — rows carry
// customer PII (phone) and are read via the service-role key, never the browser.
export interface Quote {
  id: string;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  customer_name: string;
  customer_phone: string;
  service: string;
  car_make: string | null;
  car_model: string | null;
  car_year: string | null;
  problem_description: string;
  area: string | null;
  urgency: string;
  photos: string[] | null;
  status: string;
  matched_workshops: unknown;
  admin_notes: string | null;
  source: string;
}

const QUOTE_COLUMNS =
  "id,created_at,updated_at,expires_at,customer_name,customer_phone,service," +
  "car_make,car_model,car_year,problem_description,area,urgency,photos,status," +
  "matched_workshops,admin_notes,source";

// Arabic label + badge palette per lifecycle status (schema: new/matched/quoted/won/lost).
export const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "جديد", className: "bg-[#FFD60A] text-[#0A0A0A]" },
  matched: { label: "تم التوجيه", className: "bg-blue-500 text-white" },
  quoted: { label: "وصل عرض", className: "bg-purple-500 text-white" },
  won: { label: "مكسوب", className: "bg-green-600 text-white" },
  lost: { label: "خسران", className: "bg-neutral-600 text-white" },
};

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[status ?? "new"] ?? STATUS_META.new;
}

// Urgency badge palette. عادي=neutral, مستعجل=amber, طارئ=red.
export const URGENCY_META: Record<string, string> = {
  عادي: "bg-neutral-700 text-white",
  مستعجل: "bg-amber-500 text-[#0A0A0A]",
  طارئ: "bg-red-600 text-white",
};

export function urgencyClass(urgency: string): string {
  return URGENCY_META[urgency] ?? "bg-neutral-700 text-white";
}

/** All quotes, newest first. Returns [] on any Supabase/config error. */
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
