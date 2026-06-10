import type { MetadataRoute } from "next";
import { getAllPlaceIds } from "@/lib/workshops";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";

export const revalidate = 86400; // rebuild sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getAllPlaceIds(); // all live workshops (paginated)

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/map`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/emergency`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const workshopPages: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${SITE}/workshop/${id}`, // place_id verbatim — case-sensitive
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...workshopPages];
}
