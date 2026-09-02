import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "لوحة دق سلف",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/admin/quotes", label: "الطلبات", desc: "طلبات عروض الأسعار الواردة ومتابعتها." },
  { href: "/admin/analytics", label: "التحويلات", desc: "أرقام الزيارات والتحويلات." },
  { href: "/admin/partners", label: "الشبكة", desc: "الكراجات الشريكة وحالة استقبال الطلبات." },
  { href: "/admin/reviews", label: "المراجعات", desc: "مراجعات العملاء وإدارتها." },
  { href: "/admin/audit", label: "التدقيق", desc: "تدقيق بيانات الكراجات وجودتها." },
  { href: "/admin/settings", label: "الإعدادات", desc: "كلمة سر اللوحة وإعدادات عامة." },
] as const;

export default function AdminHomePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-extrabold">لوحة دق سلف</h1>

      {/* Garage self-serve outreach: download the per-garage portal links. */}
      <section className="mb-8 rounded-2xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-5">
        <h2 className="mb-1 text-lg font-extrabold">روابط صفحات الكراجات (لحملة الواتساب)</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          ملف CSV فيه كل كراج يمكن الوصول له عبر واتساب مع رابطه الخاص لتفعيل استقبال طلبات
          الأسعار (الاسم، المنطقة، رقم الواتساب، الرابط). كل رابط بمثابة مفتاح خاص — تعامل مع
          الملف كأنه سرّي ولا تشاركه.
        </p>
        {/* Plain <a>: this is a file-download API route (content-disposition),
            not a page — next/link would hijack it into client-side navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/garage-portal-export"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFD60A] px-5 py-3 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95"
        >
          ⬇️ تحميل ملف روابط الكراجات (CSV)
        </a>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-border bg-card p-5 transition hover:border-[#FFD60A]"
          >
            <h3 className="mb-1 font-extrabold text-[#FFD60A]">{s.label}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
