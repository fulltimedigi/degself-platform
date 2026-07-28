import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Calculator, TrendingUp, ShieldCheck, AlertTriangle, BookOpen } from "lucide-react";
import { PriceCalculator } from "@/components/PriceCalculator";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "asaar" });
  const url = locale === DEFAULT_LOCALE ? "/asaar" : `/${locale}/asaar`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE}${url}`,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };
}

type Popular = { service: string; range: string; category: string };
type Guide = { href: string; title: string; subtitle: string };
type QA = { q: string; a: string };

export default async function AsaarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "asaar" });
  const bold = { b: (chunks: ReactNode) => <strong>{chunks}</strong> };

  const popular = t.raw("popular") as Popular[];
  const tips = t.raw("tips") as string[];
  const calcBullets = t.raw("calcBullets") as string[];
  const guides = t.raw("guides") as Guide[];
  const faq = t.raw("faq") as QA[];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/asaar` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Calculator className="text-primary" size={32} aria-hidden />
        </div>
        <h1 className="mb-3 text-3xl font-extrabold sm:text-4xl">{t("h1")}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t("heroSubtitle")}</p>
      </header>

      <PriceCalculator />

      <section className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <TrendingUp className="text-primary" size={22} aria-hidden />
          {t("popularHeading")}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {popular.map((item) => (
            <div
              key={item.service}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-col">
                <span className="font-bold">{item.service}</span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
              <span className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 font-bold text-primary">
                {item.range}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <AlertTriangle className="text-amber-600" size={20} aria-hidden />
          {t("tipsHeading")}
        </h2>
        <ul className="space-y-3 text-sm">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-primary">{i + 1}.</span>
              <span>{t.rich(`tips.${i}`, bold)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="text-primary" size={20} aria-hidden />
          {t("calcHeading")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("calcIntro")}</p>
        <ul className="space-y-2 text-sm">
          {calcBullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="text-primary" size={22} aria-hidden />
          {t("guidesHeading")}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
            >
              <div className="font-bold">{g.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{g.subtitle}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
