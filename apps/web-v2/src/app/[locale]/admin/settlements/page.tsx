import type { Metadata } from "next";
import Link from "next/link";
import { listRecentSettlements, isSettlementEnabled } from "@/lib/settlements";
import { relativeArabic } from "@/lib/utils";

export const metadata: Metadata = {
  title: "تأكيد إتمام الصفقات",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_settlement: "بانتظار التأكيد",
  completed_confirmed: "تمّت",
  no_show: "لم يحضر",
  disputed: "متنازع عليه",
};

const SOURCE_LABEL: Record<string, string> = {
  customer: "العميل",
  auto: "تلقائي",
  admin: "الأدمن",
  garage: "الكراج",
};

export default async function AdminSettlementsPage() {
  let rows: Awaited<ReturnType<typeof listRecentSettlements>> = [];
  let loadError = false;
  try {
    rows = await listRecentSettlements();
  } catch {
    loadError = true;
  }
  const now = Date.now();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-extrabold">تأكيد إتمام الصفقات</h1>
      <p className="mb-6 text-sm text-neutral-400">
        طبقة التحقق من إتمام العملية (قراءة فقط).{" "}
        {isSettlementEnabled()
          ? "الطبقة مُفعّلة."
          : "الطبقة معطّلة حاليًا (SETTLEMENT_ENABLED)."}
      </p>

      {loadError ? (
        <p className="rounded-lg bg-red-950/40 p-4 text-red-300">
          تعذّر تحميل السجلات (قد يكون الجدول غير مُطبّق بعد على قاعدة البيانات).
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg bg-neutral-900 p-4 text-neutral-400">لا توجد سجلات بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="p-3">الطلب</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">المصدر</th>
                <th className="p-3">تأكيد العميل</th>
                <th className="p-3">إقفال تلقائي بعد</th>
                <th className="p-3">أُنشئ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="p-3">
                    <Link className="text-[#FFD60A] hover:underline" href={`/admin/quotes/${r.quote_id}`}>
                      عرض الطلب
                    </Link>
                  </td>
                  <td className="p-3">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="p-3">{r.completion_source ? SOURCE_LABEL[r.completion_source] ?? r.completion_source : "—"}</td>
                  <td className="p-3">{r.customer_confirmed == null ? "—" : r.customer_confirmed ? "نعم" : "لا"}</td>
                  <td className="p-3">{relativeArabic(r.auto_confirm_after, now)}</td>
                  <td className="p-3">{relativeArabic(r.created_at, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
