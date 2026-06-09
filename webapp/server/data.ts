import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

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

function resolveDataFile(): string {
  const candidates = [
    path.resolve(process.cwd(), "server/data/workshops.json"),
    path.resolve(process.cwd(), "data/workshops.json"),
    path.resolve(import.meta.dirname ?? __dirname, "data/workshops.json"),
    path.resolve(import.meta.dirname ?? __dirname, "../server/data/workshops.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // last resort: throw with helpful message
  throw new Error(
    "workshops.json not found. Looked in: " + candidates.join(", ")
  );
}

let _cache: Workshop[] | null = null;

export function getWorkshops(): Workshop[] {
  if (_cache) return _cache;
  const file = resolveDataFile();
  const raw = JSON.parse(readFileSync(file, "utf-8")) as Workshop[];
  // Keep only active records; ensure place_id exists
  _cache = raw.filter((w) => w.active !== false && !!w.place_id);
  // eslint-disable-next-line no-console
  console.log(`[data] loaded ${_cache.length} active workshops into memory`);
  return _cache;
}

// ---- Open-now computation ----
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
