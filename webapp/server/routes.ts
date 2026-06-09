import type { Express } from "express";
import type { Server } from "node:http";
import { getWorkshops, isOpenNow, type Workshop } from "./data";

function toCard(w: Workshop) {
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const all = getWorkshops();

  // GET /api/workshops — filtered + paginated
  app.get("/api/workshops", (req, res) => {
    const q = (req.query.q as string | undefined)?.trim().toLowerCase();
    const govs = parseMulti(req.query.governorate);
    const specs = parseMulti(req.query.specialty);
    const types = parseMulti(req.query.entity_type);
    const minRating = req.query.min_rating
      ? parseFloat(req.query.min_rating as string)
      : 0;
    const openNow = req.query.open_now === "true" || req.query.open_now === "1";
    const sort = (req.query.sort as string) || "rating";
    const limit = clamp(parseInt((req.query.limit as string) || "50", 10), 1, 200);
    const offset = Math.max(0, parseInt((req.query.offset as string) || "0", 10));

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
    res.json({ total, limit, offset, results: page });
  });

  // GET /api/workshops/map — lightweight list for map (no pagination, optional filters)
  app.get("/api/workshops/map", (req, res) => {
    const govs = parseMulti(req.query.governorate);
    const specs = parseMulti(req.query.specialty);
    const types = parseMulti(req.query.entity_type);
    const minRating = req.query.min_rating
      ? parseFloat(req.query.min_rating as string)
      : 0;
    const openNow = req.query.open_now === "true" || req.query.open_now === "1";
    const q = (req.query.q as string | undefined)?.trim().toLowerCase();

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
    res.json({
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
    });
  });

  // GET /api/workshops/:place_id — single workshop (full)
  app.get("/api/workshops/:place_id", (req, res) => {
    const w = all.find((x) => x.place_id === req.params.place_id);
    if (!w) return res.status(404).json({ message: "Workshop not found" });
    res.json({ ...w, open_now: isOpenNow(w) });
  });

  // GET /api/stats
  app.get("/api/stats", (_req, res) => {
    const by_governorate = countBy(all, (w) => w.governorate);
    const by_specialty = countBy(all, (w) => w.specialty);
    const by_entity_type = countBy(all, (w) => w.entity_type);
    res.json({
      total: all.length,
      governorate_count: Object.keys(by_governorate).length,
      specialty_count: Object.keys(by_specialty).length,
      by_governorate,
      by_specialty,
      by_entity_type,
    });
  });

  // GET /api/specialties — list with counts
  app.get("/api/specialties", (_req, res) => {
    const counts = countBy(all, (w) => w.specialty);
    const list = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    res.json(list);
  });

  // GET /api/entity-types — list with counts
  app.get("/api/entity-types", (_req, res) => {
    const counts = countBy(all, (w) => w.entity_type);
    const list = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    res.json(list);
  });

  // GET /api/governorates — list with counts and areas
  app.get("/api/governorates", (_req, res) => {
    const map = new Map<string, { count: number; areas: Map<string, number> }>();
    for (const w of all) {
      if (!w.governorate) continue;
      if (!map.has(w.governorate))
        map.set(w.governorate, { count: 0, areas: new Map() });
      const g = map.get(w.governorate)!;
      g.count++;
      if (w.area) g.areas.set(w.area, (g.areas.get(w.area) || 0) + 1);
    }
    const list = Array.from(map.entries())
      .map(([name, g]) => ({
        name,
        count: g.count,
        areas: Array.from(g.areas.entries())
          .map(([area, count]) => ({ area, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);
    res.json(list);
  });

  return httpServer;
}

// ---- helpers ----
function parseMulti(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => String(x).split(",")).map((s) => s.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
