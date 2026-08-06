import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewQuoteForm } from "@/components/NewQuoteForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quote" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    problem?: string;
    make?: string;
    model?: string;
    year?: string;
  }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("quote");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8 text-center">
        <h1 className="mb-3 text-2xl font-extrabold sm:text-3xl">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("pageSubtitle")}</p>
      </header>

      <NewQuoteForm
        initialService={sp.service ?? ""}
        initialProblem={sp.problem ?? ""}
        initialCarMake={sp.make ?? ""}
        initialCarModel={sp.model ?? ""}
        initialCarYear={sp.year ?? ""}
      />
    </main>
  );
}
