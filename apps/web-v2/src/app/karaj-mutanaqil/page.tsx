import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Clock, MapPin, Phone } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WorkshopCard } from "@/components/WorkshopCard";
import { searchWorkshops } from "@/lib/workshops";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "كراج متنقل في الكويت — 24 ساعة | دق سلف",
  description:
    "خدمة كراج متنقل في الكويت تصل إليك أينما كنت. ميكانيكي متنقل، كهرباء سيارات، بنشر، بطاريات. متاح 24 ساعة في جميع المحافظات. ابحث الآن.",
  alternates: { canonical: `${SITE}/karaj-mutanaqil` },
  openGraph: {
    title: "كراج متنقل في الكويت — 24 ساعة | دق سلف",
    description:
      "ميكانيكي متنقل، كهرباء، بنشر، بطاريات. يصل إليك أينما كنت في الكويت 24 ساعة.",
    url: `${SITE}/karaj-mutanaqil`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
  },
};

export const dynamic = "force-dynamic";

const SERVICES = [
  { icon: "🔧", title: "ميكانيكي متنقل", desc: "إصلاحات ميكانيكية في مكانك" },
  { icon: "⚡", title: "كهرباء سيارات", desc: "تشخيص وإصلاح الأعطال الكهربائية" },
  { icon: "🛞", title: "بنشر متنقل", desc: "تصليح وتبديل التواير" },
  { icon: "🔋", title: "تبديل بطاريات", desc: "بطارية جديدة في 15 دقيقة" },
  { icon: "🛢️", title: "تغيير زيت", desc: "زيت ومحرك في موقعك" },
  { icon: "💨", title: "تكييف", desc: "شحن غاز وإصلاح المكيف" },
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
    q: "ما هو الكراج المتنقل؟",
    a: "خدمة ميدانية يأتي فيها الفني إلى مكانك بسيارة مجهزة بأدوات الصيانة والتشخيص لإصلاح أعطال السيارة دون الحاجة لسحبها.",
  },
  {
    q: "كم تكلفة الكراج المتنقل في الكويت؟",
    a: "رسوم المعاينة 5-15 د.ك. تصليح كهرباء أو بطارية 10-30 د.ك. أعطال ميكانيكية بسيطة 15-50 د.ك.",
  },
  {
    q: "هل الخدمة متاحة 24 ساعة؟",
    a: "نعم، معظم مزوّدي الكراج المتنقل في الكويت يعملون 24 ساعة للطوارئ.",
  },
  {
    q: "ما الفرق بين الكراج المتنقل والونش؟",
    a: "الكراج المتنقل يصلّح في الموقع. الونش يسحب السيارة لكراج ثابت عند تعذّر الإصلاح في الموقع.",
  },
];

export default async function KarajMutanaqilPage() {
  const { workshops } = await searchWorkshops({ service_mode: "mobile", limit: 18 });

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "كراج متنقل في الكويت",
    alternateName: ["Mobile Garage Kuwait", "Mobile Mechanic Kuwait"],
    serviceType: "Mobile Auto Repair",
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
      lowPrice: "5",
      highPrice: "80",
      offerCount: workshops.length || 50,
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
      { "@type": "ListItem", position: 2, name: "كراج متنقل", item: `${SITE}/karaj-mutanaqil` },
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
              كراج متنقل في الكويت
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              ميكانيكي متنقل يصل إليك أينما كنت — صيانة، كهرباء، بنشر، بطاريات. في جميع محافظات الكويت.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/search?service_mode=mobile"
                className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                ابحث عن كراج متنقل قريب
              </Link>
              <Link
                href="/emergency"
                className="rounded-xl border border-border bg-card px-6 py-3 font-bold text-foreground hover:bg-muted"
              >
                خدمات الطوارئ
              </Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold">خدمات الكراج المتنقل</h2>
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
                href={`/search?q=${encodeURIComponent("متنقل " + a.name)}`}
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
              <h2 className="text-2xl font-extrabold">أبرز خدمات الكراج المتنقل</h2>
              <Link
                href="/search?service_mode=mobile"
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
              <Link href="/blog/karaj-mutanaqil-kuwait-24-saa" className="hover:underline">
                ← كراج متنقل في الكويت 24 ساعة — الدليل الشامل 2026
              </Link>
            </li>
            <li>
              <Link href="/blog/bansher-mutanaqil-kuwait-dalil" className="hover:underline">
                ← بنشر متنقل في الكويت — أسعار وأرقام 2026
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
