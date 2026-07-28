import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCuratedMechanics } from "@/lib/workshops";
import { getEnrichment } from "@/lib/enrichment";
import { WorkshopCard } from "@/components/WorkshopCard";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import type { Workshop } from "@/lib/types";

const SITE = "https://degself.com";

export const revalidate = 3600; // hourly

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.mukhtarat" });
  const url =
    locale === DEFAULT_LOCALE ? `${SITE}/mukhtarat` : `${SITE}/${locale}/mukhtarat`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
  };
}

/** Group rows by area in their (already area-sorted) order; null area last. */
function groupByArea(
  rows: Workshop[],
  otherArea: string
): { area: string; rows: Workshop[] }[] {
  const groups: { area: string; rows: Workshop[] }[] = [];
  const index = new Map<string, number>();
  for (const w of rows) {
    const key = w.area || otherArea;
    let at = index.get(key);
    if (at == null) {
      at = groups.length;
      index.set(key, at);
      groups.push({ area: key, rows: [] });
    }
    groups[at].rows.push(w);
  }
  // keep named areas first, the catch-all bucket last
  return groups.sort((a, b) => {
    if (a.area === otherArea) return 1;
    if (b.area === otherArea) return -1;
    return 0;
  });
}

export default async function MukhtaratPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.mukhtarat" });
  const rows = await getCuratedMechanics();
  const groups = groupByArea(rows, t("otherArea"));

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("breadcrumbSelf"),
    numberOfItems: rows.length,
    itemListElement: rows.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/workshop/${w.place_id}`,
      name: w.name,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/mukhtarat` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">{t("h1", { count: rows.length })}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>

      {groups.map((g) => (
        <section key={g.area} className="mt-10">
          <h2 className="mb-4 text-lg font-bold">
            {g.area}
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({g.rows.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.rows.map((w) => (
              <WorkshopCard
                key={w.place_id}
                workshop={w}
                enrichment={getEnrichment(w.place_id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
