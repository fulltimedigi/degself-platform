// degself brand constants & domain mappings

export const ENTITY_TYPES = [
  "كراج",
  "مركز",
  "محل",
  "خدمة",
  "وكيل",
  "ورشة",
  "معرض",
] as const;

// Marker / badge color per entity type (from spec)
export const ENTITY_COLORS: Record<string, string> = {
  كراج: "#FFD60A", // yellow
  مركز: "#3B82F6", // blue
  محل: "#10B981", // green
  خدمة: "#EF4444", // red
  وكيل: "#8B5CF6", // purple
  ورشة: "#F59E0B", // orange
  معرض: "#EC4899", // pink
};

export function entityColor(type: string): string {
  return ENTITY_COLORS[type] || "#9CA3AF";
}

// Single-character glyph shown inside the map pin per entity type
export const ENTITY_GLYPHS: Record<string, string> = {
  كراج: "ك",
  مركز: "م",
  محل: "ش",
  خدمة: "خ",
  وكيل: "و",
  ورشة: "و",
  معرض: "ع",
};

export function entityGlyph(type: string): string {
  return ENTITY_GLYPHS[type] || "·";
}

// English transliteration for type (used in subtle labels)
export const ENTITY_EN: Record<string, string> = {
  كراج: "Garage",
  مركز: "Center",
  محل: "Shop",
  خدمة: "Service",
  وكيل: "Dealer",
  ورشة: "Workshop",
  معرض: "Showroom",
};

// Top 6 specialties used for quick filters on the home page
export const TOP_SPECIALTIES = [
  "صيانة عامة",
  "ميكانيكا",
  "بودي وصبغ",
  "كهرباء سيارات",
  "قير وفتيس",
  "تواير وبنشر",
];

export const GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الجهراء",
  "الأحمدي",
];

// Day name AR labels for the opening-hours table
export const DAY_AR: Record<string, string> = {
  Saturday: "السبت",
  Sunday: "الأحد",
  Monday: "الإثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
};

export const DAY_ORDER = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export function todayName(): string {
  // Kuwait UTC+3
  const now = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const shift = utcMin + 180 >= 1440 ? 1 : 0;
  const idx = (now.getUTCDay() + shift) % 7;
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx];
}

// Format Arabic hours string ("8 AM to 8 PM" stays readable). Translate Closed.
export function formatHours(h: string): string {
  if (!h) return "—";
  const t = h.trim().toLowerCase();
  if (t === "closed") return "مغلق";
  if (t.includes("24")) return "مفتوح 24 ساعة";
  return h;
}

export const KUWAIT_CENTER: [number, number] = [29.3759, 47.9774];
