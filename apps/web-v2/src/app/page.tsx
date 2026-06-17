import type { Metadata } from "next";
import { getFeaturedWorkshops } from "@/lib/workshops";
import { GarageTranslator } from "@/components/GarageTranslator";
import { QuickFilterPills } from "@/components/QuickFilterPills";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { PriceCalculatorBanner } from "@/components/PriceCalculatorBanner";
import { GovernorateGrid } from "@/components/GovernorateGrid";
import { TopRatedCarousel } from "@/components/TopRatedCarousel";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";
// Social share card (brand-colored, 1200×630).
const OG_IMAGE = `${SITE}/og-image.jpg`;
// Brand logo (used for the Organization schema logo, not the social card).
const LOGO = `${SITE}/brand/logo-arabic.png`;

export const revalidate = 3600; // ISR: rebuild at most once per hour

export const metadata: Metadata = {
  title: "دق سلف — دليلك لكراجات وميكانيكي السيارات في الكويت",
  description:
    "ابحث عن كراج، ميكانيكي، أو خدمة سيارات في الكويت. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
  alternates: { canonical: SITE },
  openGraph: {
    type: "website",
    url: SITE,
    locale: "ar_KW",
    siteName: "دق سلف",
    title: "دق سلف — دليلك لكراجات وميكانيكي السيارات في الكويت",
    description:
      "ابحث عن كراج، ميكانيكي، أو خدمة سيارات في الكويت. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "دق سلف — دليل كراجات الكويت",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "دق سلف — دليلك لكراجات وميكانيكي السيارات في الكويت",
    description:
      "ابحث عن كراج أو خدمة سيارات في الكويت. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
    images: [OG_IMAGE],
  },
};

export default async function Home() {
  const featured = await getFeaturedWorkshops(12);

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "دق سلف",
    alternateName: ["Deg Self", "Degself", "دقسلف"],
    url: SITE,
    logo: LOGO,
    description:
      "أول دليل ذكي لكراجات الكويت — مجاناً، دون إعلانات، دون ترتيب مدفوع.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "KW",
      addressRegion: "الكويت",
    },
    areaServed: {
      "@type": "Country",
      name: "Kuwait",
      alternateName: "الكويت",
    },
    sameAs: ["https://x.com/degself", "https://www.instagram.com/degselfkw"],
    founder: { "@type": "Person", name: "أحمد عبدالحليم" },
    knowsAbout: [
      "صيانة السيارات",
      "كراجات الكويت",
      "ميكانيكي السيارات",
      "تصليح السيارات",
      "قطع غيار السيارات",
    ],
  };

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE}/#webapp`,
    name: "دق سلف",
    url: SITE,
    description:
      "دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت. ابحث في 1,640+ كراج موثق في 10 محافظات.",
    applicationCategory: "AutomotiveApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: "ar-KW",
    isAccessibleForFree: true,
    countryOfOrigin: {
      "@type": "Country",
      name: "Kuwait",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KWD",
    },
    areaServed: {
      "@type": "Country",
      name: "Kuwait",
    },
    audience: {
      "@type": "Audience",
      geographicArea: {
        "@type": "Country",
        name: "Kuwait",
      },
      audienceType: "أصحاب السيارات في الكويت",
    },
    creator: { "@id": `${SITE}/#organization` },
    publisher: { "@id": `${SITE}/#organization` },
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "دق سلف",
    alternateName: "Deg Self",
    url: SITE,
    inLanguage: "ar-KW",
    publisher: { "@id": `${SITE}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
      <JsonLd data={webAppLd} />

      {/* Hero — محسّن بخلفية تدرج وإضاءات + أرقام موثوقية */}
      <section className="relative overflow-hidden">
        {/* تدرج خلفي خفيف + وهج أصفر */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,10,0.10), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,214,10,0.4), transparent)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          {/* Trust badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
            أول دليل ذكي لكراجات الكويت
          </span>

          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            اكتشف <span className="text-primary">عطل سيارتك</span> الآن{" "}
            <br className="hidden sm:block" />
            واختر الكراج المناسب
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
          </p>

          <form
            action="/search"
            className="mt-2 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur sm:flex-row"
          >
            <input
              type="search"
              name="q"
              placeholder="ابحث عن كراج، منطقة، أو خدمة..."
              autoComplete="off"
              className="flex-1 rounded-xl bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-primary/30"
            >
              ابحث الآن
            </button>
          </form>

          {/* Stats Bar — أرقام موثوقية */}
          <div className="mt-4 grid w-full max-w-2xl grid-cols-3 gap-3 sm:gap-6">
            <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card/50 px-2 py-3 backdrop-blur">
              <span className="text-xl font-extrabold text-primary sm:text-2xl">+1,640</span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">كراج ومورد خدمة</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card/50 px-2 py-3 backdrop-blur">
              <span className="text-base font-extrabold text-primary sm:text-lg">جميع مناطق</span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">الكويت</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card/50 px-2 py-3 backdrop-blur">
              <span className="text-xl font-extrabold text-primary sm:text-2xl">مجانًا</span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">بدون إعلانات</span>
            </div>
          </div>
        </div>
      </section>

      {/* اكتشف العطل — قسم بارز فوق */}
      <section className="px-6 pb-4">
        <GarageTranslator />
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16">
        {/* Quick filter pills */}
        <QuickFilterPills />

        {/* Emergency CTA */}
        <EmergencyBanner />

        {/* Price Calculator CTA */}
        <PriceCalculatorBanner />

        {/* Browse by governorate */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-primary" aria-hidden />
            <div className="flex flex-col">
              <h2 className="text-xl font-extrabold sm:text-2xl">تصفّح حسب المحافظة</h2>
              <p className="text-xs text-muted-foreground">اختر محافظتك لعرض أقرب الكراجات</p>
            </div>
          </div>
          <GovernorateGrid />
        </section>

        {/* Top rated carousel */}
        <TopRatedCarousel workshops={featured} />
      </div>
    </>
  );
}
