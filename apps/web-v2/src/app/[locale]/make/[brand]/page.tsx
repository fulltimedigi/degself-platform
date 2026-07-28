import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMakeWorkshops, getMakeCounts, findMake } from "@/lib/makes";
import { WorkshopCard } from "@/components/WorkshopCard";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export const revalidate = 86400; // daily
export const dynamicParams = false; // only makes with enough garages

export async function generateStaticParams() {
  const makes = await getMakeCounts();
  return makes.map((m) => ({ brand: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; brand: string }>;
}): Promise<Metadata> {
  const { locale, brand: rb } = await params;
  const slug = decodeURIComponent(rb);
  const t = await getTranslations({ locale, namespace: "landing" });
  const m = findMake(slug);
  if (!m) return { title: t("notFound") };

  const title = t("make.metaTitle", { brand: m.label });
  const description = t("make.metaDescription", { brand: m.label });
  const canonical =
    locale === DEFAULT_LOCALE ? `/ماركة/${slug}` : `/${locale}/ماركة/${slug}`;
  return {
    title,
    description,
    keywords: [`كراج ${m.label}`, `صيانة ${m.label} الكويت`, `متخصص ${m.label}`, `قطع غيار ${m.label}`],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE}/ماركة/${slug}`,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg?v=2"] },
  };
}

export default async function MakePage({
  params,
}: {
  params: Promise<{ locale: string; brand: string }>;
}) {
  const { locale, brand: rb } = await params;
  const slug = decodeURIComponent(rb);
  const t = await getTranslations({ locale, namespace: "landing" });
  const m = findMake(slug);
  if (!m) notFound();

  const res = await getMakeWorkshops(slug);
  if (!res || res.total === 0) notFound();

  const counts = await getMakeCounts();
  const others = counts.filter((c) => c.slug !== slug).slice(0, 12);
  const pageUrl = `${SITE}/ماركة/${slug}`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("make.collectionName", { brand: m.label }),
    description: t("make.collectionDesc", { brand: m.label }),
    url: pageUrl,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE}/#website` },
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: res.workshops.slice(0, 10).map((w, i) => ({
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
      { "@type": "ListItem", position: 1, name: t("make.breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("make.breadcrumbMakes"), item: `${SITE}/ماركة` },
      { "@type": "ListItem", position: 3, name: m.label, item: pageUrl },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={collectionLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label={t("make.navAria")}>
        <Link href="/ماركة" className="font-semibold text-primary hover:underline">
          {t("make.navMakes")}
        </Link>
        <span>/</span>
        <span>{m.label}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold">{t("make.h1", { brand: m.label })}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("make.intro", { brand: m.label })}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {res.workshops.map((w) => (
          <WorkshopCard key={w.place_id} workshop={w} />
        ))}
      </div>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">{t("make.otherMakes")}</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/ماركة/${o.slug}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
