// Kuwaiti-dialect → specialty intent inference for search.
// Source: src/data/dialect_dictionary_cleaned.json (64 raw phrases). The raw file
// is noisy (place_ids, English tokens, over-generic words, a few miscategorised
// entries), so we curate it at load time into a clean phrase→specialty map and
// match on the Arabic-normalized query — intent, not exact keyword matching.
import dict from "@/data/dialect_dictionary_cleaned.json";
import { normalizeArabic } from "@/lib/normalize";

// Dialect `category` values that differ from the audited reviewed_specialty
// used by search. Everything not listed maps to itself (already a valid value).
const CATEGORY_TO_SPECIALTY: Record<string, string> = {
  كهرباء: "كهرباء سيارات",
  "تنجيد وفرش": "دواسر وفرش",
};

// Specific phrases the raw file miscategorised under "صيانة عامة".
const PHRASE_OVERRIDE: Record<string, string> = {
  بنشر: "تواير وبنشر",
  ونش: "ونش وسحب",
  سطحة: "ونش وسحب",
};

// Over-generic or junk phrases that must never drive intent (they'd match almost
// any query). Compared after normalization.
const BLOCKLIST = new Set(
  [
    "كراج",
    "تصليح",
    "تبديل",
    "صناعية",
    "تجاري",
    "اشتراك",
    "كفالة",
    "تجيك",
    "جيك",
    "جام",
    "ميزان",
    "كويتي",
  ].map(normalizeArabic)
);

// degself-added intent terms the raw file misses but users type constantly
// (the dictionary covers "كمبريسر" for AC but not "ما يبرّد"/"كهربا").
const SUPPLEMENT: Array<[string, string]> = [
  ["مكيف", "تكييف"],
  ["يبرد", "تكييف"],
  ["تبريد", "تكييف"],
  ["كهربا", "كهرباء سيارات"],
  // بودي وصبغ: مصطلحات السمكرة والحوادث التي يكتبها المستخدم كثيراً والقاموس
  // الخام يفتقدها. مختارة لتكون غير ملتبسة (تجنّبنا "خبط" وحدها لأنها تعني خبط
  // المكينة أيضاً؛ "اتخبط" الانعكاسية تعني الاصطدام فقط).
  ["سمكره", "بودي وصبغ"],
  ["سمكري", "بودي وصبغ"],
  ["دعمه", "بودي وصبغ"],
  ["اتخبط", "بودي وصبغ"],
  ["بامبر", "بودي وصبغ"],
  ["بمبر", "بودي وصبغ"],
  ["صدام", "بودي وصبغ"],
  ["صدمه", "بودي وصبغ"],
  ["اصطدام", "بودي وصبغ"],
  ["حادث", "بودي وصبغ"],
];

const MIN_LEN = 3; // normalized length — shorter is too ambiguous to trust

interface DictEntry {
  phrase: string; // original, for display
  normalized: string; // normalized, for matching
  specialty: string;
}

function buildEntries(): DictEntry[] {
  const out: DictEntry[] = [];
  const seen = new Set<string>();
  const add = (phrase: string, specialty: string) => {
    const normalized = normalizeArabic(phrase);
    if (
      normalized.length < MIN_LEN ||
      BLOCKLIST.has(normalized) ||
      seen.has(normalized) ||
      !/[؀-ۿ]/.test(normalized) // Arabic letters only
    )
      return;
    seen.add(normalized);
    out.push({ phrase, normalized, specialty });
  };

  for (const e of dict.dialect_dictionary) {
    const phrase = (e.phrase ?? "").trim();
    if (!/[؀-ۿ]/.test(phrase)) continue; // skip latin / place_ids
    const norm = normalizeArabic(phrase);
    const specialty =
      PHRASE_OVERRIDE[norm] ??
      CATEGORY_TO_SPECIALTY[e.category] ??
      e.category;
    add(phrase, specialty);
  }
  for (const [phrase, specialty] of SUPPLEMENT) add(phrase, specialty);

  // Longest phrase first → the most specific match wins.
  return out.sort((a, b) => b.normalized.length - a.normalized.length);
}

const ENTRIES = buildEntries();

export interface DialectMatch {
  phrase: string; // the dialect phrase that matched (original spelling)
  specialty: string; // the reviewed_specialty to filter by
}

/**
 * Infer the intended specialty from a colloquial query. Returns the first
 * (longest, most specific) curated phrase contained in the normalized query,
 * or null when nothing matches.
 */
export function inferSpecialtyFromQuery(
  query: string | null | undefined
): DialectMatch | null {
  if (!query) return null;
  const norm = normalizeArabic(query);
  if (!norm) return null;
  for (const e of ENTRIES) {
    if (norm.includes(e.normalized)) {
      return { phrase: e.phrase, specialty: e.specialty };
    }
  }
  return null;
}
