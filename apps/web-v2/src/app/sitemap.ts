import type { MetadataRoute } from "next";
import { getAllPlaceIds } from "@/lib/workshops";
import { getLandingCombos } from "@/lib/landing";
import { articleSlugs } from "@/app/blog/_articles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";

export const revalidate = 86400; // rebuild sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ids, combos] = await Promise.all([getAllPlaceIds(), getLandingCombos()]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/map`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/emergency`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const blogPages: MetadataRoute.Sitemap = articleSlugs.map((slug) => ({
    url: `${SITE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const workshopPages: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${SITE}/workshop/${id}`, // place_id verbatim — case-sensitive
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // SEO landing pages (specialty × area) — Arabic segments percent-encoded for <loc>
  const landingPages: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${SITE}/${encodeURIComponent("كراج")}/${encodeURIComponent(c.specialty)}/${encodeURIComponent(c.area)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages, ...landingPages, ...workshopPages];
}
