import type { Metadata } from "next";
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
      <RfqOperationsStatus />
      <AdminPartnersClient />
    </main>
  );
}
