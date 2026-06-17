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

      {/* Hero (unchanged) */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          اكتشف عطل سيارتك الآن واختر الكراج المناسب
        </h1>
        <p className="text-muted-foreground">
          دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
        </p>

        <form action="/search" className="flex w-full max-w-md gap-2">
          <input
            type="search"
            name="q"
            placeholder="ابحث عن كراج، منطقة، أو خدمة..."
            autoComplete="off"
            className="flex-1 rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            ابحث
          </button>
        </form>
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
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">تصفّح حسب المحافظة</h2>
          <GovernorateGrid />
        </section>

        {/* Top rated carousel */}
        <TopRatedCarousel workshops={featured} />
      </div>
    </>
  );
}
