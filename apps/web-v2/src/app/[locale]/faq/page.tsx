import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

type QA = { q: string; a: string };
type Group = { title: string; items: QA[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  const path = locale === DEFAULT_LOCALE ? "/faq" : `/${locale}/faq`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `${SITE}${path}`,
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

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  const groups = t.raw("groups") as Group[];
  const allItems = groups.flatMap((g) => g.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE}/faq#faqpage`,
    mainEntity: allItems.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/faq` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("h1")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-primary">{group.title}</h2>
            <div className="flex flex-col gap-2">
              {group.items.map((it) => (
                <details
                  key={it.q}
                  className="group rounded-xl border border-border bg-card px-4 py-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                    <span>{it.q}</span>
                    <ChevronLeft
                      size={18}
                      className="shrink-0 text-muted-foreground transition-transform group-open:-rotate-90"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-3 leading-loose text-foreground/85">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
