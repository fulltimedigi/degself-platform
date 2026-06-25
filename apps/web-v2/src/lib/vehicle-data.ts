/**
 * vehicle-data.ts
 *
 * بيانات السوق الكويتي للسيارات.
 * تُستخدم في VehicleSelector على /asaali وفي تركيب الـ vehicle context للـ LLM.
 *
 * الترتيب يعكس شعبية الماركات في الكويت:
 *   Toyota, Lexus, Nissan أولاً (الأكثر شيوعاً)
 *   ثم باقي الماركات اليابانية والكورية
 *   ثم الأوروبية والأمريكية
 *
 * الموديلات لكل ماركة هي الأكثر شيوعاً (مش كل الموديلات حتى لا تكون القائمة طويلة).
 */

export interface VehicleMake {
  id: string;       // identifier (lowercase, no spaces) — used as value
  name_ar: string;  // الاسم بالعربي للعرض
  name_en: string;  // الاسم بالإنجليزي
  models: string[]; // أسماء الموديلات (تظهر كنص حر، بدون ترجمة)
}

// ============================================================
// 23 ماركة شائعة في الكويت — مرتبة حسب الشعبية
// ============================================================

export const VEHICLE_MAKES: readonly VehicleMake[] = [
  {
    id: "toyota",
    name_ar: "تويوتا",
    name_en: "Toyota",
    models: ["Camry", "Corolla", "Land Cruiser", "Prado", "Hilux", "Yaris", "Avalon", "Fortuner", "RAV4", "FJ Cruiser", "Hiace", "Innova", "Rush"],
  },
  {
    id: "lexus",
    name_ar: "لكزس",
    name_en: "Lexus",
    models: ["ES", "LX", "RX", "GX", "LS", "IS", "NX", "LC", "UX"],
  },
  {
    id: "nissan",
    name_ar: "نيسان",
    name_en: "Nissan",
    models: ["Patrol", "Altima", "Sunny", "Maxima", "X-Trail", "Pathfinder", "Sentra", "Armada", "Murano", "Kicks", "Navara"],
  },
  {
    id: "honda",
    name_ar: "هوندا",
    name_en: "Honda",
    models: ["Accord", "Civic", "CR-V", "Pilot", "Odyssey", "City", "HR-V"],
  },
  {
    id: "hyundai",
    name_ar: "هيونداي",
    name_en: "Hyundai",
    models: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent", "Azera", "Genesis", "Creta", "Palisade"],
  },
  {
    id: "kia",
    name_ar: "كيا",
    name_en: "Kia",
    models: ["Optima", "Cerato", "Sportage", "Sorento", "Picanto", "Rio", "Carnival", "Telluride", "Seltos"],
  },
  {
    id: "mitsubishi",
    name_ar: "ميتسوبيشي",
    name_en: "Mitsubishi",
    models: ["Pajero", "Lancer", "Outlander", "ASX", "L200", "Attrage", "Montero Sport"],
  },
  {
    id: "mazda",
    name_ar: "مازدا",
    name_en: "Mazda",
    models: ["Mazda3", "Mazda6", "CX-5", "CX-9", "CX-30", "MX-5"],
  },
  {
    id: "ford",
    name_ar: "فورد",
    name_en: "Ford",
    models: ["F-150", "Explorer", "Edge", "Expedition", "Mustang", "Escape", "Bronco", "Ranger", "Taurus"],
  },
  {
    id: "chevrolet",
    name_ar: "شيفروليه",
    name_en: "Chevrolet",
    models: ["Tahoe", "Suburban", "Silverado", "Impala", "Malibu", "Camaro", "Captiva", "Traverse"],
  },
  {
    id: "gmc",
    name_ar: "جي إم سي",
    name_en: "GMC",
    models: ["Yukon", "Sierra", "Acadia", "Terrain", "Canyon"],
  },
  {
    id: "cadillac",
    name_ar: "كاديلاك",
    name_en: "Cadillac",
    models: ["Escalade", "CT5", "XT5", "XT6", "CTS"],
  },
  {
    id: "dodge",
    name_ar: "دودج",
    name_en: "Dodge",
    models: ["Charger", "Challenger", "Durango", "Ram 1500"],
  },
  {
    id: "jeep",
    name_ar: "جيب",
    name_en: "Jeep",
    models: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Gladiator"],
  },
  {
    id: "mercedes",
    name_ar: "مرسيدس",
    name_en: "Mercedes-Benz",
    models: ["C-Class", "E-Class", "S-Class", "GLE", "GLC", "GLS", "A-Class", "G-Class", "CLA", "GLA"],
  },
  {
    id: "bmw",
    name_ar: "بي إم دبليو",
    name_en: "BMW",
    models: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "X7", "M3", "M5"],
  },
  {
    id: "audi",
    name_ar: "أودي",
    name_en: "Audi",
    models: ["A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "A3", "RS"],
  },
  {
    id: "porsche",
    name_ar: "بورش",
    name_en: "Porsche",
    models: ["Cayenne", "Macan", "Panamera", "911", "Taycan"],
  },
  {
    id: "land_rover",
    name_ar: "لاند روفر",
    name_en: "Land Rover",
    models: ["Range Rover", "Range Rover Sport", "Discovery", "Defender", "Evoque", "Velar"],
  },
  {
    id: "infiniti",
    name_ar: "إنفينيتي",
    name_en: "Infiniti",
    models: ["QX80", "QX60", "QX50", "Q50", "Q70"],
  },
  {
    id: "volkswagen",
    name_ar: "فولكس فاجن",
    name_en: "Volkswagen",
    models: ["Passat", "Jetta", "Tiguan", "Touareg", "Golf", "Atlas"],
  },
  {
    id: "chrysler",
    name_ar: "كرايسلر",
    name_en: "Chrysler",
    models: ["300", "Pacifica", "Town & Country"],
  },
  {
    id: "suzuki",
    name_ar: "سوزوكي",
    name_en: "Suzuki",
    models: ["Vitara", "Swift", "Baleno", "Jimny", "Ciaz", "Dzire"],
  },
] as const;

// ============================================================
// السنوات (1990 - السنة القادمة)
// ============================================================

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1990; y--) {
    years.push(y);
  }
  return years;
}

// ============================================================
// خيارات ناقل الحركة
// ============================================================

export const TRANSMISSION_OPTIONS = [
  { id: "automatic", name_ar: "أوتوماتيك", name_en: "Automatic" },
  { id: "manual",    name_ar: "عادي",      name_en: "Manual" },
  { id: "cvt",       name_ar: "CVT",       name_en: "CVT" },
  { id: "unknown",   name_ar: "لا أعرف",   name_en: "Unknown" },
] as const;

// ============================================================
// دوال مساعدة
// ============================================================

export function findMake(makeId: string): VehicleMake | undefined {
  return VEHICLE_MAKES.find((m) => m.id === makeId);
}

export function getModelsForMake(makeId: string): string[] {
  return findMake(makeId)?.models ?? [];
}

/**
 * يرجع نص قصير للاستخدام في system prompt للـ LLM.
 * مثال: "سيارة Toyota Camry 2018، ناقل حركة أوتوماتيك"
 * يرجع نص فارغ لو ما فيه أي معلومات.
 */
export function formatVehicleForPrompt(v?: {
  make?: string;
  model?: string;
  year?: number;
  transmission?: string;
}): string {
  if (!v) return "";
  const parts: string[] = [];
  const makeData = v.make ? findMake(v.make) : undefined;
  if (makeData) parts.push(makeData.name_en);
  if (v.model) parts.push(v.model);
  if (v.year) parts.push(String(v.year));

  if (parts.length === 0 && !v.transmission) return "";

  let result = parts.length > 0 ? `سيارة ${parts.join(" ")}` : "السيارة";

  if (v.transmission && v.transmission !== "unknown") {
    const t = TRANSMISSION_OPTIONS.find((o) => o.id === v.transmission);
    if (t) result += `، ناقل حركة ${t.name_ar}`;
  }

  return result;
}
