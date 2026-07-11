// Pure, client-safe quote types + status/urgency presentation helpers. No server
// imports live here, so both server components and "use client" components can
// import from this module without pulling the service-role Supabase client into
// the browser bundle. Data-fetching functions live in ./quotes (server only).

// Mirrors public.quotes (migrations 013 + 015). Rows carry customer PII (phone);
// only ever fetched server-side via the service-role key.
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
  customer_token: string | null;
  matched_workshops: unknown;
  admin_notes: string | null;
  source: string;
}

// One offer a workshop sent back for a quote (public.quote_offers, migration 015).
export interface QuoteOffer {
  id: string;
  quote_id: string;
  workshop_name: string;
  workshop_phone: string | null;
  price_kwd: number;
  estimated_duration: string | null;
  notes: string | null;
  status: string; // pending | accepted | rejected
  created_at: string;
  accepted_at: string | null;
}

// The full quote lifecycle (migration 015 CHECK). Order is the natural funnel.
export const QUOTE_STATUSES = [
  "new",
  "forwarded",
  "awaiting_offers",
  "offers_sent",
  "accepted",
  "declined",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// Arabic label + badge palette per lifecycle status.
export const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "جديد", className: "bg-[#FFD60A] text-[#0A0A0A]" },
  forwarded: { label: "محوّل للكراجات", className: "bg-[#FFD60A] text-[#0A0A0A]" },
  awaiting_offers: { label: "في انتظار العروض", className: "bg-blue-500 text-white" },
  offers_sent: { label: "أُرسلت العروض للعميل", className: "bg-purple-500 text-white" },
  accepted: { label: "تم القبول", className: "bg-green-600 text-white" },
  declined: { label: "رفض العميل", className: "bg-neutral-600 text-white" },
  expired: { label: "منتهي", className: "bg-red-600 text-white" },
};

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[status ?? "new"] ?? STATUS_META.new;
}

export function isValidQuoteStatus(s: unknown): s is QuoteStatus {
  return typeof s === "string" && (QUOTE_STATUSES as readonly string[]).includes(s);
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
