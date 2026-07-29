import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Car } from "lucide-react";
import { getMakeCounts } from "@/lib/makes";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.makesIndex" });
  const canonical = locale === DEFAULT_LOCALE ? "/ماركة" : `/${locale}/ماركة`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      url: `${SITE}/ماركة`,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("ogDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };
}

export default async function MakesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.makesIndex" });
  const makes = await getMakeCounts();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/ماركة` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("h1")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {makes.map((m) => (
          <Link
            key={m.slug}
            href={`/ماركة/${m.slug}`}
            className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-4 transition hover:border-primary"
          >
            <span className="flex items-center gap-2 font-bold transition group-hover:text-primary">
              <Car size={18} className="shrink-0 text-primary" aria-hidden />
              {m.label}
            </span>
            <span className="text-sm text-muted-foreground">{m.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
