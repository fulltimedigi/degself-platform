"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/i18n/routing";

// Globe-icon language switcher (Airbnb/Booking-style): always-visible header
// button that opens a dropdown of the languages in their native names. Each item
// is a real <Link> to the SAME page in the target locale (usePathname is
// locale-agnostic), so switching works as a normal navigation.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("lang");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [queryString, setQueryString] = useState("");
  const href = `${pathname}${queryString}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reading window.location in an effect keeps static prerendering valid while
  // still preserving the current query string after hydration. Using
  // useSearchParams here forces every page containing the global header behind a
  // Suspense boundary and caused production builds to fail during prerender.
  useEffect(() => {
    setQueryString(window.location.search);
  }, [pathname]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const raf = requestAnimationFrame(() => document.addEventListener("pointerdown", onPointer));
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("switchTo")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-bold text-foreground/80 transition hover:border-[#FFD60A] hover:text-primary"
      >
        <Globe size={18} aria-hidden />
        <span className="hidden sm:inline">{LOCALE_LABEL[locale]}</span>
        <ChevronDown size={14} aria-hidden className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg ltr:right-0 rtl:left-0"
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <Link
                  href={href}
                  locale={l}
                  onClick={() => setOpen(false)}
                  dir={l === "ar" || l === "ur" ? "rtl" : "ltr"}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-muted ${
                    active ? "font-extrabold text-primary" : "font-semibold text-foreground/80"
                  }`}
                >
                  <span>{LOCALE_LABEL[l]}</span>
                  {active && <Check size={15} aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
