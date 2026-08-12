import type { Workshop, WorkshopListResponse } from "./types";

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isWorkshop(value: unknown): value is Workshop {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.place_id === "string" &&
    row.place_id.length > 0 &&
    typeof row.name === "string" &&
    row.name.length > 0 &&
    isNullableString(row.reviewed_specialty) &&
    typeof row.entity_type === "string" &&
    typeof row.service_mode === "string" &&
    isNullableString(row.area) &&
    isNullableString(row.neighborhood) &&
    isNullableString(row.governorate) &&
    isNullableString(row.address) &&
    isNullableNumber(row.lat) &&
    isNullableNumber(row.lng) &&
    isNullableString(row.phone) &&
    isNullableString(row.phone_intl) &&
    isNullableString(row.website) &&
    isNullableNumber(row.google_rating) &&
    isNullableNumber(row.google_reviews_count) &&
    isNullableString(row.opening_hours) &&
    isNullableString(row.main_image) &&
    typeof row.emergency_service === "boolean" &&
    typeof row.is_partner === "boolean"
  );
}

export function parseWorkshopList(value: unknown): WorkshopListResponse {
  if (!value || typeof value !== "object") throw new Error("INVALID_WORKSHOP_RESPONSE");
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.workshops)) {
    throw new Error("INVALID_WORKSHOP_RESPONSE");
  }
  // Drop any individual malformed row rather than discarding the whole page/chunk:
  // one bad record must not blank out an entire search page or a saved chunk.
  const workshops = body.workshops.filter(isWorkshop);
  return {
    workshops,
    ...(typeof body.total === "number" && Number.isFinite(body.total)
      ? { total: body.total }
      : {}),
  };
}

export function parseWorkshopDetail(value: unknown): Workshop {
  if (!value || typeof value !== "object") throw new Error("INVALID_WORKSHOP_RESPONSE");
  const workshop = (value as Record<string, unknown>).workshop;
  if (!isWorkshop(workshop)) throw new Error("INVALID_WORKSHOP_RESPONSE");
  return workshop;
}
