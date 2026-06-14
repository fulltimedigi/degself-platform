import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import type { Workshop } from "@/lib/types";

/**
 * Car-make "specialist" pages. There is no make column — a garage is considered
 * a specialist for a make when its normalized search_text mentions the make
 * (Arabic and/or English aliases). search_text is lowercased, so English aliases
 * are lowercase. Aliases are deliberately conservative to avoid collisions
 * (e.g. no bare "بنز" → collides with بنزين).
 */
export const CAR_MAKES = [
  { slug: "تويوتا", label: "تويوتا", aliases: ["تويوتا", "toyota"] },
  { slug: "لكزس", label: "لكزس", aliases: ["لكزس", "لكسس", "lexus"] },
  { slug: "نيسان", label: "نيسان", aliases: ["نيسان", "nissan"] },
  { slug: "مرسيدس", label: "مرسيدس", aliases: ["مرسيدس", "mercedes", "benz"] },
  { slug: "بي-ام-دبليو", label: "بي إم دبليو", aliases: ["بي ام", "بي إم", "بمو", "bmw"] },
  { slug: "هوندا", label: "هوندا", aliases: ["هوندا", "honda"] },
  { slug: "هيونداي", label: "هيونداي", aliases: ["هيونداي", "هيونداي", "hyundai"] },
  { slug: "كيا", label: "كيا", aliases: ["كيا", "kia"] },
  { slug: "فورد", label: "فورد", aliases: ["فورد", "ford"] },
  { slug: "شفروليه", label: "شفروليه", aliases: ["شفروليه", "شيفروليه", "شيفر", "chevrolet", "chevy"] },
  { slug: "جي-ام-سي", label: "جي إم سي", aliases: ["جي ام سي", "جي إم سي", "gmc"] },
  { slug: "ميتسوبيشي", label: "ميتسوبيشي", aliases: ["ميتسوبيشي", "ميتسوبيتشي", "mitsubishi"] },
  { slug: "رنج-روفر", label: "رنج روفر ولاندروفر", aliases: ["رنج روفر", "رنج", "لاندروفر", "لاند روفر", "range rover", "land rover"] },
  { slug: "مازدا", label: "مازدا", aliases: ["مازدا", "مازده", "mazda"] },
  { slug: "اودي", label: "أودي", aliases: ["اودي", "أودي", "audi"] },
  { slug: "انفينيتي", label: "إنفينيتي", aliases: ["انفينيتي", "إنفينيتي", "infiniti"] },
  { slug: "بورش", label: "بورش", aliases: ["بورش", "porsche"] },
  { slug: "جيب", label: "جيب", aliases: ["جيب", "jeep"] },
] as const;

export type CarMake = (typeof CAR_MAKES)[number];

export function findMake(slug: string): CarMake | undefined {
  return CAR_MAKES.find((m) => m.slug === slug);
}

function orFilter(aliases: readonly string[]): string {
  return aliases.map((a) => `search_text.ilike.%${a}%`).join(",");
}

const ACTIVE = (q: any) =>
  q.eq("active", true).eq("permanently_closed", false).eq("is_automotive", true).eq("out_of_scope", false);

/** Workshops that mention this make — ranked by rating then reviews. */
export async function getMakeWorkshops(
  slug: string,
  limit = 48
): Promise<{ label: string; workshops: Workshop[]; total: number } | null> {
  const m = findMake(slug);
  if (!m) return null;
  let q = ACTIVE(supabasePublic.from("workshops").select("*", { count: "exact" }));
  q = q
    .or(orFilter(m.aliases))
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("google_reviews_count", { ascending: false, nullsFirst: false })
    .limit(limit);
  const { data, count, error } = await q;
  if (error) throw new Error(`getMakeWorkshops failed: ${error.message}`);
  return { label: m.label, workshops: (data ?? []) as Workshop[], total: count ?? 0 };
}

const MIN_PER_MAKE = 4; // avoid thin pages

/** Makes with at least MIN_PER_MAKE matching garages — for index + static params. */
async function computeMakeCounts(): Promise<{ slug: string; label: string; count: number }[]> {
  const out: { slug: string; label: string; count: number }[] = [];
  for (const m of CAR_MAKES) {
    const { count } = await ACTIVE(
      supabasePublic.from("workshops").select("place_id", { count: "exact", head: true })
    ).or(orFilter(m.aliases));
    if ((count ?? 0) >= MIN_PER_MAKE) out.push({ slug: m.slug, label: m.label, count: count ?? 0 });
  }
  return out.sort((a, b) => b.count - a.count);
}

export const getMakeCounts = unstable_cache(computeMakeCounts, ["make-counts"], { revalidate: 86400 });
