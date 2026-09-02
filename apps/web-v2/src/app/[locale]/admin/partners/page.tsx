import type { Metadata } from "next";
import Link from "next/link";
import { AdminPartnersClient } from "@/components/AdminPartnersClient";
import { RfqOperationsStatus } from "@/components/RfqOperationsStatus";

export const metadata: Metadata = {
  title: "الشبكة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPartnersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">الشبكة</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          قائمة كراجات دق سلف الموثقة. أضف الكراج من رابط صفحته في المنصة، والشبكة تظل مفتوحة بدون حد أقصى وتكون مصدر الأولوية والتوجيه الآلي لطلبات عروض الأسعار.
        </p>
      </div>

      {/* Garage self-serve outreach: download the per-garage portal links. */}
      <section className="mb-6 rounded-2xl border border-[#FFD60A]/40 bg-[#FFD60A]/5 p-5">
        <h2 className="mb-1 text-lg font-extrabold">روابط صفحات الكراجات (لحملة الواتساب)</h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          ملف CSV فيه كل كراج يمكن الوصول له عبر واتساب مع رابطه الخاص لتفعيل استقبال طلبات
          الأسعار (الاسم، المنطقة، رقم الواتساب، الرابط). كل رابط بمثابة مفتاح خاص — تعامل مع
          الملف كأنه سرّي ولا تشاركه.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/outreach"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFD60A] px-5 py-3 text-base font-extrabold text-[#0A0A0A] transition hover:brightness-95"
          >
            💬 ابدأ المراسلة (زر واتساب لكل كراج)
          </Link>
          {/* Plain <a>: this is a file-download API route (content-disposition),
              not a page — next/link would hijack it into client-side navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/garage-portal-export"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFD60A] px-5 py-3 text-base font-extrabold text-[#FFD60A] transition hover:bg-[#FFD60A]/10"
          >
            ⬇️ تحميل ملف CSV
          </a>
        </div>
      </section>

      <RfqOperationsStatus />
      <AdminPartnersClient />
    </main>
  );
}
