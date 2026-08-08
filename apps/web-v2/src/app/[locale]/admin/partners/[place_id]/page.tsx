import type { Metadata } from "next";
import Link from "next/link";
import { AdminWorkshopProfileEditor } from "@/components/AdminWorkshopProfileEditor";

export const metadata: Metadata = {
  title: "تعديل صفحة الكراج",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminWorkshopProfilePage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#FFD60A]">الشبكة</p>
          <h1 className="mt-1 text-2xl font-extrabold">تعديل صفحة الكراج</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عدّل البيانات العامة وأضف الصور الحقيقية من لوحة دق سلف.
          </p>
        </div>
        <Link
          href="/admin/partners"
          className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-[#FFD60A]"
        >
          ← رجوع للشبكة
        </Link>
      </div>
      <AdminWorkshopProfileEditor placeId={place_id} />
    </main>
  );
}
