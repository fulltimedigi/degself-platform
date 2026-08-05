import type { Metadata } from "next";
import { AdminPartnersClient } from "@/components/AdminPartnersClient";

export const metadata: Metadata = {
  title: "كراجات الشركاء",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPartnersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">كراجات الشركاء</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          عيّن حوالي ٥٠ كراجاً كشركاء — شات «اسأل دق سلف» وطلبات عروض الأسعار
          يفضّلون هؤلاء أولاً قبل الدليل الكامل (~١٨٠٠ كراج).
        </p>
        <p className="mt-2 text-xs text-amber-400/90">
          مهم: شغّل migration رقم ٠٢٣ على Supabase قبل التفعيل (
          <code className="font-mono">023_partner_garages.sql</code>).
        </p>
      </div>
      <AdminPartnersClient />
    </main>
  );
}
