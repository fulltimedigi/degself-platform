import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WorkshopCard } from "@/components/WorkshopCard";
import { searchWorkshops } from "@/lib/workshops";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "بنشر متنقل في الكويت — 24 ساعة | دق سلف",
  description:
    "بنشر متنقل في الكويت يصل إليك أينما كنت. تصليح بنشر، تبديل تاير، توازن، وفحص ضغط الإطارات. متاح 24 ساعة في جميع المحافظات. دليل بنشر متنقل قريب منك.",
  alternates: { canonical: `${SITE}/bansher-mutanaqil` },
  openGraph: {
    title: "بنشر متنقل في الكويت — 24 ساعة | دق سلف",
    description:
      "بنشر متنقل يصل إليك أينما كنت في الكويت. تصليح وتبديل التواير 24 ساعة.",
    url: `${SITE}/bansher-mutanaqil`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
  },
};

export const dynamic = "force-dynamic";

const SERVICES = [
  { icon: "🛞", title: "تصليح بنشر", desc: "ترقيع وإصلاح الإطار في مكانك" },
  { icon: "🔄", title: "تبديل تاير", desc: "تبديل التواير القديمة بأخرى جديدة" },
  { icon: "⚖️", title: "توازن العجلات", desc: "ضبط وموازنة الإطارات" },
  { icon: "💨", title: "ضغط الإطارات", desc: "فحص وتعبئة الهواء" },
  { icon: "🧪", title: "فحص التواير", desc: "تشخيص حالة الإطار وعمره" },
  { icon: "🛠️", title: "فك وتركيب", desc: "خدمة فك وتركيب التواير ميدانياً" },
];

const AREAS = [
  { name: "الشويخ", time: "15-30 د" },
  { name: "السالمية", time: "20-30 د" },
  { name: "حولي", time: "20-40 د" },
  { name: "الفروانية", time: "25-45 د" },
  { name: "الأحمدي", time: "30-60 د" },
  { name: "الفحيحيل", time: "30-50 د" },
  { name: "الجهراء", time: "35-75 د" },
  { name: "صباح الأحمد", time: "40-90 د" },
];

const FAQ = [
  {
    q: "ما هو البنشر المتنقل؟",
    a: "خدمة ميدانية يأتي فيها فني الإطارات إلى مكانك بعدة متخصصة لتصليح أو تبديل التاير دون الحاجة لسحب السيارة.",
  },
  {
    q: "كم تكلفة البنشر المتنقل في الكويت؟",
    a: "تصليح ترقيع البنشر 3-7 د.ك. تبديل تاير واحد 1-3 د.ك. خدمة ميدانية قد تضاف 3-10 د.ك. حسب المنطقة والوقت.",
  },
  {
    q: "هل خدمة البنشر المتنقل متاحة 24 ساعة؟",
    a: "نعم، عدد كبير من مزوّدي البنشر المتنقل في الكويت يعملون 24 ساعة لطوارئ الطريق.",
  },
  {
    q: "كم يستغرق وصول البنشر المتنقل؟",
    a: "يتراوح زمن الوصول من 15 دقيقة في الشويخ والسالمية إلى 90 دقيقة في المناطق الطرفية كصباح الأحمد.",
  },
  {
    q: "هل يمكن تبديل التاير في مكاني؟",
    a: "نعم، خدمة البنشر المتنقل توفّر تبديل وفك وتركيب التواير في موقعك مع ضمان الجودة.",
  },
];

export default async function BansherMutanaqilPage() {
  const { workshops } = await searchWorkshops({ specialty: "بنشر", limit: 18 });

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "بنشر متنقل في الكويت",
    alternateName: ["Mobile Tire Repair Kuwait", "Mobile Puncture Kuwait"],
    serviceType: "Mobile Tire Repair",
    provider: {
      "@type": "Organization",
      name: "دق سلف",
      url: SITE,
    },
    areaServed: {
      "@type": "Country",
      name: "Kuwait",
      alternateName: "الكويت",
    },
    audience: {
      "@type": "Audience",
      audienceType: "أصحاب السيارات في الكويت",
    },
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "00:00",
      closes: "23:59",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "KWD",
      lowPrice: "3",
      highPrice: "30",
      offerCount: workshops.length || 40,
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "بنشر متنقل", item: `${SITE}/bansher-mutanaqil` },
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
              <Clock size={16} aria-hidden /> متاح 24 ساعة
            </div>
            <h1 className="text-3xl font-extrabold sm:text-5xl">
              بنشر متنقل في الكويت
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              فني بنشر يصل إليك أينما كنت — تصليح، تبديل تاير، توازن، ضغط هواء. في جميع محافظات الكويت.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/search?q=%D8%A8%D9%86%D8%B4%D8%B1"
                className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                ابحث عن بنشر متنقل قريب
              </Link>
              <Link
                href="/karaj-mutanaqil"
                className="rounded-xl border border-border bg-card px-6 py-3 font-bold text-foreground hover:bg-muted"
              >
                كراج متنقل
              </Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold">خدمات البنشر المتنقل</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SERVICES.map((s) => (
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
            مناطق التغطية وزمن الوصول
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AREAS.map((a) => (
              <Link
                key={a.name}
                href={`/search?q=${encodeURIComponent("بنشر " + a.name)}`}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:bg-muted"
              >
                <div className="font-bold">{a.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">⏱️ {a.time}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Workshops */}
        {workshops.length > 0 && (
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">أبرز محلات البنشر المتنقل</h2>
              <Link
                href="/search?q=%D8%A8%D9%86%D8%B4%D8%B1"
                className="text-sm font-semibold text-primary hover:underline"
              >
                عرض الكل
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
          <h2 className="mb-6 text-2xl font-extrabold">أسئلة شائعة</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-5"
              >
                <summary className="cursor-pointer font-bold">{f.q}</summary>
                <p className="mt-3 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-extrabold">مقالات قد تهمك</h2>
          <ul className="space-y-2 text-primary">
            <li>
              <Link href="/blog/bansher-mutanaqil-kuwait-dalil" className="hover:underline">
                ← بنشر متنقل في الكويت — أسعار وأرقام 2026
              </Link>
            </li>
            <li>
              <Link href="/blog/karaj-mutanaqil-kuwait-24-saa" className="hover:underline">
                ← كراج متنقل في الكويت 24 ساعة — الدليل الشامل
              </Link>
            </li>
            <li>
              <Link href="/blog/alamaat-sayartak-tahtaj-karaj-foran" className="hover:underline">
                ← علامات تحتاج فيها كراج فوراً
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
