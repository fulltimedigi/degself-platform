import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { getLandingCombos, LANDING_SPECIALTIES } from "@/lib/landing";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export const revalidate = 86400; // daily
export const dynamicParams = false; // only known specialties with valid area pages

function findSpecialty(slug: string) {
  return LANDING_SPECIALTIES.find((s) => s.slug === slug);
}

export async function generateStaticParams() {
  const combos = await getLandingCombos();
  const slugs = [...new Set(combos.map((c) => c.specialty))];
  return slugs.map((specialty) => ({ specialty }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; specialty: string }>;
}): Promise<Metadata> {
  const { locale, specialty: rs } = await params;
  const slug = decodeURIComponent(rs); // Next 16 passes params percent-encoded
  const sp = findSpecialty(slug);
  const t = await getTranslations({ locale, namespace: "landing" });
  if (!sp) return { title: t("notFound") };

  const title = t("specIndex.metaTitle", { specialty: sp.label });
  const description = t("specIndex.metaDescription", { specialty: sp.label });
  const canonical =
    locale === DEFAULT_LOCALE ? `/كراج/${slug}` : `/${locale}/كراج/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE}/كراج/${slug}`,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg?v=2"],
    },
  };
}

export default async function SpecialtyIndexPage({
  params,
}: {
  params: Promise<{ locale: string; specialty: string }>;
}) {
  const { locale, specialty: rs } = await params;
  const slug = decodeURIComponent(rs);
  const sp = findSpecialty(slug);
  const t = await getTranslations({ locale, namespace: "landing.specIndex" });
  if (!sp) notFound();

  const combos = await getLandingCombos();
  const areas = combos.filter((c) => c.specialty === slug).map((c) => c.area);
  if (areas.length === 0) notFound();

  const pageUrl = `${SITE}/كراج/${slug}`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("collectionName", { specialty: sp.label }),
    description: t("collectionDesc", { specialty: sp.label }),
    url: pageUrl,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE}/#website` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf", { specialty: sp.label }), item: pageUrl },
    ],
  };

  // The area sub-pages this index links to — exposed as a structured list so
  // search engines can discover every specialty×area landing page from here.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("itemListName", { specialty: sp.label }),
    itemListElement: areas.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t("inArea", { specialty: sp.label, area: a }),
      url: `${SITE}/كراج/${slug}/${a}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <JsonLd data={collectionLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">{t("h1", { specialty: sp.label })}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro", { specialty: sp.label })}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">{t("browseByArea")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <Link
              key={a}
              href={`/كراج/${slug}/${a}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-semibold transition hover:border-primary hover:text-primary"
            >
              <MapPin size={18} className="shrink-0 text-primary" aria-hidden />
              {t("inArea", { specialty: sp.label, area: a })}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
          ← {t("advancedSearch")}
        </Link>
      </div>
    </div>
  );
}
