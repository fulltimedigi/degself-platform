"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/i18n/routing";

// Switches locale while staying on the SAME page (usePathname here is
// locale-agnostic — it returns the path without the locale prefix).
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("lang");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{t("switchTo")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
        aria-label={t("switchTo")}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold text-foreground/80 focus:border-primary focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABEL[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
