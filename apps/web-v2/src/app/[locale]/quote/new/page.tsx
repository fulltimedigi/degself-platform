import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewQuoteForm } from "@/components/NewQuoteForm";

export const metadata: Metadata = {
  title: "اطلب عرض سعر — دق سلف",
  description:
    "اشرح مشكلة سيارتك واحصل على عروض أسعار من عدة كراجات مختصة في الكويت — مجاناً وبدون التزام.",
  robots: { index: false, follow: true }, // utility form — dynamic per user, no SEO value
};

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("quote");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8 text-center">
        <h1 className="mb-3 text-2xl font-extrabold sm:text-3xl">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("pageSubtitle")}</p>
      </header>

      <NewQuoteForm initialService={sp.service ?? ""} />
    </main>
  );
}
