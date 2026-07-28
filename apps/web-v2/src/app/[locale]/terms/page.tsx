import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "https://degself.com/terms" },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const s2list = t.raw("terms.s2list") as string[];
  const s4list = t.raw("terms.s4list") as string[];

  const linkCls = "font-bold text-primary hover:underline";
  const asaali = { asaali: (c: ReactNode) => <Link href="/isal-degself" className={linkCls}>{c}</Link> };
  const privacy = { privacy: (c: ReactNode) => <Link href="/privacy" className={linkCls}>{c}</Link> };
  const contactTags = {
    mail: (c: ReactNode) => <a href="mailto:info@degself.com" className={linkCls}>{c}</a>,
    about: (c: ReactNode) => <Link href="/about" className={linkCls}>{c}</Link>,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: "https://degself.com/" },
          { name: t("terms.breadcrumbSelf"), url: "https://degself.com/terms" },
        ]}
      />
      <h1 className="mb-2 text-2xl font-extrabold">{t("terms.h1")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <p>{t("terms.intro")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s1h")}</h2>
          <p>{t("terms.s1body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s2h")}</h2>
          <ul className="list-disc space-y-2 pe-5">
            {s2list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s3h")}</h2>
          <p>{t.rich("terms.s3body", asaali)}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s4h")}</h2>
          <p>{t("terms.s4intro")}</p>
          <ul className="mt-2 list-disc space-y-2 pe-5">
            {s4list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s5h")}</h2>
          <p>{t("terms.s5body1")}</p>
          <p className="mt-2">{t("terms.s5body2")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s6h")}</h2>
          <p>{t("terms.s6body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s7h")}</h2>
          <p>{t("terms.s7body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s8h")}</h2>
          <p>{t("terms.s8body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s9h")}</h2>
          <p>{t.rich("terms.s9body", privacy)}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s10h")}</h2>
          <p>{t("terms.s10body")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("terms.s11h")}</h2>
          <p>{t.rich("terms.s11body", contactTags)}</p>
        </section>
      </div>
    </div>
  );
}
