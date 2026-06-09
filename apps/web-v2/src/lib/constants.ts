// Shared static data for Home enrichment (Phase 5.1).

// 6 quick-filter specialties. Pills use FREE-TEXT search (q=) — not specialty= —
// so they catch matches across name + specialty + specialty_hints. This is
// data-driven: the DB has no "ميكانيكا"/"كهرباء"/"الهيئة" specialty category, but
// "ميكانيكا" appears in ~75 names and "قير" in ~151 (via the قير وفتيس hint).
// `q` is the search term; `icon` is a lucide-react icon name.
export const SPECIALTIES = [
  { label: "صيانة عامة", q: "صيانة عامة", icon: "Settings" },
  { label: "ميكانيكا", q: "ميكانيكا", icon: "Wrench" },
  { label: "تواير وبنشر", q: "تواير", icon: "CircleDot" },
  { label: "بودي وصبغ", q: "بودي", icon: "Brush" },
  { label: "قير", q: "قير", icon: "Cog" },
  { label: "زيوت وصيانة", q: "زيوت", icon: "Droplet" },
] as const;

// 6 governorates. `name` matches the DB `governorate` column exactly (note: the
// Capital governorate is stored as "العاصمة", not "الكويت"). `areas` are display-
// only sample districts (no numbers shown — golden rule #5).
export const GOVERNORATES = [
  { name: "العاصمة", areas: ["الشويخ", "الصالحية", "كيفان"] },
  { name: "حولي", areas: ["حولي", "السالمية", "الجابرية"] },
  { name: "الفروانية", areas: ["الفروانية", "خيطان", "الرقعي"] },
  { name: "مبارك الكبير", areas: ["صباح السالم", "القرين", "المسيلة"] },
  { name: "الأحمدي", areas: ["الفحيحيل", "المهبولة", "الأحمدي"] },
  { name: "الجهراء", areas: ["الجهراء", "تيماء", "النعيم"] },
] as const;
