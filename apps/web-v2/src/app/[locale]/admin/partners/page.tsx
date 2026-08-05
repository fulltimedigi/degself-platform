import type { Metadata } from "next";
import { AdminPartnersClient } from "@/components/AdminPartnersClient";

export const metadata: Metadata = {
  title: "شبكة الشركاء",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPartnersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">شبكة الشركاء</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          دفتر فاضي تكبره أول بأول بعد النزول والمتابعة. الشات وطلبات عروض
          الأسعار يوجّهون لهؤلاء أولاً — والهدف تقريباً ٥٠ كراج، مش شرط تملأه
          اليوم.
        </p>
        <p className="mt-2 text-xs text-amber-400/90">
          قبل أول إضافة: شغّل migration ٠٢٣ على Supabase (
          <code className="font-mono">023_partner_garages.sql</code>).
        </p>
      </div>
      <AdminPartnersClient />
    </main>
  );
}
