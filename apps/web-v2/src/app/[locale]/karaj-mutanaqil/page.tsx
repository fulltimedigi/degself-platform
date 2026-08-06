import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Clock, MapPin } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WorkshopCard } from "@/components/WorkshopCard";
import { searchWorkshops } from "@/lib/workshops";
import { DEFAULT_LOCALE } from "@/i18n/routing";

const SITE = "https://degself.com";

type Service = { icon: string; title: string; desc: string };
type Area = { ar: string; en: string; time: string };
type QA = { q: string; a: string };
type Related = { href: string; title: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mobile.karaj" });
  const url = locale === DEFAULT_LOCALE ? "/karaj-mutanaqil" : `/${locale}/karaj-mutanaqil`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE}${url}`,
      type: "website",
      siteName: "دق سلف",
    },
  };
}

export default async function KarajMutanaqilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mobile" });
  const tk = await getTranslations({ locale, namespace: "mobile.karaj" });
  const isAr = locale === "ar";
  const { workshops } = await unstable_cache(
    () => searchWorkshops({ service_mode: "mobile", limit: 18 }),
    ["karaj-mutanaqil-workshops"],
    { revalidate: 300 }
  )();

  const services = tk.raw("services") as Service[];
  const areas = t.raw("areas") as Area[];
  const faq = tk.raw("faq") as QA[];
  const related = tk.raw("related") as Related[];

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "كراج متنقل في الكويت",
    alternateName: ["Mobile Garage Kuwait", "Mobile Mechanic Kuwait"],
    serviceType: "Mobile Auto Repair",
    provider: { "@type": "Organization", name: "دق سلف", url: SITE },
    areaServed: { "@type": "Country", name: "Kuwait", alternateName: "الكويت" },
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "00:00",
      closes: "23:59",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "KWD",
      lowPrice: "5",
      highPrice: "80",
      offerCount: workshops.length || 50,
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
      { "@type": "ListItem", position: 2, name: tk("breadcrumbSelf"), item: `${SITE}/karaj-mutanaqil` },
    ],
  };

  return (
    <>
      <JsonLd data={serviceLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-8 sm:p-12">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Clock size={16} aria-hidden /> {t("badge")}
            </div>
            <h1 className="text-3xl font-extrabold sm:text-5xl">{tk("h1")}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{tk("heroSubtitle")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/search?service_mode=mobile"
                className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                {tk("searchBtn")}
              </Link>
              <Link
                href="/bansher-mutanaqil"
                className="rounded-xl border border-border bg-card px-6 py-3 font-bold text-foreground hover:bg-muted"
              >
                {tk("otherBtn")}
              </Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold">{tk("servicesHeading")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-5">
                <div className="text-3xl">{s.icon}</div>
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Areas */}
        <section className="mt-12">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-extrabold">
            <MapPin size={24} className="text-primary" aria-hidden />
            {t("areasHeading")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {areas.map((a) => (
              <Link
                key={a.ar}
                href={`/search?q=${encodeURIComponent("متنقل " + a.ar)}`}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:bg-muted"
              >
                <div className="font-bold">{isAr ? a.ar : a.en}</div>
                <div className="mt-1 text-sm text-muted-foreground">⏱️ {a.time} {t("timeUnit")}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Workshops */}
        {workshops.length > 0 && (
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">{tk("workshopsHeading")}</h2>
              <Link
                href="/search?service_mode=mobile"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workshops.map((w) => (
                <WorkshopCard key={w.place_id} workshop={w} />
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold">{t("faqHeading")}</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-bold">{f.q}</summary>
                <p className="mt-3 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-extrabold">{t("relatedHeading")}</h2>
          <ul className="space-y-2 text-primary">
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="hover:underline">
                  ← {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
