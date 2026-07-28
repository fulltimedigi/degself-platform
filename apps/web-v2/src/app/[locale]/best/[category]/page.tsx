import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getEnrichedWorkshops, bestCategories, BEST_LIMIT } from "@/lib/best";
import { BestList } from "@/components/BestList";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

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
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const specialty = decodeURIComponent(category); // Next passes params percent-encoded
  const t = await getTranslations({ locale, namespace: "listing.best" });
  const title = t("catTitle", { specialty });
  const description = t("catDescription", { specialty });
  const canonical =
    locale === DEFAULT_LOCALE
      ? `${SITE}/best/${encodeURIComponent(specialty)}`
      : `${SITE}/${locale}/best/${encodeURIComponent(specialty)}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg?v=2"] },
  };
}

export default async function BestCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const specialty = decodeURIComponent(category);
  const t = await getTranslations({ locale, namespace: "listing.best" });

  const all = await getEnrichedWorkshops();
  const categories = bestCategories(all);
  if (!categories.some((c) => c.specialty === specialty)) notFound();

  const top = all
    .filter((w) => w.reviewed_specialty === specialty)
    .slice(0, BEST_LIMIT);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("catName", { specialty }),
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
      {
        "@type": "ListItem",
        position: 3,
        name: t("catBreadcrumb", { specialty }),
        item: `${SITE}/best/${encodeURIComponent(specialty)}`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <Link href="/best" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t("backAll")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">{t("catName", { specialty })}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("catIntro", { specialty })}</p>

      <BestList
        workshops={top}
        categories={categories}
        active={specialty}
        shareText={t("catShareText", { specialty })}
      />
    </div>
  );
}
