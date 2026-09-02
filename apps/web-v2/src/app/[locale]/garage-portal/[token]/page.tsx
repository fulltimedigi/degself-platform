import type { Metadata } from "next";
import { resolveGarageByToken } from "@/lib/garage-portal";
import { GaragePortalClient } from "@/components/GaragePortalClient";

export const metadata: Metadata = {
  title: "صفحة كراجك — دق سلف",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16 text-center" dir="rtl">
      {children}
    </main>
  );
}

export default async function GaragePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let garage;
  try {
    garage = await resolveGarageByToken(token);
  } catch {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">تعذّر فتح الصفحة</h1>
        <p className="text-sm text-muted-foreground">حصل خطأ مؤقت، حاول تحديث الصفحة بعد قليل.</p>
      </Shell>
    );
  }

  if (!garage) {
    return (
      <Shell>
        <p className="mb-2 text-5xl font-extrabold text-[#FFD60A]">404</p>
        <h1 className="mb-2 text-xl font-extrabold">الرابط غير صالح</h1>
        <p className="text-sm text-muted-foreground">
          هذا الرابط غير صحيح أو انتهت صلاحيته. لو وصلك من دق سلف تواصل معنا ونرسله لك من جديد.
        </p>
      </Shell>
    );
  }

  return <GaragePortalClient token={token} garage={garage} />;
}
