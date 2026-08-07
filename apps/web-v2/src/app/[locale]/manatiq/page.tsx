import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
// Plain next/link for the Arabic vanity URLs (/كراج/…): they resolve via a
// beforeFiles rewrite that matches ONLY the unprefixed path, so these links must
// NOT carry a locale prefix. The i18n Link (above) is kept for real internal
// routes (/, /search) that SHOULD be locale-aware.
import NextLink from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { MapPin, ChevronLeft } from "lucide-react";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "manatiq" });
  const url = locale === DEFAULT_LOCALE ? "/manatiq" : `/${locale}/manatiq`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      url: `${SITE}${url}`,
      type: "website",
      siteName: "دق سلف",
    },
  };
}

// area name is the Arabic value used in URLs (encodeURIComponent); `en` is the
// display name on non-Arabic locales; `key` maps to the translated description.
const AREAS = [
  { ar: "الشويخ", en: "Shuwaikh", key: "shuwaikh" },
  { ar: "حولي", en: "Hawalli", key: "hawalli" },
  { ar: "السالمية", en: "Salmiya", key: "salmiya" },
  { ar: "الفروانية", en: "Farwaniya", key: "farwaniya" },
  { ar: "خيطان", en: "Khaitan", key: "khaitan" },
  { ar: "الري", en: "Al Rai", key: "alrai" },
  { ar: "الجهراء", en: "Jahra", key: "jahra" },
  { ar: "الفحيحيل", en: "Fahaheel", key: "fahaheel" },
  { ar: "صباح السالم", en: "Sabah Al Salem", key: "sabah" },
  { ar: "الرقعي", en: "Rqaie", key: "rqaie" },
  { ar: "الأحمدي", en: "Ahmadi", key: "ahmadi" },
  { ar: "المنقف", en: "Mangaf", key: "mangaf" },
  { ar: "الجابرية", en: "Jabriya", key: "jabriya" },
  { ar: "سلوى", en: "Salwa", key: "salwa" },
] as const;

// specialty: slug drives the URL (Arabic, DB value); key maps to the label
const SPECIALTIES = [
  { slug: "صيانة", key: "general" },
  { slug: "ميكانيكا", key: "mechanics" },
  { slug: "كهرباء", key: "electrical" },
  { slug: "تواير", key: "tires" },
  { slug: "بودي", key: "bodywork" },
  { slug: "قير", key: "gearbox" },
  { slug: "زيوت", key: "oils" },
  { slug: "تكييف", key: "ac" },
  { slug: "بطاريات", key: "batteries" },
] as const;

const KARAJ = encodeURIComponent("كراج");

// area-card quick chips: Arabic slug drives the URL, key maps to the label
const CARD_CHIPS = [
  { slug: "صيانة", key: "maintenance" },
  { slug: "ميكانيكا", key: "mechanics" },
  { slug: "بودي", key: "bodywork" },
  { slug: "تكييف", key: "ac" },
] as const;

export default async function ManatiqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "manatiq" });
  const isAr = locale === "ar";
  const areaName = (a: (typeof AREAS)[number]) => (isAr ? a.ar : a.en);
  const bold = { b: (chunks: ReactNode) => <strong className="text-foreground">{chunks}</strong> };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/manatiq` },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("breadcrumbSelf"),
    itemListElement: AREAS.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `كراجات ${a.ar}`,
      url: `${SITE}/${KARAJ}/صيانة/${encodeURIComponent(a.ar)}`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label={t("navAria")}>
        <Link href="/" className="font-semibold text-primary hover:underline">
          {t("breadcrumbHome")}
        </Link>
        <ChevronLeft size={16} aria-hidden className="rtl:rotate-180" />
        <span>{t("breadcrumbSelf")}</span>
      </nav>

      {/* Hero */}
      <header className="mt-6 flex flex-col gap-4 border-b border-border pb-8">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{t("h1")}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t.rich("hero", bold)}</p>
      </header>

      {/* Featured: Shuwaikh */}
      <section className="mt-8 rounded-2xl bg-primary/5 p-6">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            {t("featuredBadge")}
          </span>
          <h2 className="text-2xl font-extrabold">{t("featuredTitle")}</h2>
          <p className="leading-relaxed text-muted-foreground">{t("featuredText")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPECIALTIES.map((sp) => (
              <NextLink
                key={sp.slug}
                href={`/${KARAJ}/${encodeURIComponent(sp.slug)}/${encodeURIComponent("الشويخ")}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm hover:border-primary hover:text-primary"
              >
                {t(`spec.${sp.key}`)}
              </NextLink>
            ))}
          </div>
        </div>
      </section>

      {/* All Areas Grid */}
      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-extrabold">{t("allAreas")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((area) => (
            <article
              key={area.ar}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-primary" aria-hidden />
                <h3 className="text-lg font-bold">{areaName(area)}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`areaDesc.${area.key}`)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CARD_CHIPS.map((chip) => (
                  <NextLink
                    key={chip.slug}
                    href={`/${KARAJ}/${encodeURIComponent(chip.slug)}/${encodeURIComponent(area.ar)}`}
                    className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {t(`chip.${chip.key}`)}
                  </NextLink>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-extrabold">{t("seoHeading")}</h2>
        <div className="flex flex-col gap-3 leading-relaxed text-muted-foreground">
          <p>{t.rich("seoP1", bold)}</p>
          <p>{t("seoP2")}</p>
          <ul className="list-disc pe-6 ps-2">
            {(t.raw("seoList") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{t.rich("seoP3", bold)}</p>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-primary p-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start">
        <div>
          <h3 className="text-lg font-extrabold text-primary-foreground">{t("ctaTitle")}</h3>
          <p className="text-sm text-primary-foreground/80">{t("ctaSubtitle")}</p>
        </div>
        <Link
          href="/search"
          className="mx-auto rounded-xl bg-foreground px-6 py-3 font-bold text-background hover:opacity-90 sm:mx-0"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </main>
  );
}
