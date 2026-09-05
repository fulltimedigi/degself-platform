import type { Workshop } from "@/lib/types";

export const MOBILE_WORKSHOP_LIMIT_MAX = 30;
export const MOBILE_WORKSHOP_IDS_MAX = 100;
export const MOBILE_WORKSHOP_OFFSET_MAX = 10_000;

// The only service_mode values the catalog carries (see web-v2 migrations). An
// unknown value is dropped rather than passed to the DB filter, so a bad query
// param can never turn into an empty/garbage `.eq()` match.
export const MOBILE_SERVICE_MODES = ["fixed", "mobile", "tow"] as const;
export type MobileServiceMode = (typeof MOBILE_SERVICE_MODES)[number];

// reviewed_specialty is a short curated Arabic label ("تواير وبنشر", …). Bound
// the length so an oversized value can't bloat the DB query string.
const MOBILE_SPECIALTY_MAX = 60;

export type MobileWorkshop = Pick<
  Workshop,
  | "place_id"
  | "name"
  | "reviewed_specialty"
  | "entity_type"
  | "service_mode"
  | "area"
  | "neighborhood"
  | "governorate"
  | "address"
  | "lat"
  | "lng"
  | "phone"
  | "phone_intl"
  | "website"
  | "google_rating"
  | "google_reviews_count"
  | "opening_hours"
  | "main_image"
  | "emergency_service"
  | "is_partner"
>;

export type MobileWorkshopRequest =
  | { kind: "detail"; placeId: string }
  | { kind: "saved"; ids: string[] }
  | {
      kind: "search";
      query: string;
      limit: number;
      offset: number;
      serviceMode?: MobileServiceMode;
      specialty?: string;
    };

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseMobileWorkshopRequest(url: URL): MobileWorkshopRequest {
  const placeId = (url.searchParams.get("place_id") ?? "").trim();
  if (placeId) {
    if (placeId.length > 256) throw new Error("INVALID_PLACE_ID");
    return { kind: "detail", placeId };
  }

  const idsParam = url.searchParams.get("ids");
  if (idsParam !== null) {
    const ids = [...new Set(idsParam.split(",").map((id) => id.trim()).filter(Boolean))];
    if (ids.some((id) => id.length > 256)) throw new Error("INVALID_PLACE_ID");
    return { kind: "saved", ids: ids.slice(0, MOBILE_WORKSHOP_IDS_MAX) };
  }

  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const rawMode = (url.searchParams.get("service_mode") ?? "").trim();
  const serviceMode = (MOBILE_SERVICE_MODES as readonly string[]).includes(rawMode)
    ? (rawMode as MobileServiceMode)
    : undefined;
  const rawSpecialty = (url.searchParams.get("specialty") ?? "")
    .trim()
    .slice(0, MOBILE_SPECIALTY_MAX);
  const specialty = rawSpecialty || undefined;
  return {
    kind: "search",
    query,
    limit: boundedInteger(url.searchParams.get("limit"), 20, 1, MOBILE_WORKSHOP_LIMIT_MAX),
    offset: boundedInteger(
      url.searchParams.get("offset"),
      0,
      0,
      MOBILE_WORKSHOP_OFFSET_MAX
    ),
    ...(serviceMode ? { serviceMode } : {}),
    ...(specialty ? { specialty } : {}),
  };
}

export function isPublicMobileWorkshop(workshop: Workshop): boolean {
  return (
    workshop.active &&
    !workshop.permanently_closed &&
    workshop.is_automotive &&
    !workshop.out_of_scope
  );
}

function safePublicUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function toMobileWorkshop(workshop: Workshop): MobileWorkshop {
  return {
    place_id: workshop.place_id,
    name: workshop.name,
    reviewed_specialty: workshop.reviewed_specialty,
    entity_type: workshop.entity_type,
    service_mode: workshop.service_mode,
    area: workshop.area,
    neighborhood: workshop.neighborhood,
    governorate: workshop.governorate,
    address: workshop.address,
    lat: workshop.lat,
    lng: workshop.lng,
    phone: workshop.phone,
    phone_intl: workshop.phone_intl,
    website: safePublicUrl(workshop.website),
    google_rating: workshop.google_rating,
    google_reviews_count: workshop.google_reviews_count,
    opening_hours: workshop.opening_hours,
    main_image: safePublicUrl(workshop.main_image),
    emergency_service: workshop.emergency_service,
    is_partner: workshop.is_partner,
  };
}
