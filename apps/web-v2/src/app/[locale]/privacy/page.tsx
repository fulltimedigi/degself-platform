import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

const EMAIL = "info@degself.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "https://degself.com/privacy" },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const collectList = t.raw("privacy.collectList") as string[];
  const mailLink = (
    <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
      {EMAIL}
    </a>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: "https://degself.com/" },
          { name: t("privacy.breadcrumbSelf"), url: "https://degself.com/privacy" },
        ]}
      />
      <h1 className="mb-2 text-2xl font-extrabold">{t("privacy.h1")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <p>{t("privacy.intro")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("privacy.collectHeading")}</h2>
          <ul className="list-disc space-y-1 pe-5">
            {collectList.map((_, i) => (
              <li key={i}>
                {t.rich(`privacy.collectList.${i}`, { b: (c) => <strong>{c}</strong> })}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("privacy.thirdHeading")}</h2>
          <p>{t("privacy.thirdBody")}</p>
        </section>

        <section id="data-deletion">
          <h2 className="mb-2 text-lg font-bold">{t("privacy.deleteHeading")}</h2>
          <p>{t("privacy.deleteBody1")}</p>
          <p className="mt-2 font-bold">{mailLink}</p>
          <p className="mt-2">{t("privacy.deleteBody2")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("privacy.contactHeading")}</h2>
          <p>
            {t("privacy.contactIntro")} {mailLink}.
          </p>
        </section>
      </div>
    </div>
  );
}
