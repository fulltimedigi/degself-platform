// Opening-hours logic — ported from v1 (webapp/client/src/lib/dataStore.ts).
// Kuwait is UTC+3. The opening_hours column is a pipe-separated Arabic string:
//   "الإثنين: 8 AM to 8 PM | الجمعة: Closed | ..."

export interface OpeningHour {
  day: string; // canonical English key
  hours: string;
}

const AR_TO_EN_DAY: Record<string, string> = {
  السبت: "Saturday",
  الأحد: "Sunday",
  الإثنين: "Monday",
  الاثنين: "Monday",
  الثلاثاء: "Tuesday",
  الأربعاء: "Wednesday",
  الخميس: "Thursday",
  الجمعة: "Friday",
};

export const DAY_AR: Record<string, string> = {
  Saturday: "السبت",
  Sunday: "الأحد",
  Monday: "الإثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
};

// Kuwait week starts on Saturday
export const DAY_ORDER = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export function parseOpeningHoursString(s: string | null | undefined): OpeningHour[] {
  if (!s) return [];
  const parts = s.split(/\s*\|\s*|\s*\n\s*|\s*;\s*/).filter(Boolean);
  const out: OpeningHour[] = [];
  for (const part of parts) {
    const m = part.match(/^([A-Za-z؀-ۿ]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const rawDay = m[1].trim();
    out.push({ day: AR_TO_EN_DAY[rawDay] || rawDay, hours: m[2].trim() });
  }
  return out;
}

function parseHours(hours: string): Array<[number, number]> | "24" | "closed" {
  if (!hours) return "closed";
  const h = hours.trim().toLowerCase();
  if (h === "closed" || h === "مغلق") return "closed";
  if (h.includes("24")) return "24";

  const ranges: Array<[number, number]> = [];
  for (const part of hours.split(",")) {
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

/** Canonical English day name for "now" in Kuwait (UTC+3). */
export function todayName(now: Date = new Date()): string {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const dayShift = utcMin + 3 * 60 >= 24 * 60 ? 1 : 0;
  const dayIdx = (now.getUTCDay() + dayShift) % 7;
  return DAY_MAP[dayIdx];
}

/** Is the place open right now (Kuwait time)? */
export function isOpenNow(
  openingHours: string | null | undefined,
  now: Date = new Date()
): boolean {
  const rows = parseOpeningHoursString(openingHours);
  if (!rows.length) return false;
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kuwaitTotal = (utcMin + 3 * 60) % (24 * 60);
  const row = rows.find((r) => r.day === todayName(now));
  if (!row) return false;
  const parsed = parseHours(row.hours);
  if (parsed === "closed") return false;
  if (parsed === "24") return true;
  return parsed.some(([s, e]) => {
    if (kuwaitTotal >= s && kuwaitTotal < e) return true;
    if (e > 1440 && kuwaitTotal + 1440 >= s && kuwaitTotal + 1440 < e) return true;
    return false;
  });
}

/** Human label for an hours cell. */
export function formatHours(h: string): string {
  if (!h) return "—";
  const t = h.trim().toLowerCase();
  if (t === "closed") return "مغلق";
  if (t.includes("24")) return "مفتوح ٢٤ ساعة";
  return h;
}
