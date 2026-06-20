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
  Phone,
  MessageCircle,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WA_URL,
} from "@/lib/constants";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "عن دق سلف — دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت",
  description:
    "أول دليل ذكي لكراجات الكويت — مجاناً، دون إعلانات، دون ترتيب مدفوع. تعرّف على فريقنا ومنهجيتنا في تنقية بيانات 1,757 كراجاً.",
  keywords: [
    "عن دق سلف",
    "دليل كراجات الكويت",
    "من نحن دق سلف",
    "كراجات السيارات الكويت",
    "صيانة سيارات الكويت",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "عن دق سلف — دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت",
    description: "أول دليل ذكي لكراجات الكويت — مجاناً، دون إعلانات، دون ترتيب مدفوع.",
    url: `${SITE}/about`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "عن دق سلف — دليلك لكراجات الكويت",
    description: "أول دليل ذكي لكراجات الكويت — مجاناً، دون إعلانات.",
    images: ["/og-image.jpg"],
  },
};

const STATS = [
  { value: "1,757", label: "كراج نشط موثّق" },
  { value: "6", label: "محافظات (كل الكويت)" },
  { value: "+1,760", label: "أحياء محدَّدة بدقة" },
  { value: "+10", label: "تخصصات للكراجات" },
  { value: "6 أشهر", label: "مدة التطوير" },
  { value: "0 د.ك", label: "التكلفة على المستخدم" },
];

const DIFFERENTIATORS = [
  {
    Icon: ShieldCheck,
    title: "بيانات دقيقة دون إعلانات",
    body: "لا ترتيب مدفوع، ولا قوائم مميزة بمقابل مادي. جميع الكراجات تظهر بناءً على المنطق فقط: التخصص، الموقع، حالة الفتح، والتقييمات الحقيقية.",
  },
  {
    Icon: Bot,
    title: "مترجم الكراج",
    body: "أول مساعد ذكاء اصطناعي في الكويت يترجم لغتك العادية إلى مصطلحات يفهمها أي ميكانيكي، ويرشّحك للتخصص المناسب لمشكلتك.",
  },
  {
    Icon: MapIcon,
    title: "خريطة تفاعلية",
    body: "جميع الكراجات على خريطة واحدة. شاهد الأقرب منك، اضغط للتفاصيل، واحصل على الاتجاهات في ثوانٍ.",
  },
  {
    Icon: Search,
    title: "بحث ذكي",
    body: "ابحث بالتخصص (تواير، بودي، ميكانيكا، قير، كهرباء، تكييف، بطاريات)، بالمنطقة والمحافظة، أو بحالة «مفتوح الآن».",
  },
  {
    Icon: Siren,
    title: "خدمة الطوارئ",
    body: "جميع كراجات الطوارئ التي تعمل بساعات موسّعة — سطحة، بطارية، وتواير الطوارئ — في مكان واحد.",
  },
  {
    Icon: Languages,
    title: "مُصمَّم للكويت",
    body: "عربي أساسي لا ترجمة، واجهة RTL مضبوطة، تجربة mobile-first، ومصطلحات كويتية يفهمها كل سائق.",
  },
];

const METHODOLOGY = [
  {
    title: "التحقق من الوجود",
    body: "تأكيد عبر Google Places API، والتحقق من حالة الفتح والعنوان.",
  },
  {
    title: "التحقق من التخصص",
    body: "مراجعة يدوية للأسماء والكلمات المفتاحية، وتطبيق قواعد صناعة السيارات، واستبعاد أي كراج غير مرتبط بالسيارات.",
  },
  {
    title: "التحقق الجغرافي",
    body: "ربط كل كراج بالحيّ الصحيح من Google Places، والتحقق من المحافظة والإحداثيات.",
  },
  {
    title: "السياسة الذهبية",
    body: "المشكوك فيه يُحذف. إذا كان هناك شك في صحة المعلومة، يُزال الكراج من القوائم النشطة.",
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
        alternateName: "Deg Self",
        url: SITE,
        logo: `${SITE}/brand/logo-arabic.png`,
        description:
          "أول دليل ذكي وشامل لكراجات وميكانيكي السيارات في الكويت — مجاناً، دون إعلانات.",
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
          دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
        </p>
        <p className="leading-loose text-foreground/85">
          <strong className="text-foreground">دق سلف</strong> هو أول دليل ذكي وشامل
          لكراجات وميكانيكي السيارات في الكويت. في الكويت آلاف الكراجات، لكن حين
          تتعطّل سيارتك تحتاج أن تعرف من هو الموثوق، ومن المتخصص في مشكلتك، ومن
          المفتوح الآن. خرائط Google تعرض آلاف النتائج دون تصنيف — ونحن نحلّ ذلك.
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
        <Section title="لماذا أسّسنا دق سلف؟">
          <p className="leading-loose text-foreground/85">
            في 2025، تعطّلت سيارة أحدهم في منتصف الصيف، عند 50 درجة، الساعة الحادية
            عشرة ليلاً. اتصل بستة كراجات قبل أن يجد واحداً مفتوحاً، وحتى حين وجده
            اكتشف أنه غير متخصص في نوع المشكلة. خسر مالاً ويوماً كاملاً، فكانت
            الفكرة: لا بد من حل أفضل.
          </p>
          <p className="leading-loose text-foreground/85">
            بدأنا بجمع بيانات الكراجات من خرائط Google، فاكتشفنا أن البيانات المتاحة
            ناقصة وقديمة وغير مصنّفة، وأنها لا تُفيد المستخدم العربي. عملنا ستة أشهر
            على:
          </p>
          <ul className="list-disc space-y-2 pr-6 leading-loose text-foreground/85 marker:text-primary">
            <li>
              <strong className="text-foreground">قاعدة بيانات نظيفة:</strong> راجعنا
              1,798 كراجاً وحذفنا 45 منها (مكرّرة، مغلقة، أو غير دقيقة).
            </li>
            <li>
              <strong className="text-foreground">تصنيف التخصصات:</strong> قسّمنا
              الكراجات إلى أكثر من 10 تخصصات (تواير، بودي، ميكانيكا، قير وغيرها).
            </li>
            <li>
              <strong className="text-foreground">التصنيف الجغرافي:</strong> حُدّدت
              أكثر من 1,760 كراجاً بحيّها الدقيق.
            </li>
            <li>
              <strong className="text-foreground">مترجم الكراج:</strong> مساعد ذكي
              يحوّل وصف المشكلة بلغتك العادية إلى مصطلحات تقنية يفهمها أي ميكانيكي.
            </li>
          </ul>
        </Section>

        {/* Methodology */}
        <Section title="منهجيتنا في التحقق من البيانات">
          <p className="leading-loose text-foreground/85">
            شعارنا: دقة البيانات أولاً. كل كراج في دق سلف يمرّ بأربع مراحل تحقّق:
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
            بدأنا بجمع 1,798 كراجاً، ثم نقّينا القوائم وأضفنا كراجات مكتشفة
            وموثّقة، لنصل اليوم إلى{" "}
            <strong className="text-foreground">1,757 كراجاً موثّقاً نشطاً</strong>.
          </p>
        </Section>

        {/* Differentiators */}
        <Section title="ما الذي يميّز دق سلف؟">
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
              أكثر من 10 سنوات خبرة في التطوير وإدارة المنتجات والذكاء الاصطناعي،
              وخبرة في بناء المنتجات الرقمية وتحسين محركات البحث.
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
              "لا تتبّع شخصي دون موافقتك، ولا بيع لبياناتك — نستخدم تحليلات عامة فقط لفهم استخدام الموقع.",
              "مصدر بياناتنا الرئيسي هو Google Places API، مع مراجعات يدوية وعمليات تدقيق من فريقنا، ومساهمات المستخدمين مستقبلاً.",
              "بيانات الكراجات تُراجَع دورياً، وحالة الفتح والإغلاق تأتي مباشرةً من Google.",
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
                  "تطبيقات iOS وAndroid",
                  "دمج واتساب للتواصل المباشر",
                  "برنامج الكراجات الموثّقة (شارات للموثوقين)",
                ],
              },
              {
                period: "2027",
                items: [
                  "التوسّع في المنطقة: السعودية، الإمارات، البحرين",
                  "أداة تشخيص الأعطال بالذكاء الاصطناعي",
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

        {/* Contact */}
        <Section title="تواصل معنا">
          <div className="flex flex-wrap gap-3">
            <a
              href={BUSINESS_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90"
            >
              <MessageCircle size={18} aria-hidden />
              واتساب — {BUSINESS_PHONE_DISPLAY}
            </a>
            <a
              href={`tel:${BUSINESS_PHONE_TEL}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-bold text-foreground hover:bg-muted"
            >
              <Phone size={18} className="text-primary" aria-hidden />
              اتصال — {BUSINESS_PHONE_DISPLAY}
            </a>
          </div>
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
