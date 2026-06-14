import Link from "next/link";
import type { Metadata } from "next";
import {
  ShieldCheck,
  Bot,
  Map as MapIcon,
  Search,
  Siren,
  Languages,
  CheckCircle2,
  MapPin,
  Wrench,
  Quote,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "عن دق سلف — أول دليل ذكي لكراجات الكويت",
  description:
    "تعرّف على دق سلف، فريقنا، منهجيتنا في تنقية بيانات أكثر من 1,750 كراج في الكويت، وخطّتنا للمستقبل.",
  keywords: [
    "عن دق سلف",
    "دليل كراجات الكويت",
    "من نحن دق سلف",
    "كراجات السيارات الكويت",
    "صيانة سيارات الكويت",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "عن دق سلف — أول دليل ذكي لكراجات الكويت",
    description: "أول دليل ذكي لكراجات الكويت — مجاناً، بدون إعلانات، بدون ترتيب مدفوع.",
    url: `${SITE}/about`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/brand/logo-arabic.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "عن دق سلف — أول دليل ذكي لكراجات الكويت",
    description: "أول دليل ذكي لكراجات الكويت — مجاناً، بدون إعلانات.",
    images: ["/brand/logo-arabic.png"],
  },
};

const STATS = [
  { value: "1,753", label: "كراج نشط موثّق" },
  { value: "6", label: "محافظات (كل الكويت)" },
  { value: "+1,760", label: "بيانات أحياء دقيقة" },
  { value: "+10", label: "تخصص للكراجات" },
  { value: "6 شهور", label: "مدة التطوير" },
  { value: "0 د.ك", label: "التكلفة على المستخدم" },
];

const DIFFERENTIATORS = [
  {
    Icon: ShieldCheck,
    title: "بيانات دقيقة بدون إعلانات",
    body: "مفيش ترتيب مدفوع ولا قوائم مميزة بفلوس. كل الكراجات بتظهر بناءً على المنطق فقط: التخصص، الموقع، حالة الفتح، والتقييمات الحقيقية.",
  },
  {
    Icon: Bot,
    title: "مترجم الكراج",
    body: "أول مساعد ذكاء اصطناعي في الكويت يترجم لغتك العادية لمصطلحات يفهمها أي ميكانيكي، ويرشّحلك التخصص المناسب لمشكلتك.",
  },
  {
    Icon: MapIcon,
    title: "خريطة تفاعلية",
    body: "كل الكراجات على خريطة واحدة. شوف الأقرب منك، اضغط للتفاصيل، واحصل على الاتجاهات في ثوانٍ.",
  },
  {
    Icon: Search,
    title: "بحث ذكي",
    body: "ابحث بالتخصص (تواير، بودي، ميكانيكا، قير، كهرباء، تكييف، بطاريات)، بالمنطقة والمحافظة، أو بحالة «مفتوح الآن».",
  },
  {
    Icon: Siren,
    title: "خدمة الطوارئ",
    body: "كل كراجات الطوارئ اللي بتشتغل ساعات موسعة — سطحة، بطارية، وتواير الطوارئ — في مكان واحد.",
  },
  {
    Icon: Languages,
    title: "مصمّم للكويت",
    body: "عربي أساسي مش ترجمة، RTL مظبوط، تجربة mobile-first، ومصطلحات كويتية يفهمها كل سائق.",
  },
];

const METHODOLOGY = [
  {
    title: "التحقق من الوجود",
    body: "تأكيد عبر Google Places API، التحقق من حالة الفتح، والتحقق من العنوان.",
  },
  {
    title: "التحقق من التخصص",
    body: "مراجعة يدوية للأسماء والكلمات المفتاحية، وتطبيق قواعد صناعة السيارات، واستبعاد أي كراج غير متعلّق بالسيارات.",
  },
  {
    title: "التحقق الجغرافي",
    body: "ربط كل كراج بالحي الصحيح من Google Places، والتحقق من المحافظة والإحداثيات.",
  },
  {
    title: "السياسة الذهبية",
    body: "المشكوك فيه نحذفه. لو فيه شك في صحة المعلومة، الكراج يتشال من القوائم النشطة.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "البحث بالتخصص والمنطقة وفّرلي ساعات. كانوا بيدوّروا على ميكانيكي متخصص في كهرباء، لقوهم في ثوانٍ على دق سلف.",
    name: "أبو خالد، السالمية",
  },
  {
    quote:
      "الموقع شغّال على الموبايل أحسن من أي تطبيق، ومترجم الكراج وصفلي المشكلة بالظبط حتى مع أغرب وصف.",
    name: "فاطمة، جابر العلي",
  },
  {
    quote:
      "أهم حاجة عند الموقع إنه مش بيشغّلني بإعلانات. النتائج اللي بتظهر هي فعلاً ذات صلة باستفساري.",
    name: "ضحى، حولي",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "دق سلف",
        url: SITE,
        logo: `${SITE}/brand/logo-arabic.png`,
        description:
          "أول دليل ذكي وشامل لكراجات وميكانيكي السيارات في الكويت — مجاناً، بدون إعلانات.",
        areaServed: { "@type": "Country", name: "الكويت" },
        founder: { "@type": "Person", name: "أحمد عبدالحليم" },
        sameAs: [
          "https://x.com/degself",
          "https://www.instagram.com/degselfkw",
        ],
      },
      {
        "@type": "AboutPage",
        "@id": `${SITE}/about#aboutpage`,
        url: `${SITE}/about`,
        name: "عن دق سلف",
        isPartOf: { "@id": `${SITE}/#website` },
        mainEntity: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
          { "@type": "ListItem", position: 2, name: "عن دق سلف", item: `${SITE}/about` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">عن دق سلف</h1>
        <p className="text-xl font-bold text-primary">
          نخلّيك تلاقي الكراج الصح، في الوقت الصح، بدون عذاب
        </p>
        <p className="leading-loose text-foreground/85">
          <strong className="text-foreground">دق سلف</strong> هو أول دليل ذكي وشامل
          لكراجات وميكانيكي السيارات في الكويت. في الكويت فيه آلاف الكراجات، لكن لما
          سيارتك بتقف أنت محتاج تعرف مين الموثوق، مين متخصص في مشكلتك، ومين مفتوح
          دلوقتي. خرائط جوجل بتوريك آلاف النتائج بدون تصنيف — واحنا بنحلّها.
        </p>
      </header>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-4 py-5 text-center"
          >
            <span className="text-2xl font-extrabold text-primary">{s.value}</span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-12">
        {/* Why */}
        <Section title="ليه أسّسنا دق سلف؟">
          <p className="leading-loose text-foreground/85">
            في 2025، واحد سيارته خربت في منتصف الصيف، عند الـ 50 درجة، الساعة 11
            الليل. اتصل بستة كراجات قبل ما يلاقي واحد مفتوح، وحتى لما لقاه اكتشف إنه
            مش متخصص في نوع المشكلة. خسر فلوس ويوم كامل. قلنا لازم في حل أفضل.
          </p>
          <p className="leading-loose text-foreground/85">
            بدأنا نجمع بيانات الكراجات من خرائط جوجل، واكتشفنا إن البيانات الموجودة
            ناقصة، قديمة، غير مصنّفة، ومش بتساعد المستخدم العربي. اشتغلنا ستة شهور على:
          </p>
          <ul className="list-disc space-y-2 pr-6 leading-loose text-foreground/85 marker:text-primary">
            <li>
              <strong className="text-foreground">قاعدة بيانات نظيفة:</strong> راجعنا
              1,798 كراج وحذفنا 45 منهم (مكررة، مقفولة، أو غير دقيقة).
            </li>
            <li>
              <strong className="text-foreground">تصنيف تخصصات:</strong> قسّمنا
              الكراجات لأكثر من 10 تخصصات (تواير، بودي، ميكانيكا، قير، وغيرها).
            </li>
            <li>
              <strong className="text-foreground">تصنيف جغرافي:</strong> أكثر من 1,760
              كراج اتعيّن لهم حي دقيق.
            </li>
            <li>
              <strong className="text-foreground">مترجم الكراج:</strong> مساعد ذكي
              يحوّل وصف المشكلة بلغتك العادية لمصطلحات تقنية يفهمها أي ميكانيكي.
            </li>
          </ul>
        </Section>

        {/* Methodology */}
        <Section title="منهجيتنا في التحقق من البيانات">
          <p className="leading-loose text-foreground/85">
            شعارنا: أهم شيء دقة البيانات. كل كراج في دق سلف يمرّ على أربع مراحل تحقّق:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {METHODOLOGY.map((m, idx) => (
              <div
                key={m.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <h3 className="font-bold">{m.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
          <p className="leading-loose text-foreground/85">
            في النهاية، عندنا{" "}
            <strong className="text-foreground">1,753 كراج موثّق</strong> من أصل 1,798
            جمعناه بدايةً.
          </p>
        </Section>

        {/* Differentiators */}
        <Section title="ايش يميّز دق سلف؟">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DIFFERENTIATORS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
              >
                <Icon size={24} className="text-primary" aria-hidden />
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Team */}
        <Section title="فريقنا">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wrench size={22} aria-hidden />
              </span>
              <div>
                <p className="font-bold">أحمد عبدالحليم</p>
                <p className="text-sm text-muted-foreground">مؤسس دق سلف</p>
              </div>
            </div>
            <p className="leading-relaxed text-foreground/85">
              أكثر من 10 سنين خبرة في التطوير وإدارة المنتجات والذكاء الاصطناعي، وخبرة
              في بناء المنتجات الرقمية والـ SEO.
            </p>
            <div className="border-t border-border pt-4">
              <p className="font-bold">المساهمون الفنيون</p>
              <ul className="mt-2 list-disc space-y-1 pr-6 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                <li>خبراء هندسة بيانات لتنظيف القوائم</li>
                <li>مستشارون في صناعة السيارات لتدقيق التصنيفات</li>
                <li>سائقون كويتيون شاركوا في التجربة الأولى</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Transparency */}
        <Section title="شفافيتنا">
          <ul className="flex flex-col gap-3">
            {[
              "مفيش تتبّع شخصي بدون موافقتك، ومفيش بيع لبياناتك — نستخدم تحليلات عامة فقط لفهم استخدام الموقع.",
              "مصدر بياناتنا الرئيسي هو Google Places API، مع مراجعات وتدقيقات يدوية من فريقنا، ومساهمات المستخدمين مستقبلاً.",
              "بيانات الكراجات تتراجَع دورياً، وحالة الفتح والإغلاق تأتي مباشرة من Google.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 leading-loose text-foreground/85">
                <CheckCircle2 size={20} className="mt-1 shrink-0 text-primary" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Roadmap */}
        <Section title="خطّتنا للمستقبل">
          <div className="flex flex-col gap-4">
            {[
              {
                period: "الربع الثالث 2026",
                items: [
                  "نظام تقييمات حقيقية من المستخدمين مع تحقّق بالهاتف",
                  "حجز مواعيد مباشر مع الكراجات",
                  "لوحة تحكم لأصحاب الكراجات",
                ],
              },
              {
                period: "الربع الرابع 2026",
                items: [
                  "تطبيقات iOS و Android",
                  "دمج WhatsApp للتواصل المباشر",
                  "برنامج الكراجات الموثّقة (شارات للموثوقين)",
                ],
              },
              {
                period: "2027",
                items: [
                  "التوسّع للمنطقة: السعودية، الإمارات، البحرين",
                  "أداة تشخيص أعطال بالذكاء الاصطناعي",
                ],
              },
            ].map((phase) => (
              <div key={phase.period} className="rounded-xl border border-border bg-card p-5">
                <p className="font-bold text-primary">{phase.period}</p>
                <ul className="mt-2 list-disc space-y-1 pr-6 leading-relaxed text-foreground/85 marker:text-primary">
                  {phase.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Testimonials */}
        <Section title="تجارب المستخدمين">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
              >
                <Quote size={22} className="text-primary" aria-hidden />
                <blockquote className="text-sm leading-relaxed text-foreground/85">
                  {t.quote}
                </blockquote>
                <figcaption className="text-sm font-bold text-muted-foreground">
                  — {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title="تواصل معنا">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "للمستخدمين", email: "hello@degself.com" },
              { label: "لأصحاب الكراجات", email: "owner@degself.com" },
              { label: "للصحافة والشراكات", email: "press@degself.com" },
            ].map((c) => (
              <div key={c.email} className="rounded-xl border border-border bg-card p-5">
                <p className="font-bold">{c.label}</p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  {c.email}
                </a>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={18} className="text-primary" aria-hidden />
            صُنع بفخر في الكويت — للسائق الكويتي.
          </p>
        </Section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 border-t border-border pt-8">
          <Link
            href="/search"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            ابدأ البحث
          </Link>
          <Link
            href="/emergency"
            className="rounded-xl border border-border px-6 py-3 font-bold text-foreground hover:bg-muted"
          >
            طوارئ — سطحة وكراج متنقل
          </Link>
        </div>
      </div>
    </div>
  );
}
