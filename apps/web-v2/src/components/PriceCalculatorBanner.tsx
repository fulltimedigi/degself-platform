import Link from "next/link";
import { Calculator, ArrowLeft } from "lucide-react";

export function PriceCalculatorBanner() {
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
          <h2 className="text-lg font-extrabold sm:text-xl">حاسبة أسعار خدمات السيارات</h2>
          <p className="text-sm text-muted-foreground">
            احسب تكلفة الخدمة قبل ما تروح الكراج — أسعار السوق الكويتي 2026
          </p>
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
