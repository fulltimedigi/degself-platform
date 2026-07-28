import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ihsaiyat" });
  const url = locale === DEFAULT_LOCALE ? "/ihsaiyat" : `/${locale}/ihsaiyat`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE}${url}`,
      type: "article",
      siteName: "دق سلف",
    },
  };
}

type BigNumber = { value: string; label: string };
type AreaRow = { area: string; pct: number; count: string };
type Specialty = { name: string; count: string; emoji: string };

export default async function IhsaiyatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ihsaiyat" });
  const bold = { b: (chunks: ReactNode) => <strong>{chunks}</strong> };

  const bigNumbers = t.raw("bigNumbers") as BigNumber[];
  const areaRows = t.raw("areaRows") as AreaRow[];
  const priceRows = t.raw("priceRows") as string[][];
  const specialties = t.raw("specialties") as Specialty[];
  const insights = t.raw("insights") as string[];

  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("datasetName"),
    description: t("datasetDesc"),
    url: `${SITE}/ihsaiyat`,
    keywords: ["كراجات الكويت", "إحصائيات السيارات", "ميكانيكي الكويت", "صيانة السيارات"],
    creator: { "@type": "Organization", name: "دق سلف", url: SITE },
    license: "https://creativecommons.org/licenses/by/4.0/",
    inLanguage: locale,
    datePublished: "2026-06-16",
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/ihsaiyat` },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={datasetLd} />
      <JsonLd data={breadcrumbLd} />

      {/* Hero */}
      <header className="flex flex-col gap-3 border-b border-border pb-8">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {t("badge")}
        </span>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{t("h1")}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t("heroText")}</p>
      </header>

      {/* Big Numbers */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bigNumbers.map((n) => (
          <div
            key={n.label}
            className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center"
          >
            <span className="text-4xl font-extrabold text-primary">{n.value}</span>
            <span className="text-sm font-semibold">{n.label}</span>
          </div>
        ))}
      </section>

      {/* Distribution by Area */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">{t("areaDistHeading")}</h2>
        <div className="space-y-3">
          {areaRows.map((row) => (
            <div key={row.area} className="flex items-center gap-3">
              <span className="w-40 text-sm font-semibold">{row.area}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="flex h-7 items-center justify-end rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground"
                  style={{ width: `${row.pct * 2}%` }}
                >
                  {row.pct}%
                </div>
              </div>
              <span className="w-20 text-sm text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Average Prices */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">{t("pricesHeading")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{t("colService")}</th>
                <th className="px-4 py-3 text-start">{t("colAvg")}</th>
                <th className="px-4 py-3 text-start">{t("colRange")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {priceRows.map(([service, avg, range]) => (
                <tr key={service} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-semibold">{service}</td>
                  <td className="px-4 py-3 text-primary font-bold">{avg}</td>
                  <td className="px-4 py-3 text-muted-foreground">{range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Specialty Distribution */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">{t("specialtyHeading")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((sp) => (
            <div
              key={sp.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="text-3xl" aria-hidden>
                {sp.emoji}
              </span>
              <div>
                <p className="font-bold">{sp.name}</p>
                <p className="text-sm text-muted-foreground">
                  {sp.count} {t("countSuffix")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Insights */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-extrabold">{t("insightsHeading")}</h2>
        <ul className="flex flex-col gap-3 leading-relaxed">
          {insights.map((_, i) => (
            <li key={i}>{t.rich(`insights.${i}`, bold)}</li>
          ))}
        </ul>
      </section>

      {/* Embed/Share */}
      <section className="mt-12 rounded-2xl border-2 border-primary bg-primary/5 p-6">
        <h3 className="mb-3 text-lg font-extrabold">{t("shareHeading")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{t.rich("shareText", bold)}</p>
        <div className="rounded-lg bg-foreground/5 p-3 font-mono text-xs">
          {t("shareSource")}{" "}
          <Link href="/" className="text-primary hover:underline">
            {t("shareBrand")}
          </Link>
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

      <div className="mt-12 text-center text-xs text-muted-foreground">{t("lastUpdated")}</div>
    </main>
  );
}
