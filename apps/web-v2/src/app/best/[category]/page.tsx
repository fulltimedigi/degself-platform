import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getEnrichedWorkshops, bestCategories, BEST_LIMIT } from "@/lib/best";
import { BestList } from "@/components/BestList";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";
export const revalidate = 86400; // daily ISR
export const dynamicParams = false; // only specialties that actually have enriched garages

export async function generateStaticParams() {
  const all = await getEnrichedWorkshops();
  return bestCategories(all).map((c) => ({ category: c.specialty }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const specialty = decodeURIComponent(category); // Next passes params percent-encoded
  const title = `أفضل كراجات ${specialty} في الكويت | دق سلف`;
  const description = `أعلى كراجات ${specialty} تقييماً في الكويت وفق تحليل دق سلف لتقييمات العملاء — مرتّبة بالتقييم الذكي.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/best/${encodeURIComponent(specialty)}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/best/${encodeURIComponent(specialty)}`,
      type: "website",
      locale: "ar_KW",
      siteName: "دق سلف",
      images: ["/og-image.jpg"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  };
}

export default async function BestCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const specialty = decodeURIComponent(category);

  const all = await getEnrichedWorkshops();
  const categories = bestCategories(all);
  if (!categories.some((c) => c.specialty === specialty)) notFound();

  const top = all
    .filter((w) => w.reviewed_specialty === specialty)
    .slice(0, BEST_LIMIT);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `أفضل كراجات ${specialty} في الكويت`,
    numberOfItems: top.length,
    itemListElement: top.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.name,
      url: `${SITE}/workshop/${w.place_id}`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "أفضل الكراجات", item: `${SITE}/best` },
      {
        "@type": "ListItem",
        position: 3,
        name: `أفضل كراجات ${specialty}`,
        item: `${SITE}/best/${encodeURIComponent(specialty)}`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <Link href="/best" className="text-sm text-muted-foreground hover:text-foreground">
        ← كل الأفضل
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">أفضل كراجات {specialty} في الكويت</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        أعلى كراجات {specialty} تقييماً في الكويت، مرتّبة بالتقييم الذكي المبني على تحليل
        دق سلف لتقييمات العملاء.
      </p>

      <BestList
        workshops={top}
        categories={categories}
        active={specialty}
        shareText={`أفضل كراجات ${specialty} في الكويت على دق سلف`}
      />
    </div>
  );
}
