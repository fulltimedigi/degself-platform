import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fetchQuoteByGarageToken } from "@/lib/quotes";
import { urgencyClass } from "@/lib/quote-status";
import { GarageOfferForm } from "@/components/GarageOfferForm";

export const metadata: Metadata = {
  title: "قدّم عرضك — دق سلف",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">{children}</main>;
}

export default async function SubmitOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations();

  let quote;
  try {
    quote = await fetchQuoteByGarageToken(token);
  } catch {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">{t("offers.loadErrorTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("offers.loadErrorBody")}</p>
      </Shell>
    );
  }

  if (!quote) {
    return (
      <Shell>
        <p className="mb-2 text-5xl font-extrabold text-[#FFD60A]">404</p>
        <h1 className="mb-2 text-xl font-extrabold">{t("offers.invalidTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("offers.invalidBody")}</p>
      </Shell>
    );
  }

  if (quote.status === "accepted") {
    return (
      <Shell>
        <p className="mb-3 text-4xl">✅</p>
        <h1 className="mb-2 text-xl font-extrabold">{t("submit.acceptedTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("submit.acceptedBody")}</p>
      </Shell>
    );
  }

  if (quote.status === "expired") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-extrabold">{t("submit.expiredTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("submit.expiredBody")}</p>
      </Shell>
    );
  }

  const car = [quote.car_make, quote.car_model, quote.car_year].filter(Boolean).join(" ");
  const safePhotos = (quote.photos ?? []).filter((p) => /^https:\/\//i.test(p));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-extrabold sm:text-3xl">{t("submit.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("submit.pageSubtitle")}</p>
        {quote.workshop_name && (
          <p className="mt-2 text-sm font-bold text-[#FFD60A]">هذا الرابط مخصص لـ {quote.workshop_name}</p>
        )}
      </header>

      {/* PII-safe request summary — no customer name/phone. */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-bold">{t("submit.requestDetails")}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${urgencyClass(quote.urgency)}`}>
            {quote.urgency}
          </span>
        </div>
        <p className="mb-1">
          <span className="text-muted-foreground">{t("offers.service")}:</span> {quote.service}
        </p>
        {car && (
          <p className="mb-1">
            <span className="text-muted-foreground">{t("offers.car")}:</span> {car}
          </p>
        )}
        {quote.area && (
          <p className="mb-1">
            <span className="text-muted-foreground">{t("submit.area")}:</span> {quote.area}
          </p>
        )}
        <p className="text-muted-foreground">{quote.problem_description}</p>

        {safePhotos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {safePhotos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={t("submit.photoAlt", { n: i + 1 })}
                className="h-20 w-20 rounded-lg border border-border object-cover"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        )}
      </div>

      <GarageOfferForm
        token={token}
        workshopName={quote.workshop_name ?? undefined}
        workshopPhone={quote.workshop_phone ?? undefined}
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">{t("submit.agreement")}</p>
    </main>
  );
}
