import type { Metadata } from "next";
import { AdminPartnersClient } from "@/components/AdminPartnersClient";
import { PartnerLinkImporter } from "@/components/PartnerLinkImporter";

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
          القائمة الصغيرة للكراجات اللي اتفقت معاها فعليًا. الشات وطلبات عروض الأسعار
          يفضّلون هؤلاء أولاً، والهدف تقريبًا ٥٠ كراج.
        </p>
      </div>

      <div className="mb-8">
        <PartnerLinkImporter />
      </div>

      <AdminPartnersClient />
    </main>
  );
}
