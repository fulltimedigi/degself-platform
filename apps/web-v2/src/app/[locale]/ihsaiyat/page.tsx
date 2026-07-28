import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "إحصائيات السيارات والكراجات في الكويت 2026 | دق سلف",
  description:
    "أرقام وإحصائيات حصرية عن قطاع السيارات في الكويت 2026. عدد الكراجات، التخصصات، المناطق، ومتوسط الأسعار. بيانات من 1,640+ كراج موثق.",
  alternates: { canonical: "/ihsaiyat" },
  openGraph: {
    title: "إحصائيات السيارات والكراجات في الكويت 2026",
    description: "أرقام وإحصائيات حصرية عن قطاع السيارات في الكويت 2026",
    url: `${SITE}/ihsaiyat`,
    type: "article",
    locale: "ar_KW",
    siteName: "دق سلف",
  },
};

export default function IhsaiyatPage() {
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "إحصائيات قطاع السيارات والكراجات في الكويت 2026",
    description:
      "بيانات شاملة عن 1,640+ كراج وميكانيكي في الكويت موزعة على 14 منطقة و 9 تخصصات",
    url: `${SITE}/ihsaiyat`,
    keywords: [
      "كراجات الكويت",
      "إحصائيات السيارات",
      "ميكانيكي الكويت",
      "صيانة السيارات",
    ],
    creator: { "@type": "Organization", name: "دق سلف", url: SITE },
    license: "https://creativecommons.org/licenses/by/4.0/",
    inLanguage: "ar",
    datePublished: "2026-06-16",
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "إحصائيات", item: `${SITE}/ihsaiyat` },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={datasetLd} />
      <JsonLd data={breadcrumbLd} />

      {/* Hero */}
      <header className="flex flex-col gap-3 border-b border-border pb-8">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          📊 بيانات حصرية 2026
        </span>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          إحصائيات قطاع السيارات والكراجات في الكويت 2026
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          أرقام وحقائق حصرية من أكبر دليل لخدمات السيارات في الكويت. هذه
          البيانات متاحة للاستخدام بشرط ذكر المصدر (دق سلف).
        </p>
      </header>

      {/* Big Numbers */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center">
          <span className="text-4xl font-extrabold text-primary">1,640+</span>
          <span className="text-sm font-semibold">كراج موثق</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center">
          <span className="text-4xl font-extrabold text-primary">14</span>
          <span className="text-sm font-semibold">منطقة في الكويت</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center">
          <span className="text-4xl font-extrabold text-primary">9</span>
          <span className="text-sm font-semibold">تخصصات رئيسية</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center">
          <span className="text-4xl font-extrabold text-primary">15+</span>
          <span className="text-sm font-semibold">ماركة سيارات</span>
        </div>
      </section>

      {/* Distribution by Area */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">توزيع الكراجات حسب المنطقة</h2>
        <div className="space-y-3">
          {[
            { area: "الشويخ الصناعية", pct: 35, count: "570+" },
            { area: "الفروانية + خيطان", pct: 18, count: "295+" },
            { area: "الفحيحيل + المنقف", pct: 12, count: "200+" },
            { area: "حولي + السالمية", pct: 10, count: "165+" },
            { area: "الجهراء", pct: 9, count: "145+" },
            { area: "الري", pct: 7, count: "115+" },
            { area: "الأحمدي + صباح السالم", pct: 5, count: "85+" },
            { area: "مناطق أخرى", pct: 4, count: "65+" },
          ].map((row) => (
            <div key={row.area} className="flex items-center gap-3">
              <span className="w-40 text-sm font-semibold">{row.area}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="flex h-7 items-center justify-end rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground"
                  style={{ width: `${row.pct * 2}%` }}
                >
                  {row.pct}%
                </div>
              </div>
              <span className="w-20 text-sm text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Average Prices */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">متوسط أسعار الخدمات الشائعة 2026</h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-start">الخدمة</th>
                <th className="px-4 py-3 text-start">المتوسط (د.ك)</th>
                <th className="px-4 py-3 text-start">النطاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["تغيير زيت محرك (تخليقي)", "18", "12-30"],
                ["تغيير فرامل أمامية", "25", "15-40"],
                ["شحن فريون تكييف", "10", "5-15"],
                ["تنظيف تكييف كامل", "18", "10-25"],
                ["فحص كمبيوتر سيارة", "8", "5-15"],
                ["بطارية متوسطة (60Ah)", "30", "22-38"],
                ["عمرة قير كاملة", "700", "400-1500"],
                ["فحص فني شامل", "30", "25-50"],
                ["تغيير 4 تواير", "100", "60-180"],
                ["بودي وصبغ كامل", "350", "200-600"],
              ].map(([service, avg, range]) => (
                <tr key={service} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-semibold">{service}</td>
                  <td className="px-4 py-3 text-primary font-bold">{avg}</td>
                  <td className="px-4 py-3 text-muted-foreground">{range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Specialty Distribution */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold">أكثر التخصصات شيوعاً</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "صيانة عامة", count: "780+", emoji: "🔧" },
            { name: "ميكانيكا", count: "520+", emoji: "⚙️" },
            { name: "بودي وصبغ", count: "380+", emoji: "🎨" },
            { name: "كهرباء سيارات", count: "340+", emoji: "🔌" },
            { name: "تكييف", count: "290+", emoji: "❄️" },
            { name: "تواير وبنشر", count: "260+", emoji: "🛞" },
            { name: "زيوت", count: "220+", emoji: "🛢️" },
            { name: "قير", count: "180+", emoji: "🔩" },
            { name: "بطاريات", count: "140+", emoji: "🔋" },
          ].map((sp) => (
            <div
              key={sp.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="text-3xl" aria-hidden>
                {sp.emoji}
              </span>
              <div>
                <p className="font-bold">{sp.name}</p>
                <p className="text-sm text-muted-foreground">{sp.count} كراج</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Insights */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-extrabold">أهم الإحصائيات</h2>
        <ul className="flex flex-col gap-3 leading-relaxed">
          <li>
            🏭 <strong>35% من كراجات الكويت في الشويخ الصناعية</strong> — أكبر
            تجمع في الدولة
          </li>
          <li>
            🌡️ <strong>درجة حرارة الكويت تخفّض عمر بطارية السيارة 30-40%</strong>{" "}
            مقارنة بالبلدان المعتدلة
          </li>
          <li>
            💰 <strong>الفرق في الأسعار بين الكراجات قد يصل لـ 200%</strong> لنفس
            الخدمة — البحث والمقارنة يوفر مئات الدنانير
          </li>
          <li>
            🚗 <strong>السيارات اليابانية الأكثر طلباً</strong> — تويوتا، نيسان،
            ولكزس تشكّل 55% من السوق
          </li>
          <li>
            🔧 <strong>أكثر الأعطال شيوعاً صيفاً:</strong> ارتفاع حرارة المحرك،
            تلف التكييف، وموت البطارية
          </li>
          <li>
            ⏰ <strong>أوقات الذروة:</strong> صباح الخميس والسبت — أفضل وقت
            للزيارة: ظهر يوم الإثنين أو الثلاثاء
          </li>
        </ul>
      </section>

      {/* Embed/Share */}
      <section className="mt-12 rounded-2xl border-2 border-primary bg-primary/5 p-6">
        <h3 className="mb-3 text-lg font-extrabold">📤 شارك هذه الإحصائيات</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          هذه البيانات متاحة للاستخدام في المقالات والتقارير. الاستخدام يتطلب فقط{" "}
          <strong>ذكر المصدر مع رابط</strong>:
        </p>
        <div className="rounded-lg bg-foreground/5 p-3 font-mono text-xs">
          المصدر:{" "}
          <Link href="/" className="text-primary hover:underline">
            دق سلف - degself.com
          </Link>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-primary p-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start">
        <div>
          <h3 className="text-lg font-extrabold text-primary-foreground">
            ابحث في قاعدة بياناتنا
          </h3>
          <p className="text-sm text-primary-foreground/80">
            1,640+ كراج موزّع على 14 منطقة
          </p>
        </div>
        <Link
          href="/search"
          className="mx-auto rounded-xl bg-foreground px-6 py-3 font-bold text-background hover:opacity-90 sm:mx-0"
        >
          ابدأ البحث
        </Link>
      </div>

      <div className="mt-12 text-center text-xs text-muted-foreground">
        آخر تحديث: 16 يونيو 2026 — البيانات من قاعدة بيانات دق سلف
      </div>
    </main>
  );
}
