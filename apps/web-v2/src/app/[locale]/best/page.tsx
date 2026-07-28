import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getEnrichedWorkshops, bestCategories, BEST_LIMIT } from "@/lib/best";
import { BestList } from "@/components/BestList";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";
export const revalidate = 86400; // daily ISR — derived from the static overlay

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.best" });
  const url = locale === DEFAULT_LOCALE ? `${SITE}/best` : `${SITE}/${locale}/best`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };
}

export default async function BestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.best" });
  const all = await getEnrichedWorkshops();
  const top = all.slice(0, BEST_LIMIT);
  const categories = bestCategories(all);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("h1"),
    description: t("metaDescription"),
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
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/best` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">{t("h1")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>

      <BestList
        workshops={top}
        categories={categories}
        active={null}
        shareText={t("shareText")}
      />
    </div>
  );
}
