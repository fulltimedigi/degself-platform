import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة — دق سلف",
  description:
    "الصفحة التي تبحث عنها غير موجودة. عد إلى الرئيسية أو ابحث عن كراج في الكويت.",
  robots: { index: false, follow: true },
};

const QUICK_LINKS = [
  { href: "/", label: "الرئيسية", icon: "🏠" },
  { href: "/search", label: "ابحث عن كراج", icon: "🔍" },
  { href: "/asaar", label: "حاسبة الأسعار", icon: "💰" },
  { href: "/blog", label: "المدونة", icon: "📖" },
  { href: "/emergency", label: "طوارئ", icon: "🚨" },
  { href: "/map", label: "الخريطة", icon: "🗺️" },
];

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-16">
      {/* خلفية وهج أصفر */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,214,10,0.08), transparent 70%)",
        }}
      />

      <div className="relative flex max-w-2xl flex-col items-center gap-6 text-center">
        {/* رقم 404 ضخم */}
        <div className="relative">
          <span className="select-none text-[120px] font-black leading-none text-primary/20 sm:text-[160px]">
            404
          </span>
          {/* أيقونة سيارة معطلة */}
          <svg
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
            <circle cx="6.5" cy="16.5" r="2.5" />
            <circle cx="16.5" cy="16.5" r="2.5" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold sm:text-4xl">
          الصفحة <span className="text-primary">معطّلة</span> أو غير موجودة
        </h1>
        <p className="max-w-md text-base text-muted-foreground sm:text-lg">
          الرابط الذي وصلت منه قد يكون قديماً أو غير صحيح. جرّب أحد الروابط أدناه
          أو ارجع للرئيسية.
        </p>

        <Link
          href="/"
          className="rounded-xl bg-primary px-8 py-3 font-extrabold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-primary/30"
        >
          العودة للرئيسية
        </Link>

        {/* روابط سريعة */}
        <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-start transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md"
            >
              <span className="text-xl" aria-hidden>
                {l.icon}
              </span>
              <span className="text-sm font-bold transition group-hover:text-primary">
                {l.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
