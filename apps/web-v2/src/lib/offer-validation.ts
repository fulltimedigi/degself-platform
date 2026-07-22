// Shared, client-safe validation for structured offers (نظام العرض الموحد).
// The SAME rules run client-side (live field feedback in QuoteAdminControls) and
// server-side (authoritative, in the offers API route). No server imports here.
import {
  PRICING_TYPES,
  PARTS_TYPES,
  RANGE_MAX_MULTIPLIER,
  MIN_WARRANTY_DAYS,
  type PricingType,
  type PartsType,
} from "@/lib/quote-status";

// Raw form/body shape — every field arrives as a string (form inputs / JSON).
export interface OfferInput {
  workshop_name?: unknown;
  workshop_phone?: unknown;
  pricing_type?: unknown;
  price_kwd?: unknown; // fixed→price, range→min, conditional→price
  price_max_kwd?: unknown; // range only
  assumed_diagnosis?: unknown; // conditional only
  inspection_fee_kwd?: unknown; // conditional only (0 = free)
  parts_type?: unknown;
  validity_days?: unknown;
  warranty_days?: unknown;
  warranty_note?: unknown;
  estimated_duration?: unknown;
  notes?: unknown;
}

// The clean, DB-ready row (matches the quote_offers insert shape).
export interface NormalizedOffer {
  workshop_name: string;
  workshop_phone: string | null;
  pricing_type: PricingType;
  price_kwd: number;
  price_max_kwd: number | null;
  assumed_diagnosis: string | null;
  inspection_fee_kwd: number | null;
  parts_type: PartsType;
  validity_days: number;
  warranty_days: number;
  warranty_note: string | null;
  estimated_duration: string | null;
  notes: string | null;
}

// Field-keyed error messages (Arabic). Empty object === valid.
export type OfferErrors = Partial<Record<keyof OfferInput | "form", string>>;

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

// Accepts number or numeric string (Arabic digits too). Returns NaN if unusable.
function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const latin = v.trim().replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  if (!latin) return NaN;
  return Number(latin);
}

/**
 * Validate + normalize a structured offer. Pure; safe on client and server.
 * Returns { errors } (field-keyed) when invalid, or { value } when valid.
 */
export function validateOffer(
  input: OfferInput
): { errors: OfferErrors; value?: undefined } | { errors?: undefined; value: NormalizedOffer } {
  const errors: OfferErrors = {};

  // Workshop name (required).
  const workshop_name = trimOrNull(input.workshop_name, 120);
  if (!workshop_name) errors.workshop_name = "اكتب اسم الكراج.";

  // Pricing type (required, enum).
  const pricing_type = typeof input.pricing_type === "string" ? input.pricing_type : "";
  if (!(PRICING_TYPES as readonly string[]).includes(pricing_type)) {
    errors.pricing_type = "اختر نوع التسعير.";
  }

  // Price by type.
  const price_kwd = toNum(input.price_kwd);
  let price_max_kwd: number | null = null;
  let assumed_diagnosis: string | null = null;
  let inspection_fee_kwd: number | null = null;

  if (pricing_type === "fixed" || pricing_type === "conditional") {
    if (!Number.isFinite(price_kwd) || price_kwd <= 0) {
      errors.price_kwd = "اكتب سعراً صحيحاً أكبر من صفر.";
    }
  } else if (pricing_type === "range") {
    if (!Number.isFinite(price_kwd) || price_kwd <= 0) {
      errors.price_kwd = "اكتب الحد الأدنى للسعر.";
    }
    price_max_kwd = toNum(input.price_max_kwd);
    if (!Number.isFinite(price_max_kwd) || price_max_kwd <= 0) {
      errors.price_max_kwd = "اكتب الحد الأعلى للسعر.";
    } else if (Number.isFinite(price_kwd) && price_max_kwd < price_kwd) {
      errors.price_max_kwd = "الحد الأعلى لا يقل عن الحد الأدنى.";
    } else if (
      Number.isFinite(price_kwd) &&
      price_kwd > 0 &&
      price_max_kwd > price_kwd * RANGE_MAX_MULTIPLIER
    ) {
      errors.price_max_kwd = `الحد الأعلى ≤ الحد الأدنى × ${RANGE_MAX_MULTIPLIER} (بحد أقصى ${(
        price_kwd * RANGE_MAX_MULTIPLIER
      ).toFixed(3)} د.ك).`;
    }
  }

  // Conditional extras: assumed diagnosis + declared inspection fee (0 = free).
  if (pricing_type === "conditional") {
    assumed_diagnosis = trimOrNull(input.assumed_diagnosis, 300);
    if (!assumed_diagnosis) errors.assumed_diagnosis = "اكتب التشخيص المرجّح.";
    inspection_fee_kwd = toNum(input.inspection_fee_kwd);
    if (!Number.isFinite(inspection_fee_kwd) || inspection_fee_kwd < 0) {
      errors.inspection_fee_kwd = "اكتب رسم الكشف (صفر = مجاني).";
    }
  }

  // Parts type (required, enum).
  const parts_type = typeof input.parts_type === "string" ? input.parts_type : "";
  if (!(PARTS_TYPES as readonly string[]).includes(parts_type)) {
    errors.parts_type = "اختر نوع قطع الغيار.";
  }

  // Validity (required, ≥ 1).
  const validity_days = toNum(input.validity_days);
  if (!Number.isFinite(validity_days) || !Number.isInteger(validity_days) || validity_days < 1) {
    errors.validity_days = "اكتب صلاحية العرض بالأيام (١ على الأقل).";
  }

  // Warranty (required, ≥ 7).
  const warranty_days = toNum(input.warranty_days);
  if (!Number.isFinite(warranty_days) || !Number.isInteger(warranty_days)) {
    errors.warranty_days = "اكتب مدة الضمان بالأيام.";
  } else if (warranty_days < MIN_WARRANTY_DAYS) {
    errors.warranty_days = `الحد الأدنى للضمان ${MIN_WARRANTY_DAYS} أيام.`;
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: {
      workshop_name: workshop_name!,
      workshop_phone: trimOrNull(input.workshop_phone, 20),
      pricing_type: pricing_type as PricingType,
      price_kwd,
      price_max_kwd: pricing_type === "range" ? price_max_kwd : null,
      assumed_diagnosis: pricing_type === "conditional" ? assumed_diagnosis : null,
      inspection_fee_kwd: pricing_type === "conditional" ? inspection_fee_kwd : null,
      parts_type: parts_type as PartsType,
      validity_days,
      warranty_days,
      warranty_note: trimOrNull(input.warranty_note, 300),
      estimated_duration: trimOrNull(input.estimated_duration, 60),
      notes: trimOrNull(input.notes, 500),
    },
  };
}
