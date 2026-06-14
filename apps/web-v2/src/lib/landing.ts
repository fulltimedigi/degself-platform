import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import { normalizeArabic } from "@/lib/normalize";
import type { Workshop } from "@/lib/types";

// Specialty slugs for SEO landing pages. `q` is the search term matched against
// the normalized search_text; `label` is the human heading.
export const LANDING_SPECIALTIES = [
  { slug: "صيانة", q: "صيانة عامة", label: "صيانة عامة" },
  { slug: "ميكانيكا", q: "ميكانيكا", label: "ميكانيكا" },
  { slug: "كهرباء", q: "كهرباء", label: "كهرباء سيارات" },
  { slug: "تواير", q: "تواير", label: "تواير وبنشر" },
  { slug: "بودي", q: "بودي", label: "بودي وصبغ" },
  { slug: "قير", q: "قير", label: "قير وفتيس" },
  { slug: "زيوت", q: "زيوت", label: "زيوت وصيانة" },
  { slug: "تكييف", q: "تكييف", label: "تكييف" },
  { slug: "بطاريات", q: "بطاريات", label: "بطاريات" },
] as const;

// Major Kuwait areas (matched as substrings of the normalized search_text, which
// includes the area field — so "الشويخ" also catches "الشويخ الصناعية 1").
export const LANDING_AREAS = [
  "الشويخ",
  "حولي",
  "السالمية",
  "الفروانية",
  "خيطان",
  "الري",
  "الجهراء",
  "الفحيحيل",
  "صباح السالم",
  "الرقعي",
  "الأحمدي",
  "المنقف",
  "الجابرية",
  "سلوى",
] as const;

const MIN_PER_COMBO = 3;

export interface LandingCombo {
  specialty: string; // slug
  area: string;
}

function findSpecialty(slug: string) {
  return LANDING_SPECIALTIES.find((s) => s.slug === slug);
}

// fetch search_text for every live workshop (paginated past the 1000-row cap)
async function fetchSearchTexts(): Promise<string[]> {
  const PAGE = 1000;
  const out: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("search_text")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchSearchTexts failed: ${error.message}`);
    const batch = (data ?? []) as { search_text: string | null }[];
    for (const r of batch) out.push(r.search_text ?? "");
    if (batch.length < PAGE) break;
  }
  return out;
}

async function computeLandingCombos(): Promise<LandingCombo[]> {
  const texts = await fetchSearchTexts();
  const combos: LandingCombo[] = [];

  for (const sp of LANDING_SPECIALTIES) {
    const sq = normalizeArabic(sp.q);
    const matchSpec = texts.filter((t) => t.includes(sq));
    for (const area of LANDING_AREAS) {
      const aq = normalizeArabic(area);
      const count = matchSpec.filter((t) => t.includes(aq)).length;
      if (count >= MIN_PER_COMBO) combos.push({ specialty: sp.slug, area });
    }
  }
  return combos;
}

/**
 * Valid specialty×area combos with at least MIN_PER_COMBO matching workshops.
 * Cached so generateStaticParams + every landing page share one computation.
 */
export const getLandingCombos = unstable_cache(computeLandingCombos, ["landing-combos"], {
  revalidate: 86400,
});

export function comboKey(specialtySlug: string, area: string): string {
  return `${specialtySlug}__${area}`;
}

// fetch (search_text, updated_at) for every live workshop, paginated
async function fetchSearchTextLastmod(): Promise<
  { search_text: string; updated_at: string }[]
> {
  const PAGE = 1000;
  const out: { search_text: string; updated_at: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabasePublic
      .from("workshops")
      .select("search_text, updated_at")
      .eq("active", true)
      .eq("permanently_closed", false)
      .eq("is_automotive", true)
      .eq("out_of_scope", false)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchSearchTextLastmod failed: ${error.message}`);
    const batch = (data ?? []) as { search_text: string | null; updated_at: string | null }[];
    for (const r of batch) out.push({ search_text: r.search_text ?? "", updated_at: r.updated_at ?? "" });
    if (batch.length < PAGE) break;
  }
  return out;
}

/**
 * MAX(updated_at) per specialty×area combo — for accurate sitemap <lastmod> on
 * the landing pages. Keyed by comboKey(specialty, area).
 */
async function computeLandingLastmod(): Promise<Record<string, string>> {
  const rows = await fetchSearchTextLastmod();
  const map: Record<string, string> = {};
  for (const sp of LANDING_SPECIALTIES) {
    const sq = normalizeArabic(sp.q);
    const matchSpec = rows.filter((r) => r.search_text.includes(sq));
    for (const area of LANDING_AREAS) {
      const aq = normalizeArabic(area);
      let max = "";
      for (const r of matchSpec) {
        if (r.search_text.includes(aq) && r.updated_at > max) max = r.updated_at;
      }
      if (max) map[comboKey(sp.slug, area)] = max;
    }
  }
  return map;
}

export const getLandingLastmod = unstable_cache(computeLandingLastmod, ["landing-lastmod"], {
  revalidate: 86400,
});

/** Workshops for one landing page: search_text must contain BOTH terms. */
export async function getLandingWorkshops(
  specialtySlug: string,
  area: string,
  limit = 48
): Promise<{ label: string; workshops: Workshop[]; total: number } | null> {
  const sp = findSpecialty(specialtySlug);
  if (!sp) return null;

  let q = supabasePublic
    .from("workshops")
    .select("*", { count: "exact" })
    .eq("active", true)
    .eq("permanently_closed", false)
    .eq("is_automotive", true)
    .eq("out_of_scope", false);

  for (const tok of [normalizeArabic(sp.q), normalizeArabic(area)]) {
    q = q.ilike("search_text", `%${tok}%`);
  }
  q = q
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("google_reviews_count", { ascending: false, nullsFirst: false })
    .limit(limit);

  const { data, count, error } = await q;
  if (error) throw new Error(`getLandingWorkshops failed: ${error.message}`);
  return { label: sp.label, workshops: (data ?? []) as Workshop[], total: count ?? 0 };
}
