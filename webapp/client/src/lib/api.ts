import { apiRequest } from "./queryClient";
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
  min_rating?: number;
  open_now?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

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

export async function fetchWorkshops(f: WorkshopFilters): Promise<WorkshopsResponse> {
  const res = await apiRequest("GET", `/api/workshops${buildQuery(f)}`);
  return res.json();
}

export async function fetchWorkshop(placeId: string): Promise<WorkshopDetail> {
  const res = await apiRequest("GET", `/api/workshops/${encodeURIComponent(placeId)}`);
  return res.json();
}

export async function fetchMapPoints(f: WorkshopFilters): Promise<{ total: number; results: MapPoint[] }> {
  const res = await apiRequest("GET", `/api/workshops/map${buildQuery(f)}`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await apiRequest("GET", "/api/stats");
  return res.json();
}

export async function fetchSpecialties(): Promise<CountItem[]> {
  const res = await apiRequest("GET", "/api/specialties");
  return res.json();
}

export async function fetchEntityTypes(): Promise<CountItem[]> {
  const res = await apiRequest("GET", "/api/entity-types");
  return res.json();
}

export async function fetchGovernorates(): Promise<GovernorateItem[]> {
  const res = await apiRequest("GET", "/api/governorates");
  return res.json();
}
