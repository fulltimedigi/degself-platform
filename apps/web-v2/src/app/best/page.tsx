import type { Metadata } from "next";
import { getEnrichedWorkshops, bestCategories, BEST_LIMIT } from "@/lib/best";
import { BestList } from "@/components/BestList";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";
export const revalidate = 86400; // daily ISR — derived from the static overlay

const TITLE = "أفضل الكراجات في الكويت | دق سلف";
const DESCRIPTION =
  "أعلى الكراجات تقييماً في الكويت وفق تحليل دق سلف لتقييمات العملاء — مرتّبة بالتقييم الذكي ومصنّفة حسب التخصص.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/best` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE}/best`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg?v=2"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg?v=2"],
  },
};

export default async function BestPage() {
  const all = await getEnrichedWorkshops();
  const top = all.slice(0, BEST_LIMIT);
  const categories = bestCategories(all);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "أفضل الكراجات في الكويت",
    description: DESCRIPTION,
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
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">أفضل الكراجات في الكويت</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        قائمة بأعلى الكراجات تقييماً في الكويت، مرتّبة بالتقييم الذكي المبني على تحليل
        دق سلف لتقييمات العملاء. اختر التخصص لتصفّح الأفضل في كل مجال.
      </p>

      <BestList
        workshops={top}
        categories={categories}
        active={null}
        shareText="أفضل الكراجات في الكويت على دق سلف"
      />
    </div>
  );
}
