import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { MapPin, ChevronLeft } from "lucide-react";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "كراجات الكويت حسب المنطقة | دق سلف",
  description:
    "تصفح أفضل كراجات السيارات في الكويت حسب المنطقة. الشويخ، حولي، السالمية، الفروانية، الجهراء، الفحيحيل، وأكثر. 1,640+ كراج موثق.",
  alternates: { canonical: "/manatiq" },
  openGraph: {
    title: "كراجات الكويت حسب المنطقة | دق سلف",
    description: "تصفح أفضل كراجات السيارات في الكويت حسب المنطقة. 1,640+ كراج موثق.",
    url: `${SITE}/manatiq`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
  },
};

// All major areas with workshop counts (approximations for SEO content)
const AREAS = [
  { ar: "الشويخ", en: "Shuwaikh", desc: "المنطقة الصناعية الرئيسية في الكويت — أكبر تجمع للكراجات والميكانيكي", featured: true },
  { ar: "حولي", en: "Hawalli", desc: "كراجات متنوعة للسيارات الأوروبية واليابانية في قلب العاصمة" },
  { ar: "السالمية", en: "Salmiya", desc: "كراجات راقية للسيارات الفاخرة والـ SUVs" },
  { ar: "الفروانية", en: "Farwaniya", desc: "خيارات اقتصادية وكراجات متخصصة للسيارات الآسيوية" },
  { ar: "خيطان", en: "Khaitan", desc: "كراجات تجارية وورش سريعة لتغيير الزيوت والفلاتر" },
  { ar: "الري", en: "Al Rai", desc: "بديل ممتاز للشويخ — كراجات حديثة بأسعار تنافسية" },
  { ar: "الجهراء", en: "Jahra", desc: "كراجات بأسعار اقتصادية لسكان شمال الكويت" },
  { ar: "الفحيحيل", en: "Fahaheel", desc: "المركز الرئيسي لخدمات السيارات في جنوب الكويت" },
  { ar: "صباح السالم", en: "Sabah Al Salem", desc: "كراجات سريعة لخدمة سكان المنطقة الجنوبية" },
  { ar: "الرقعي", en: "Rqaie", desc: "كراجات متخصصة للسيارات اليابانية" },
  { ar: "الأحمدي", en: "Ahmadi", desc: "خدمات صيانة كاملة لسكان محافظة الأحمدي" },
  { ar: "المنقف", en: "Mangaf", desc: "كراجات قريبة لسكان منطقة الجنوب الساحلية" },
  { ar: "الجابرية", en: "Jabriya", desc: "كراجات راقية وسريعة في قلب الكويت" },
  { ar: "سلوى", en: "Salwa", desc: "كراجات متخصصة للسيارات الفاخرة والكهربائية" },
];

const SPECIALTIES = [
  { slug: "صيانة", label: "صيانة عامة" },
  { slug: "ميكانيكا", label: "ميكانيكا" },
  { slug: "كهرباء", label: "كهرباء سيارات" },
  { slug: "تواير", label: "تواير وبنشر" },
  { slug: "بودي", label: "بودي وصبغ" },
  { slug: "قير", label: "قير" },
  { slug: "زيوت", label: "زيوت" },
  { slug: "تكييف", label: "تكييف" },
  { slug: "بطاريات", label: "بطاريات" },
];

const KARAJ = encodeURIComponent("كراج");

export default function ManatiqPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "كراجات الكويت حسب المنطقة", item: `${SITE}/manatiq` },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "كراجات الكويت حسب المنطقة",
    itemListElement: AREAS.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `كراجات ${a.ar}`,
      url: `${SITE}/${KARAJ}/صيانة/${encodeURIComponent(a.ar)}`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="مسار التنقّل">
        <Link href="/" className="font-semibold text-primary hover:underline">
          الرئيسية
        </Link>
        <ChevronLeft size={16} aria-hidden />
        <span>كراجات الكويت حسب المنطقة</span>
      </nav>

      {/* Hero */}
      <header className="mt-6 flex flex-col gap-4 border-b border-border pb-8">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          كراجات الكويت حسب المنطقة
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          تصفح أفضل كراجات وميكانيكي السيارات في الكويت موزعة على{" "}
          <strong className="text-foreground">14 منطقة رئيسية</strong>. من الشويخ
          الصناعية إلى الفحيحيل، اعثر على كراج موثق قريب منك من بين{" "}
          <strong className="text-foreground">1,640+ كراج</strong>.
        </p>
      </header>

      {/* Featured: Shuwaikh */}
      <section className="mt-8 rounded-2xl bg-primary/5 p-6">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            ⭐ المنطقة الأولى
          </span>
          <h2 className="text-2xl font-extrabold">الشويخ الصناعية</h2>
          <p className="leading-relaxed text-muted-foreground">
            المنطقة الصناعية الأكبر في الكويت — تجمّع تاريخي لمئات الكراجات
            المتخصصة في كل أنواع السيارات: اليابانية، الألمانية، الأمريكية،
            والكورية. الأسعار تنافسية والخبرات عالية.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPECIALTIES.map((sp) => (
              <Link
                key={sp.slug}
                href={`/${KARAJ}/${encodeURIComponent(sp.slug)}/${encodeURIComponent("الشويخ")}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm hover:border-primary hover:text-primary"
              >
                {sp.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Areas Grid */}
      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-extrabold">كل مناطق الكويت</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((area) => (
            <article
              key={area.ar}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-primary" aria-hidden />
                <h3 className="text-lg font-bold">{area.ar}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {area.desc}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={`/${KARAJ}/${encodeURIComponent("صيانة")}/${encodeURIComponent(area.ar)}`}
                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  صيانة
                </Link>
                <Link
                  href={`/${KARAJ}/${encodeURIComponent("ميكانيكا")}/${encodeURIComponent(area.ar)}`}
                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  ميكانيكا
                </Link>
                <Link
                  href={`/${KARAJ}/${encodeURIComponent("بودي")}/${encodeURIComponent(area.ar)}`}
                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  بودي
                </Link>
                <Link
                  href={`/${KARAJ}/${encodeURIComponent("تكييف")}/${encodeURIComponent(area.ar)}`}
                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  تكييف
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-extrabold">
          كيف تختار أفضل كراج في منطقتك؟
        </h2>
        <div className="flex flex-col gap-3 leading-relaxed text-muted-foreground">
          <p>
            الكويت تضم 6 محافظات و 14 منطقة رئيسية، وكل منطقة لها طابعها الخاص
            في خدمات السيارات. مثلاً، <strong>الشويخ الصناعية</strong> هي
            المركز التاريخي لكل أنواع التصليح، بينما <strong>السالمية</strong>{" "}
            تختص بالسيارات الفاخرة، و<strong>الجهراء</strong> توفر أسعار
            اقتصادية ممتازة.
          </p>
          <p>
            عند اختيار كراج، ابحث عن:
          </p>
          <ul className="list-disc pe-6 ps-2">
            <li>قرب الموقع من سكنك أو عملك</li>
            <li>التخصص في نوع سيارتك (ياباني، ألماني، أمريكي)</li>
            <li>توفر ضمان مكتوب على الخدمات</li>
            <li>الشفافية في الأسعار قبل البدء</li>
            <li>التقييمات والتوصيات من العملاء السابقين</li>
          </ul>
          <p>
            <strong>دق سلف</strong> يساعدك على اتخاذ القرار الصحيح بتقديم دليل
            شامل لكل الكراجات في كل منطقة، مع التصنيف حسب التخصص والمنطقة.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-primary p-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start">
        <div>
          <h3 className="text-lg font-extrabold text-primary-foreground">
            ابحث في 1,640+ كراج موثق
          </h3>
          <p className="text-sm text-primary-foreground/80">
            استخدم البحث المتقدم بالتخصص والمنطقة
          </p>
        </div>
        <Link
          href="/search"
          className="mx-auto rounded-xl bg-foreground px-6 py-3 font-bold text-background hover:opacity-90 sm:mx-0"
        >
          ابدأ البحث الآن
        </Link>
      </div>
    </main>
  );
}
