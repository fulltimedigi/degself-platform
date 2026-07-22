import type { Metadata } from "next";
import { fetchQuoteByGarageToken } from "@/lib/quotes";
import { urgencyClass } from "@/lib/quote-status";
import { GarageOfferForm } from "@/components/GarageOfferForm";

export const metadata: Metadata = {
  title: "قدّم عرضك — دق سلف",
  robots: { index: false, follow: false }, // token-gated private page
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">{children}</main>;
}

export default async function SubmitOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let quote;
  try {
    quote = await fetchQuoteByGarageToken(token);
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
        <p className="text-sm text-muted-foreground">تأكد من الرابط الذي وصلك.</p>
      </Shell>
    );
  }

  if (quote.status === "accepted") {
    return (
      <Shell>
        <p className="mb-3 text-4xl">✅</p>
        <h1 className="mb-2 text-xl font-extrabold">تم إغلاق هذا الطلب</h1>
        <p className="text-sm text-muted-foreground">اختار العميل عرضاً بالفعل.</p>
      </Shell>
    );
  }

  if (quote.status === "expired") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">انتهت صلاحية هذا الطلب</h1>
        <p className="text-sm text-muted-foreground">لم يعد بالإمكان تقديم عروض عليه.</p>
      </Shell>
    );
  }

  const car = [quote.car_make, quote.car_model, quote.car_year].filter(Boolean).join(" ");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-extrabold sm:text-3xl">قدّم عرضك على هذا الطلب</h1>
        <p className="text-sm text-muted-foreground">
          املأ عرضك بالصيغة الموحدة — العميل يقارن العروض ويختار.
        </p>
      </header>

      {/* PII-safe request summary — no customer name/phone. */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-bold">تفاصيل الطلب</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${urgencyClass(quote.urgency)}`}>
            {quote.urgency}
          </span>
        </div>
        <p className="mb-1">
          <span className="text-muted-foreground">الخدمة:</span> {quote.service}
        </p>
        {car && (
          <p className="mb-1">
            <span className="text-muted-foreground">السيارة:</span> {car}
          </p>
        )}
        {quote.area && (
          <p className="mb-1">
            <span className="text-muted-foreground">المنطقة:</span> {quote.area}
          </p>
        )}
        <p className="text-muted-foreground">{quote.problem_description}</p>

        {quote.photos && quote.photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quote.photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`صورة ${i + 1}`}
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <GarageOfferForm token={token} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        بتقديمك للعرض توافق على الالتزام بالسعر المكتوب، وإعلان رسم الكشف مقدماً، والإبلاغ الفوري عند
        تغيير التشخيص قبل بدء أي عمل.
      </p>
    </main>
  );
}
