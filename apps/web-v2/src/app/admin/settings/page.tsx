import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata: Metadata = {
  title: "إعدادات لوحة التحكم",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <Link href="/admin/quotes" className="mb-4 inline-block text-sm font-bold text-[#FFD60A]">
        ← رجوع لقائمة الطلبات
      </Link>

      <h1 className="mb-6 text-2xl font-extrabold">إعدادات لوحة التحكم</h1>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 font-bold">تغيير كلمة السر</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          كلمة سر لوحة التحكم المشتركة. تغييرها لا يُخرج الجلسات المفتوحة حالياً — يُطلب استخدامها في
          الدخول القادم فقط.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
