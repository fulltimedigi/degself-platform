import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getMapPoints } from "@/lib/workshops";
import { MapLoader } from "@/components/MapLoader";
import { DEFAULT_LOCALE } from "@/i18n/routing";

export const revalidate = 3600; // ISR: refresh map points hourly

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.map" });
  const url =
    locale === DEFAULT_LOCALE
      ? "https://degself.com/map"
      : `https://degself.com/${locale}/map`;
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

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing.map" });
  const points = await getMapPoints();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <h1 className="text-2xl font-extrabold">{t("h1")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mt-4 h-[70vh] w-full">
        <MapLoader points={points} />
      </div>
    </div>
  );
}
