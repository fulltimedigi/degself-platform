import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AsaaliChat } from "@/components/asaali/AsaaliChat";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "asaali" });
  const path = locale === DEFAULT_LOCALE ? "/isal-degself" : `/${locale}/isal-degself`;
  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    alternates: { canonical: `${SITE}${path}` },
    openGraph: {
      title,
      description,
      url: `${SITE}${path}`,
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

export default async function AsaaliPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "asaali" });
  const path = locale === DEFAULT_LOCALE ? "/isal-degself" : `/${locale}/isal-degself`;

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: `${SITE}/` },
          { name: t("breadcrumbSelf"), url: `${SITE}${path}` },
        ]}
      />
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        {/* Hero */}
        <header className="mb-8 text-center">
          <div
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "#FFD60A", color: "#0A0A0A" }}
          >
            {t("badge")}
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold text-white">
            {t("heroTitle")}
          </h1>
          <p className="mt-2 text-sm md:text-base text-neutral-400 leading-relaxed">
            {t("heroSubtitle1")}
            <br />
            {t("heroSubtitle2")}
          </p>
        </header>

        {/* Chat */}
        <AsaaliChat />

        {/* Disclaimer */}
        <footer className="mt-10 text-center text-xs text-neutral-600">
          <p>{t("disclaimer")}</p>
          <p className="mt-2 text-neutral-500">{t("micHint")}</p>
        </footer>
      </div>
    </main>
  );
}
