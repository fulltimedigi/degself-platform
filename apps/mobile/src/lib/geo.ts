// Pure geo helpers shared by the native Map and Emergency screens. No RN or
// Expo imports, so they are unit-testable with the repo's node:test runner.

export type Coords = { lat: number; lng: number };

/** Great-circle distance in kilometres between two lat/lng points (haversine). */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371; // Earth radius, km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Short human distance label, e.g. "٤٫٢ كم" style handled by caller; here plain. */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Apple/Google-agnostic driving-directions URL to a destination. `maps.apple.com`
 * opens Apple Maps on iOS and falls back to a browser elsewhere; callers on
 * Android can prefer a geo: intent, but this is a safe universal default.
 */
export function directionsUrl(dest: Coords, label?: string): string {
  const q = label ? `&q=${encodeURIComponent(label)}` : "";
  return `https://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=d${q}`;
}
