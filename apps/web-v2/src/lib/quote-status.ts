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
  garage_token: string | null;
  matched_workshops: unknown;
  admin_notes: string | null;
  source: string;
}

// Pricing type — the garage picks ONE (migration 017). price_kwd meaning:
//   fixed       → the price
//   range       → the lower bound (upper bound = price_max_kwd)
//   conditional → the single price
export const PRICING_TYPES = ["fixed", "range", "conditional"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

export const PRICING_TYPE_META: Record<
  PricingType,
  { label: string; badge: string; className: string }
> = {
  fixed: { label: "سعر ثابت", badge: "ثابت", className: "bg-green-600 text-white" },
  range: { label: "رنج (من–إلى)", badge: "من–إلى", className: "bg-amber-500 text-[#0A0A0A]" },
  conditional: {
    label: "مشروط بالتشخيص",
    badge: "مشروط بالفحص",
    className: "bg-blue-500 text-white",
  },
};

// Parts type enum (migration 017) — the biggest driver of price differences.
export const PARTS_TYPES = [
  "original",
  "commercial_a",
  "commercial",
  "used",
  "labor_only",
] as const;
export type PartsType = (typeof PARTS_TYPES)[number];

export const PARTS_TYPE_LABEL: Record<PartsType, string> = {
  original: "أصلي (وكالة)",
  commercial_a: "تجاري درجة أولى",
  commercial: "تجاري",
  used: "مستعمل",
  labor_only: "أجرة عمل فقط (بدون قطع)",
};

// Network rule constants (mirror migration 017 CHECK constraints).
export const RANGE_MAX_MULTIPLIER = 1.3; // upper ≤ lower × 1.3
export const MIN_WARRANTY_DAYS = 7; // network minimum
export const DEFAULT_VALIDITY_DAYS = 3;

// Protection clause — printed verbatim on the customer page for every
// conditional offer (spec §4). Do not paraphrase.
export const CONDITIONAL_PROTECTION_CLAUSE =
  "إذا اختلف التشخيص الفعلي بعد الفحص عن التشخيص المذكور في هذا العرض، يلتزم " +
  "الكراج بإبلاغ العميل بالسعر الجديد قبل بدء أي عمل، وللعميل حق الانسحاب دون " +
  "أي تكلفة عدا رسم الكشف المعلن مسبقاً (إن وجد).";

export function pricingTypeMeta(t: string | null | undefined) {
  return PRICING_TYPE_META[(t ?? "fixed") as PricingType] ?? PRICING_TYPE_META.fixed;
}

// One offer a workshop sent back for a quote (public.quote_offers, migrations 015 + 017).
export interface QuoteOffer {
  id: string;
  quote_id: string;
  workshop_name: string;
  workshop_phone: string | null;
  pricing_type: string; // fixed | range | conditional
  price_kwd: number; // fixed→price, range→min, conditional→price
  price_max_kwd: number | null; // range upper bound
  assumed_diagnosis: string | null; // conditional
  inspection_fee_kwd: number | null; // conditional (0 = free)
  parts_type: string | null; // original | commercial_a | commercial | used | labor_only
  validity_days: number; // offer stays live for created_at + validity_days
  warranty_days: number | null; // ≥ 7 for new offers
  warranty_note: string | null;
  estimated_duration: string | null;
  notes: string | null;
  status: string; // pending | accepted | rejected
  created_at: string;
  accepted_at: string | null;
}

// True once created_at + validity_days has passed. Legacy rows always carry a
// validity_days default of 3, so this stays well-defined for old offers too.
export function isOfferExpired(
  createdAt: string,
  validityDays: number | null | undefined,
  now: number = Date.now()
): boolean {
  const days = validityDays && validityDays > 0 ? validityDays : DEFAULT_VALIDITY_DAYS;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false; // never hide on an unparseable date
  return created + days * 24 * 60 * 60 * 1000 < now;
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
