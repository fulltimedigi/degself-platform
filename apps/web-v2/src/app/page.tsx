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
      "دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت. ابحث في دليل شامل للكراجات الموثقة في جميع مناطق الكويت.",
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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "ما هو موقع دق سلف Degself؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "دق سلف هو الدليل الإلكتروني الأشمل لكراجات ومراكز خدمة السيارات في الكويت. يساعدك في إيجاد أقرب كراج موثوق حسب منطقتك ونوع الخدمة التي تحتاجها، مع عرض تقييمات العملاء ومقارنة الأسعار.",
        },
      },
      {
        "@type": "Question",
        name: "كيف أبحث عن كراج قريب مني في الكويت؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يمكنك البحث في موقع degself.com عن طريق اختيار منطقتك أو محافظتك، ثم تحديد نوع الخدمة التي تحتاجها مثل تغيير الزيت أو البطارية أو التكييف. ستظهر لك قائمة بأقرب الكراجات مع التقييمات وبيانات التواصل.",
        },
      },
      {
        "@type": "Question",
        name: "هل الكراجات المدرجة في دق سلف موثوقة؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "نعم، جميع الكراجات المدرجة في دليل دق سلف خضعت للمراجعة والتحقق. كما يمكن لأي عميل إضافة تقييمه وتجربته بشكل شفاف لمساعدة الآخرين في اتخاذ القرار.",
        },
      },
      {
        "@type": "Question",
        name: "ما هي المناطق التي يغطيها دليل دق سلف؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يغطي دليل دق سلف جميع محافظات الكويت الست: العاصمة، حولي، الفروانية، الجهراء، مبارك الكبير، والأحمدي. ويشمل مناطق رئيسية مثل الشويخ الصناعي، سالمية، الرقة، فحيحيل، والمنقف.",
        },
      },
      {
        "@type": "Question",
        name: "ما هي خدمات السيارات المتوفرة في الدليل؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يشمل الدليل كراجات متخصصة في: تغيير الزيت ومرشحاته، بطاريات السيارات، صيانة تكييف السيارات، الصيانة الدورية الشاملة، كهرباء السيارات، إصلاح البنشر، أعمال البودي والدهان، وإصلاح ناقل الحركة (الجير).",
        },
      },
      {
        "@type": "Question",
        name: "هل يمكنني مقارنة أسعار الكراجات في الكويت؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "نعم، يوفر موقع دق سلف أداة لمقارنة أسعار الخدمات بين الكراجات المختلفة، مما يتيح لك اختيار الكراج المناسب لميزانيتك دون الحاجة للتنقل بين الكراجات.",
        },
      },
      {
        "@type": "Question",
        name: "كيف أضيف كراجي إلى دليل دق سلف؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يمكن لأصحاب الكراجات التسجيل في دليل دق سلف مجاناً من خلال صفحة التسجيل على الموقع، وإدخال بيانات الكراج وخدماته ومواعيد العمل وبيانات التواصل. سيتم مراجعة الطلب والنشر خلال 24 ساعة.",
        },
      },
      {
        "@type": "Question",
        name: "هل دق سلف مجاني للمستخدمين؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "نعم، استخدام دليل دق سلف مجاني تماماً لأصحاب السيارات. يمكنك البحث ومقارنة الأسعار وقراءة التقييمات والتواصل مع الكراجات دون أي رسوم.",
        },
      },
      {
        "@type": "Question",
        name: "ما أفضل كراجات الكويت لتغيير الزيت؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يضم دليل دق سلف عشرات الكراجات المتخصصة في تغيير الزيت في جميع مناطق الكويت. يمكنك تصفية النتائج حسب التقييم والسعر والموقع للعثور على أفضل خيار قريب منك.",
        },
      },
      {
        "@type": "Question",
        name: "هل يمكنني حجز موعد مع الكراج عبر دق سلف؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يوفر دليل دق سلف بيانات التواصل المباشر مع كل كراج بما في ذلك رقم الهاتف والواتساب، مما يتيح لك التواصل مباشرة لحجز موعد أو الاستفسار عن الأسعار.",
        },
      },
    ],
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
      <JsonLd data={faqLd} />

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

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-12 text-center sm:py-16">
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
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            اكتب مشكلة سيارتك بلغتك — نترجمها إلى تخصص فني وندلّك على أفضل الكراجات الموثّقة في الكويت.
          </p>

          {/* مترجم العطل — الـprimary input للموقع */}
          <div className="w-full max-w-2xl">
            <GarageTranslator />
          </div>

          {/* بديل خفيف: بحث نصي مباشر */}
          <details className="w-full max-w-xl">
            <summary className="cursor-pointer select-none text-xs text-muted-foreground transition hover:text-primary">
              أو ابحث مباشرة باسم كراج أو منطقة ↓
            </summary>
            <form
              action="/search"
              className="mt-3 flex flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur sm:flex-row"
            >
              <input
                type="search"
                name="q"
                placeholder="مثال: بنشر الجهرا، أو تويوتا السالمية..."
                autoComplete="off"
                className="flex-1 rounded-xl bg-transparent px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                ابحث
              </button>
            </form>
          </details>
        </div>
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
