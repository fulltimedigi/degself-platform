import type { Metadata } from "next";
import { fetchQuoteByToken, fetchOffers } from "@/lib/quotes";
import { OffersChooser, type PublicOffer } from "@/components/OffersChooser";

export const metadata: Metadata = {
  title: "عروض الأسعار الخاصة بطلبك — دق سلف",
  robots: { index: false, follow: false }, // token-gated private page
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">{children}</main>
  );
}

export default async function OffersPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let quote;
  try {
    quote = await fetchQuoteByToken(token);
  } catch {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">تعذّر تحميل الصفحة</h1>
        <p className="text-sm text-muted-foreground">حاول مرة أخرى بعد قليل.</p>
      </Shell>
    );
  }

  if (!quote) {
    return (
      <Shell>
        <p className="mb-2 text-5xl font-extrabold text-[#FFD60A]">٤٠٤</p>
        <h1 className="mb-2 text-xl font-extrabold">الرابط غير صحيح</h1>
        <p className="text-sm text-muted-foreground">
          تأكد من الرابط الذي وصلك، أو تواصل معنا.
        </p>
      </Shell>
    );
  }

  if (quote.status === "expired") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">انتهت صلاحية هذا الرابط</h1>
        <p className="text-sm text-muted-foreground">
          لم يعد بالإمكان عرض هذه الأسعار. تواصل معنا لطلب عروض جديدة.
        </p>
      </Shell>
    );
  }

  if (quote.status === "accepted") {
    return (
      <Shell>
        <p className="mb-3 text-4xl">✅</p>
        <h1 className="mb-2 text-xl font-extrabold">تم قبول أحد العروض بالفعل</h1>
        <p className="text-sm text-muted-foreground">سيتواصل معك الكراج المختار قريباً.</p>
      </Shell>
    );
  }

  const offers = await fetchOffers(quote.id);
  // Only offers still on the table (never expose rejected ones to the customer).
  const active: PublicOffer[] = offers
    .filter((o) => o.status !== "rejected")
    .map((o) => ({
      id: o.id,
      workshop_name: o.workshop_name,
      price_kwd: Number(o.price_kwd),
      estimated_duration: o.estimated_duration,
      notes: o.notes,
    }));

  const car = [quote.car_make, quote.car_model, quote.car_year].filter(Boolean).join(" ");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-extrabold sm:text-3xl">عروض الأسعار الخاصة بطلبك</h1>
        <p className="text-sm text-muted-foreground">اختر العرض الأنسب لك — والكراج بيتواصل معك.</p>
      </header>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <p className="mb-1"><span className="text-muted-foreground">الخدمة:</span> {quote.service}</p>
        {car && <p className="mb-1"><span className="text-muted-foreground">السيارة:</span> {car}</p>}
        <p className="text-muted-foreground">{quote.problem_description}</p>
      </div>

      {active.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد عروض متاحة حالياً.
        </p>
      ) : (
        <OffersChooser token={token} offers={active} />
      )}
    </main>
  );
}
