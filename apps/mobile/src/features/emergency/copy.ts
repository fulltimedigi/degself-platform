// Localized copy + service config for the roadside Emergency screen. Mirrors
// the web platform's /emergency page (tow vs mobile), and additionally breaks
// out "mobile tyre" (بنشر متنقل) as its own shortcut. Self-contained (ar/en
// authored; hi/ur fall back to en), matching the other feature copy modules.
export type EmergencyLocale = "ar" | "en" | "hi" | "ur";

// The three roadside services. Keys are stable/locale-independent; the mobile
// API maps them onto the catalog's service_mode (+ reviewed_specialty for tyre).
export type EmergencyServiceKey = "tow" | "mobile" | "tire";

// The audited reviewed_specialty label for tyre/puncture shops in the catalog.
export const TIRE_SPECIALTY = "تواير وبنشر";

export type EmergencyServiceConfig = {
  key: EmergencyServiceKey;
  serviceMode: "tow" | "mobile";
  specialty?: string;
};

export const EMERGENCY_SERVICES: readonly EmergencyServiceConfig[] = [
  { key: "tow", serviceMode: "tow" },
  { key: "mobile", serviceMode: "mobile" },
  { key: "tire", serviceMode: "mobile", specialty: TIRE_SPECIALTY },
] as const;

type ServiceStrings = { label: string; tagline: string };

type Copy = {
  badge: string; // "Emergency services"
  title: string; // "Car broken down right now?"
  subtitle: string;
  resultCount: string; // "%d providers" — %d replaced at render
  services: Record<EmergencyServiceKey, ServiceStrings>;
  tipsTitle: string;
  tips: readonly string[];
  loading: string;
  loadError: string;
  retry: string;
  empty: string;
  back: string;
  open: string; // accessibility label for the entry banner
};

const ar: Copy = {
  badge: "خدمات الطوارئ",
  title: "سيارتك عطلانة الحين؟",
  subtitle: "اختر الخدمة المناسبة، واتصل مباشرة بأقرب مزوّد.",
  resultCount: "%d مزوّد",
  services: {
    tow: { label: "سطحة / ونش", tagline: "نقل سيارتك المعطلة لأقرب كراج." },
    mobile: { label: "كراج متنقل", tagline: "تصليح / بطارية / كهرباء في موقعك." },
    tire: { label: "بنشر متنقل", tagline: "تبديل وتصليح الإطارات في موقعك." },
  },
  tipsTitle: "نصائح قبل الاتصال",
  tips: [
    "جهّز موقعك بدقة (شارع، قطعة، علامة مميزة قريبة).",
    "اتفق على السعر التقريبي قبل وصول الخدمة.",
    "اوصف العطل بوضوح (لا يشتغل، بنشر، بطارية، حادث…).",
  ],
  loading: "جارٍ التحميل…",
  loadError: "تعذّر تحميل النتائج.",
  retry: "إعادة المحاولة",
  empty: "لا يوجد مزوّدون لهذه الخدمة حاليًا.",
  back: "رجوع",
  open: "خدمات الطوارئ",
};

const en: Copy = {
  badge: "Emergency services",
  title: "Car broken down right now?",
  subtitle: "Pick the service you need and call the nearest provider directly.",
  resultCount: "%d providers",
  services: {
    tow: { label: "Tow truck", tagline: "Haul your disabled car to the nearest garage." },
    mobile: { label: "Mobile garage", tagline: "Repair / battery / electrics at your location." },
    tire: { label: "Mobile tyre", tagline: "Tyre change and puncture repair at your location." },
  },
  tipsTitle: "Before you call",
  tips: [
    "Have your exact location ready (street, block, a nearby landmark).",
    "Agree on an approximate price before the service arrives.",
    "Describe the fault clearly (won't start, flat tyre, battery, accident…).",
  ],
  loading: "Loading…",
  loadError: "Couldn't load results.",
  retry: "Retry",
  empty: "No providers for this service right now.",
  back: "Back",
  open: "Emergency services",
};

const TABLE: Record<EmergencyLocale, Copy> = { ar, en, hi: en, ur: en };

export function emergencyCopy(locale: string): Copy {
  return TABLE[locale as EmergencyLocale] ?? ar;
}
