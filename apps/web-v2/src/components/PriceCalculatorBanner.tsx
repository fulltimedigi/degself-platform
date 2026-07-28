import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Calculator, ArrowLeft } from "lucide-react";

export async function PriceCalculatorBanner() {
  const t = await getTranslations("home");
  return (
    <Link
      href="/asaar"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/5 to-primary/15 p-6 transition hover:border-primary"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Calculator className="text-primary" size={26} aria-hidden />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-extrabold sm:text-xl">{t("calcTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("calcSubtitle")}</p>
        </div>
      </div>
      <ArrowLeft
        className="shrink-0 text-primary transition group-hover:-translate-x-1"
        size={22}
        aria-hidden
      />
    </Link>
  );
}
