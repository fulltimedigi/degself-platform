import type { MetadataRoute } from "next";
import { getAllPlaceIdsWithLastmod } from "@/lib/workshops";
import { getLandingCombos, getLandingLastmod, comboKey } from "@/lib/landing";
import { getMakeCounts } from "@/lib/makes";
import { articleSlugs } from "@/app/blog/_articles";
import { getEnrichedWorkshops, bestCategories } from "@/lib/best";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
const KARAJ = encodeURIComponent("كراج");
const MARKA = encodeURIComponent("ماركة");

export const revalidate = 86400; // rebuild sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [workshops, combos, landingLastmod, makes, enriched] = await Promise.all([
    getAllPlaceIdsWithLastmod(),
    getLandingCombos(),
    getLandingLastmod(),
    getMakeCounts(),
    getEnrichedWorkshops(),
  ]);

  const now = new Date();
  const toDate = (s?: string | null) => (s ? new Date(s) : now);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/map`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/emergency`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/manatiq`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/ihsaiyat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/karaj-mutanaqil`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/bansher-mutanaqil`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/asaar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/best`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  // "Best garages" per-specialty pages — one per populated specialty.
  const bestCategoryPages: MetadataRoute.Sitemap = bestCategories(enriched).map((c) => ({
    url: `${SITE}/best/${encodeURIComponent(c.specialty)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = articleSlugs.map((slug) => ({
    url: `${SITE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Workshop pages — real per-row updated_at (case-sensitive place_id verbatim).
  const workshopPages: MetadataRoute.Sitemap = workshops.map((w) => ({
    url: `${SITE}/workshop/${w.place_id}`,
    lastModified: toDate(w.updated_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Specialty index pages — lastmod = newest among that specialty's areas.
  const specialties = [...new Set(combos.map((c) => c.specialty))];
  const specialtyPages: MetadataRoute.Sitemap = specialties.map((slug) => {
    const dates = combos
      .filter((c) => c.specialty === slug)
      .map((c) => landingLastmod[comboKey(slug, c.area)])
      .filter(Boolean);
    const max = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : undefined;
    return {
      url: `${SITE}/${KARAJ}/${encodeURIComponent(slug)}`,
      lastModified: toDate(max),
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  // Car-make pages (browse by brand) + their index.
  const makePages: MetadataRoute.Sitemap = [
    { url: `${SITE}/${MARKA}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...makes.map((m) => ({
      url: `${SITE}/${MARKA}/${encodeURIComponent(m.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // SEO landing pages (specialty × area) — per-combo MAX(updated_at).
  const landingPages: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${SITE}/${KARAJ}/${encodeURIComponent(c.specialty)}/${encodeURIComponent(c.area)}`,
    lastModified: toDate(landingLastmod[comboKey(c.specialty, c.area)]),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    ...staticPages,
    ...bestCategoryPages,
    ...makePages,
    ...specialtyPages,
    ...blogPages,
    ...landingPages,
    ...workshopPages,
  ];
}
