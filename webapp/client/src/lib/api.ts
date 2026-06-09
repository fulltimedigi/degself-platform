// Public data API for the app.
//
// In the fully-static build there is NO backend. Each function below resolves
// from the in-memory data store (client/src/lib/dataStore.ts), which loads
// /data/workshops.json exactly once via React Query. The function signatures
// and return types are unchanged so pages do not need to be modified.

import * as store from "./dataStore";
import type {
  WorkshopsResponse,
  WorkshopDetail,
  Stats,
  CountItem,
  GovernorateItem,
  MapPoint,
} from "./types";

export interface WorkshopFilters {
  q?: string;
  governorate?: string[];
  specialty?: string[];
  entity_type?: string[];
  service_mode?: string[];
  min_rating?: number;
  open_now?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

// Kept for backwards compatibility / potential deep-link building. No longer
// used to hit a network endpoint, but harmless and side-effect free.
export function buildQuery(f: WorkshopFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.governorate?.length) p.set("governorate", f.governorate.join(","));
  if (f.specialty?.length) p.set("specialty", f.specialty.join(","));
  if (f.entity_type?.length) p.set("entity_type", f.entity_type.join(","));
  if (f.min_rating && f.min_rating > 0) p.set("min_rating", String(f.min_rating));
  if (f.open_now) p.set("open_now", "true");
  if (f.sort) p.set("sort", f.sort);
  if (f.limit != null) p.set("limit", String(f.limit));
  if (f.offset != null) p.set("offset", String(f.offset));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function fetchWorkshops(f: WorkshopFilters): Promise<WorkshopsResponse> {
  return store.fetchWorkshops(f);
}

export function fetchWorkshop(placeId: string): Promise<WorkshopDetail> {
  return store.fetchWorkshop(placeId);
}

export function fetchMapPoints(
  f: WorkshopFilters
): Promise<{ total: number; results: MapPoint[] }> {
  return store.fetchMapPoints(f);
}

export function fetchStats(): Promise<Stats> {
  return store.fetchStats();
}

export function fetchSpecialties(): Promise<CountItem[]> {
  return store.fetchSpecialties();
}

export function fetchEntityTypes(): Promise<CountItem[]> {
  return store.fetchEntityTypes();
}

export function fetchGovernorates(): Promise<GovernorateItem[]> {
  return store.fetchGovernorates();
}
