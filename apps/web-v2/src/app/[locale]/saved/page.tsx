import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SavedList } from "@/components/SavedList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "misc.saved" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/saved" },
    robots: { index: false, follow: true }, // user-specific (localStorage) — no SEO value
  };
}

export default async function SavedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "misc.saved" });
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-extrabold">{t("h1")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>
      <SavedList />
    </div>
  );
}
