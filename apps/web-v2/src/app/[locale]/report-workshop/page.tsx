import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportWorkshopForm } from "@/components/ReportWorkshopForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "misc.report" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true }, // utility form — no SEO value
  };
}

export default async function ReportWorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "misc.report" });
  const howList = t.raw("howList") as string[];
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8 text-center">
        <h1 className="mb-3 text-2xl font-extrabold sm:text-3xl">{t("h1")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("subtitle")}</p>
      </header>

      <ReportWorkshopForm />

      <section className="mt-10 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="mb-2 font-bold text-foreground">{t("howHeading")}</h2>
        <ul className="list-disc space-y-1 pe-5">
          {howList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
