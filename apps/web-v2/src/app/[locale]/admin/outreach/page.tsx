import type { Metadata } from "next";
import Link from "next/link";
import { listPortalLinksForExport } from "@/lib/garage-portal";
import { AdminOutreachClient } from "@/components/AdminOutreachClient";

export const metadata: Metadata = {
  title: "المراسلة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  let rows;
  try {
    rows = await listPortalLinksForExport();
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-2xl font-extrabold">المراسلة</h1>
        <p className="text-sm text-muted-foreground">تعذّر تحميل قائمة الكراجات، حاول تحديث الصفحة.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="mb-4 inline-block text-sm font-bold text-[#FFD60A]">
        ← رجوع للوحة
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold">المراسلة — دعوة الكراجات</h1>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        لكل كراج زر يفتح واتساب برسالة جاهزة فيها رابطه الخاص. اضغط، راجع الرسالة، وابعت. علّم
        «تم» بعد الإرسال عشان تتابع تقدّمك.
      </p>

      {/* Safety guidance — avoid getting the number flagged. */}
      <div className="mb-6 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm leading-relaxed">
        <p className="font-extrabold text-orange-400">⚠️ ابعت على دفعات</p>
        <p className="mt-1 text-muted-foreground">
          لا ترسل للـ ٩٩٨ دفعة واحدة. ابدأ بـ ١٠–٢٠ كراج، تأكد إن الرسالة توصل والرابط يفتح، ثم
          وسّع تدريجيًا (٥٠–١٠٠ باليوم بفواصل) حتى لا يتم تقييد رقمك.
        </p>
      </div>

      <AdminOutreachClient rows={rows} />
    </main>
  );
}
