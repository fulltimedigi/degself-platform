// Client-side data layer for the fully-static build.
//
// Loads /data/workshops.json ONCE (cached in memory + React Query) and performs
// all filtering, searching, sorting, and aggregation in the browser. This
// replaces the Express backend (server/data.ts + server/routes.ts) verbatim so
// the public API surface (api.ts) does not change.

import { queryClient } from "./queryClient";
import type {
  WorkshopsResponse,
  WorkshopDetail,
  WorkshopCard,
  Stats,
  CountItem,
  GovernorateItem,
  MapPoint,
} from "./types";
import type { WorkshopFilters } from "./api";

// ---- Raw workshop record (mirrors server/data.ts Workshop interface) ----
export interface OpeningHour {
  day: string;
  hours: string;
}

export interface Workshop {
  place_id: string;
  name: string;
  entity_type: string;
  specialty: string;
  specialty_hints?: string[];
  category_raw?: string;
  governorate: string;
  area: string;
  address?: string;
  street?: string;
  phone?: string;
  phone_intl?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude: number;
  longitude: number;
  google_url?: string;
  main_image?: string;
  images_count?: number;
  opening_hours?: string;
  opening_hours_raw?: OpeningHour[];
  payments?: string;
  permanently_closed?: boolean;
  active?: boolean;
  description?: string;
  services_offered?: string;
}

// Public URL where Vite serves client/public/data/workshops.json
export const WORKSHOPS_URL = "data/workshops.json";

// React Query key for the single one-time data load.
export const WORKSHOPS_QUERY_KEY = ["__workshops_master__"] as const;

// In-memory cache of active workshops (filtered once on load).
let _cache: Workshop[] | null = null;

// Progress reporting for boot splash.
export type ProgressListener = (loaded: number, total: number) => void;
const _progressListeners = new Set<ProgressListener>();
export function onLoadProgress(fn: ProgressListener): () => void {
  _progressListeners.add(fn);
  return () => _progressListeners.delete(fn);
}
function emitProgress(loaded: number, total: number) {
  _progressListeners.forEach((fn) => fn(loaded, total));
}

async function loadFromNetwork(): Promise<Workshop[]> {
  // Simple fetch — Brotli/gzip from Netlify makes this ~350KB on the wire and
  // typically completes in <1s on 4G. The browser handles decompression.
  emitProgress(0, 0);
  const res = await fetch(WORKSHOPS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load workshops data: ${res.status}`);
  }
  // Indeterminate progress — we cannot reliably know decompressed size up front.
  emitProgress(50, 100);
  const raw = (await res.json()) as Workshop[];
  emitProgress(95, 100);
  // Keep only active records; ensure place_id exists (mirrors server/data.ts).
  const active = raw.filter((w) => w.active !== false && !!w.place_id);
  emitProgress(100, 100);
  // eslint-disable-next-line no-console
  console.log(`[data] loaded ${active.length} active workshops into memory`);
  return active;
}

/**
 * Loads the master workshops file exactly once and caches it in memory and in
 * the React Query cache. Subsequent calls resolve instantly from cache.
 *
 * React Query deduplicates concurrent calls so even with many components
 * mounting at once the network request happens only one time.
 */
// Expose helper for detail page
export function getOpeningRows(w: Workshop): OpeningHour[] {
  return getOpeningHoursRows(w);
}

// In-flight promise to dedupe concurrent calls without going through React Query
// (which can self-recurse if a useQuery hook also calls ensureWorkshops).
let _inflight: Promise<Workshop[]> | null = null;

export async function ensureWorkshops(): Promise<Workshop[]> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const data = await loadFromNetwork();
      _cache = data;
      // Seed React Query cache so any hooks watching the key get the data too.
      queryClient.setQueryData(WORKSHOPS_QUERY_KEY, data);
      return data;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

/** Synchronous accessor — only valid after ensureWorkshops() has resolved. */
export function getWorkshopsSync(): Workshop[] {
  return _cache ?? [];
}

// ========================================================================
// Open-now computation — ported verbatim from server/data.ts (lines 79-134)
// ========================================================================

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Parse "8 AM to 8 PM" / "Open 24 hours" / "Closed" into minutes range(s)
function parseHours(hours: string): Array<[number, number]> | "24" | "closed" {
  if (!hours) return "closed";
  const h = hours.trim().toLowerCase();
  if (h === "closed") return "closed";
  if (h.includes("24 hours") || h.includes("open 24")) return "24";

  const ranges: Array<[number, number]> = [];
  // split multiple ranges by comma
  const parts = hours.split(",");
  for (const part of parts) {
    const m = part.match(
      /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:to|–|-|—)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i
    );
    if (!m) continue;
    let sh = parseInt(m[1], 10);
    const sm = m[2] ? parseInt(m[2], 10) : 0;
    const sap = (m[3] || "").toUpperCase();
    let eh = parseInt(m[4], 10);
    const em = m[5] ? parseInt(m[5], 10) : 0;
    const eap = (m[6] || "").toUpperCase();
    if (sap === "PM" && sh < 12) sh += 12;
    if (sap === "AM" && sh === 12) sh = 0;
    if (eap === "PM" && eh < 12) eh += 12;
    if (eap === "AM" && eh === 12) eh = 0;
    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 24 * 60; // overnight
    ranges.push([start, end]);
  }
  return ranges.length ? ranges : "closed";
}

// Kuwait is UTC+3
export function isOpenNow(w: Workshop, now: Date = new Date()): boolean {
  const rows = w.opening_hours_raw;
  if (!Array.isArray(rows) || !rows.length) return false;
  // Use UTC components + 3h offset (Kuwait is UTC+3)
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kuwaitTotal = (utcMin + 3 * 60) % (24 * 60);
  const dayShift = utcMin + 3 * 60 >= 24 * 60 ? 1 : 0;
  const dayIdx = (now.getUTCDay() + dayShift) % 7;
  const dayName = DAY_MAP[dayIdx];
  const row = rows.find((r) => r.day === dayName);
  if (!row) return false;
  const parsed = parseHours(row.hours);
  if (parsed === "closed") return false;
  if (parsed === "24") return true;
  const minutes = kuwaitTotal;
  return parsed.some(([s, e]) => {
    if (minutes >= s && minutes < e) return true;
    // overnight handled by e>1440 — also check minutes+1440
    if (e > 1440 && minutes + 1440 >= s && minutes + 1440 < e) return true;
    return false;
  });
}

// ========================================================================
// Helpers — ported verbatim from server/routes.ts
// ========================================================================

function toCard(w: Workshop): WorkshopCard {
  return {
    place_id: w.place_id,
    name: w.name,
    entity_type: w.entity_type,
    specialty: w.specialty,
    governorate: w.governorate,
    area: w.area,
    rating: w.rating ?? null,
    reviews_count: w.reviews_count ?? 0,
    latitude: w.latitude,
    longitude: w.longitude,
    main_image: w.main_image ?? null,
    phone_intl: w.phone_intl ?? null,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function countBy<T>(arr: T[], key: (t: T) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// ========================================================================
// Data-layer functions — mirror the Express route handlers, operate in memory
// ========================================================================

/** Mirrors GET /api/workshops — filtered + paginated */
export async function fetchWorkshops(f: WorkshopFilters): Promise<WorkshopsResponse> {
  const all = await ensureWorkshops();

  const q = f.q?.trim().toLowerCase();
  const govs = f.governorate ?? [];
  const specs = f.specialty ?? [];
  const types = f.entity_type ?? [];
  const minRating = f.min_rating ?? 0;
  const openNow = !!f.open_now;
  const sort = f.sort || "rating";
  const limit = clamp(f.limit ?? 50, 1, 200);
  const offset = Math.max(0, f.offset ?? 0);

  let rows = all;
  if (govs.length) rows = rows.filter((w) => govs.includes(w.governorate));
  if (specs.length) rows = rows.filter((w) => specs.includes(w.specialty));
  if (types.length) rows = rows.filter((w) => types.includes(w.entity_type));
  if (minRating > 0) rows = rows.filter((w) => (w.rating ?? 0) >= minRating);
  if (openNow) {
    const now = new Date();
    rows = rows.filter((w) => isOpenNow(w, now));
  }
  if (q) {
    rows = rows.filter((w) => {
      const hay = [
        w.name,
        w.specialty,
        w.entity_type,
        w.governorate,
        w.area,
        w.address,
        w.category_raw,
        ...(w.specialty_hints || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  // sort
  if (sort === "name") {
    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  } else if (sort === "reviews") {
    rows = [...rows].sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0));
  } else {
    // rating (default) — rating desc, then reviews desc
    rows = [...rows].sort((a, b) => {
      const dr = (b.rating ?? 0) - (a.rating ?? 0);
      if (dr !== 0) return dr;
      return (b.reviews_count ?? 0) - (a.reviews_count ?? 0);
    });
  }

  const total = rows.length;
  const page = rows.slice(offset, offset + limit).map(toCard);
  return { total, limit, offset, results: page };
}

/** Mirrors GET /api/workshops/:place_id — single workshop (full) */
export async function fetchWorkshop(placeId: string): Promise<WorkshopDetail> {
  const all = await ensureWorkshops();
  const w = all.find((x) => x.place_id === placeId);
  if (!w) {
    throw new Error("404: Workshop not found");
  }
  // Reconstruct fields that were stripped from the JSON to keep payload small
  const opening_hours_raw = getOpeningHoursRows(w);
  const google_url = w.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.name)}&query_place_id=${w.place_id}`
    : (w.latitude && w.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${w.latitude},${w.longitude}`
        : undefined);
  return {
    ...(w as unknown as WorkshopDetail),
    opening_hours_raw,
    google_url,
    open_now: isOpenNow(w),
  };
}

/** Mirrors GET /api/workshops/map — lightweight list for map */
export async function fetchMapPoints(
  f: WorkshopFilters
): Promise<{ total: number; results: MapPoint[] }> {
  const all = await ensureWorkshops();

  const govs = f.governorate ?? [];
  const specs = f.specialty ?? [];
  const types = f.entity_type ?? [];
  const minRating = f.min_rating ?? 0;
  const openNow = !!f.open_now;
  const q = f.q?.trim().toLowerCase();

  let rows = all;
  if (govs.length) rows = rows.filter((w) => govs.includes(w.governorate));
  if (specs.length) rows = rows.filter((w) => specs.includes(w.specialty));
  if (types.length) rows = rows.filter((w) => types.includes(w.entity_type));
  if (minRating > 0) rows = rows.filter((w) => (w.rating ?? 0) >= minRating);
  if (openNow) {
    const now = new Date();
    rows = rows.filter((w) => isOpenNow(w, now));
  }
  if (q) {
    rows = rows.filter((w) =>
      [w.name, w.specialty, w.area, w.governorate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return {
    total: rows.length,
    results: rows.map((w) => ({
      place_id: w.place_id,
      name: w.name,
      entity_type: w.entity_type,
      specialty: w.specialty,
      rating: w.rating ?? null,
      area: w.area,
      latitude: w.latitude,
      longitude: w.longitude,
    })),
  };
}

/** Mirrors GET /api/stats */
export async function fetchStats(): Promise<Stats> {
  const all = await ensureWorkshops();
  const by_governorate = countBy(all, (w) => w.governorate);
  const by_specialty = countBy(all, (w) => w.specialty);
  const by_entity_type = countBy(all, (w) => w.entity_type);
  return {
    total: all.length,
    governorate_count: Object.keys(by_governorate).length,
    specialty_count: Object.keys(by_specialty).length,
    by_governorate,
    by_specialty,
    by_entity_type,
  };
}

/** Mirrors GET /api/specialties — list with counts */
export async function fetchSpecialties(): Promise<CountItem[]> {
  const all = await ensureWorkshops();
  const counts = countBy(all, (w) => w.specialty);
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Mirrors GET /api/entity-types — list with counts */
export async function fetchEntityTypes(): Promise<CountItem[]> {
  const all = await ensureWorkshops();
  const counts = countBy(all, (w) => w.entity_type);
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Mirrors GET /api/governorates — list with counts and top areas */
export async function fetchGovernorates(): Promise<GovernorateItem[]> {
  const all = await ensureWorkshops();
  const map = new Map<string, { count: number; areas: Map<string, number> }>();
  for (const w of all) {
    if (!w.governorate) continue;
    if (!map.has(w.governorate))
      map.set(w.governorate, { count: 0, areas: new Map() });
    const g = map.get(w.governorate)!;
    g.count++;
    if (w.area) g.areas.set(w.area, (g.areas.get(w.area) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, g]) => ({
      name,
      count: g.count,
      areas: Array.from(g.areas.entries())
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}
