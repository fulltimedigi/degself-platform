// Pure locale/direction logic — no React Native imports, so it is unit-testable
// with the repo's standard node:test runner. This is the single source of truth
// for which DEGSELF locales are RTL.

export const LOCALES = ["ar", "en", "hi", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
export type Direction = "rtl" | "ltr";

export const DEFAULT_LOCALE: Locale = "ar"; // DEGSELF is Arabic-first (Kuwait).

const RTL_LOCALES = new Set<Locale>(["ar", "ur"]);

/** Text/layout direction for a locale. ar/ur → rtl; en/hi → ltr. */
export function localeDirection(locale: Locale): Direction {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

export function isRTL(locale: Locale): boolean {
  return localeDirection(locale) === "rtl";
}

/** Narrow arbitrary input (e.g. a device locale) to a supported Locale. */
export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
