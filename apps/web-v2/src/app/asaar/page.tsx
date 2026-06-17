import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, TrendingUp, ShieldCheck, AlertTriangle, BookOpen } from "lucide-react";
import { PriceCalculator } from "@/components/PriceCalculator";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "أسعار خدمات السيارات في الكويت 2026 — حاسبة تفاعلية | دق سلف",
  description:
    "احسب تكلفة خدمات السيارات في الكويت 2026: تغيير زيت، فرامل، تكييف، بطارية، إطارات، صبغ، قير، وسطحة. حاسبة تفاعلية بأسعار حقيقية لكل فئة سيارة.",
  keywords: [
    "اسعار خدمات السيارات الكويت",
    "حاسبة اسعار كراج",
    "كم سعر صيانة سيارة الكويت",
    "اسعار تصليح سيارات",
    "تكلفة صيانة سيارة الكويت 2026",
  ],
  alternates: { canonical: "/asaar" },
  openGraph: {
    title: "حاسبة أسعار خدمات السيارات في الكويت 2026 | دق سلف",
    description: "احسب تكلفة خدمات السيارات في الكويت 2026 — حاسبة تفاعلية لكل فئة سيارة.",
    url: `${SITE}/asaar`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "حاسبة أسعار خدمات السيارات في الكويت 2026 | دق سلف",
    description: "احسب تكلفة خدمات السيارات في الكويت — حاسبة تفاعلية.",
    images: ["/og-image.jpg"],
  },
};

const POPULAR_PRICES = [
  { service: "تغيير زيت + فلتر", range: "8-25 د.ك", category: "صيانة دورية" },
  { service: "فحمات الفرامل", range: "20-80 د.ك", category: "فرامل" },
  { service: "تعبئة فريون التكييف", range: "8-30 د.ك", category: "تكييف" },
  { service: "بطارية جديدة", range: "18-65 د.ك", category: "بطاريات" },
  { service: "طقم 4 إطارات", range: "70-380 د.ك", category: "تواير" },
  { service: "ميزان وترصيص", range: "5-20 د.ك", category: "تواير" },
  { service: "تغيير زيت القير", range: "15-70 د.ك", category: "قير" },
  { service: "صبغ كامل", range: "130-550 د.ك", category: "بودي" },
  { service: "سطحة (داخل المنطقة)", range: "10-25 د.ك", category: "متنقل" },
  { service: "فحص كمبيوتر", range: "5-20 د.ك", category: "كهرباء" },
];

export default function AsaarPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "حاسبة الأسعار", item: `${SITE}/asaar` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "كم تكلفة تغيير زيت السيارة في الكويت 2026؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "تتراوح تكلفة تغيير زيت المحرّك مع الفلتر في الكويت بين 8-25 د.ك للسيارات اليابانية والكورية، 10-31 د.ك للأمريكية، 14-44 د.ك للأوروبية، و 16-50 د.ك للسيارات الفاخرة. السعر يشمل الزيت والفلتر والأجور.",
        },
      },
      {
        "@type": "Question",
        name: "ليه فيه فرق سعر بين السيارة اليابانية والأوروبية؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "السيارات الأوروبية والفاخرة تحتاج قطع غيار أصلية أغلى، زيوت متخصصة، وفنيين مدرّبين على أنظمتها الإلكترونية المعقّدة. متوسط الفرق 1.75-2 ضعف السعر مقارنة بالسيارات اليابانية.",
        },
      },
      {
        "@type": "Question",
        name: "هل أسعار الحاسبة دقيقة 100%؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "الأسعار تقديرية مبنية على بيانات السوق الكويتي 2026. قد تختلف ±20% حسب الكراج، المنطقة، حالة السيارة، وقطع الغيار المطلوبة. ننصح بطلب عرض سعر مكتوب قبل البدء بأي خدمة.",
        },
      },
      {
        "@type": "Question",
        name: "كيف أستفيد من نطاق الأسعار؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "السعر المنخفض = كراجات الأحياء الصناعية والمناطق الشعبية. السعر المتوسط = كراجات المناطق التجارية. السعر المرتفع = الوكالات والمراكز المتخصصة. اختر حسب ميزانيتك ومستوى الجودة المطلوب.",
        },
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Calculator className="text-primary" size={32} aria-hidden />
        </div>
        <h1 className="mb-3 text-3xl font-extrabold sm:text-4xl">
          أسعار خدمات السيارات في الكويت
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          حاسبة تفاعلية بأسعار السوق الكويتي 2026. اختر نوع الخدمة وفئة سيارتك لتعرف نطاق التكلفة المتوقعة قبل ما تروح الكراج.
        </p>
      </header>

      <PriceCalculator />

      <section className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <TrendingUp className="text-primary" size={22} aria-hidden />
          أسعار شائعة بسرعة
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {POPULAR_PRICES.map((item) => (
            <div
              key={item.service}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-col">
                <span className="font-bold">{item.service}</span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
              <span className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 font-bold text-primary">
                {item.range}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <AlertTriangle className="text-amber-600" size={20} aria-hidden />
          نصائح ذهبية قبل الذهاب للكراج
        </h2>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            <span>
              <strong>اطلب عرض سعر مكتوب</strong> قبل البدء بأي خدمة — ليس بعد ما يفك السيارة.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            <span>
              <strong>قارن 3 كراجات على الأقل</strong> للخدمات الكبيرة (صبغ، قير، محرّك).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">3.</span>
            <span>
              <strong>اسأل عن نوع القطعة</strong>: أصلية، تجاري، مستعمل سكراب — الفرق ملحوظ في السعر والجودة.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">4.</span>
            <span>
              <strong>احتفظ بفاتورة كل خدمة</strong> — تنفع لإعادة البيع وضمان الكراج.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">5.</span>
            <span>
              <strong>تجنّب أرخص سعر دائماً</strong> — السيارة استثمار، والكراج الرخيص جداً قد يستخدم قطع رديئة.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="text-primary" size={20} aria-hidden />
          كيف نحسب الأسعار؟
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          نطاقات الأسعار في الحاسبة مبنية على:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>تحليل عروض أكثر من 100 كراج في الكويت (2025-2026).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>عوامل تأثير حقيقية: فئة السيارة، نوع القطعة، المنطقة.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>تحديث دوري كل 3 أشهر لمواكبة تغيّرات السوق.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>أسعار مرجعية فقط — السعر النهائي من الكراج.</span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="text-primary" size={22} aria-hidden />
          أدلة أسعار تفصيلية
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/blog/asaar-zayt-mahrek-kuwait-castrol-mobil"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار زيوت المحرّك</div>
            <div className="mt-1 text-xs text-muted-foreground">Castrol, Mobil, Shell — أسعار تفصيلية</div>
          </Link>
          <Link
            href="/blog/asaar-altawayer-alkuwait-2026"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار الإطارات في الكويت</div>
            <div className="mt-1 text-xs text-muted-foreground">Michelin, Bridgestone, Yokohama</div>
          </Link>
          <Link
            href="/blog/asaar-batariyat-sayara-kuwait"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار البطاريات</div>
            <div className="mt-1 text-xs text-muted-foreground">AC Delco, Varta, Amaron</div>
          </Link>
          <Link
            href="/blog/asaar-tasleeh-qair-kuwait-2026"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار إصلاح القير</div>
            <div className="mt-1 text-xs text-muted-foreground">قير أوتوماتيك ومانيوال</div>
          </Link>
          <Link
            href="/blog/asaar-taameen-sayara-kuwait-muqarana"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار التأمين</div>
            <div className="mt-1 text-xs text-muted-foreground">مقارنة 8 شركات تأمين</div>
          </Link>
          <Link
            href="/blog/sat-ha-sayara-kuwait-asaar"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار السطحة</div>
            <div className="mt-1 text-xs text-muted-foreground">كرين ونقل 24 ساعة</div>
          </Link>
          <Link
            href="/blog/asaar-taghyeer-faramil-kuwait"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">أسعار الفرامل</div>
            <div className="mt-1 text-xs text-muted-foreground">فحمات وديسكات</div>
          </Link>
          <Link
            href="/blog/muqaranat-asaar-karajat-kuwait-2026"
            className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="font-bold">مقارنة أسعار الكراجات</div>
            <div className="mt-1 text-xs text-muted-foreground">الشويخ، حولي، الفروانية</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
