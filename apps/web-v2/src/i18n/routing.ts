import { defineRouting } from "next-intl/routing";

// The 4 supported locales. Arabic is the default and stays UNPREFIXED at the
// root ("/…") so all existing SEO/URLs are byte-identical — English, Hindi and
// Urdu live under "/en", "/hi", "/ur". Urdu + Arabic are RTL; English + Hindi LTR.
export const LOCALES = ["ar", "en", "hi", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

// Text direction per locale — drives <html dir> and layout mirroring.
export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
  hi: "ltr",
  ur: "rtl",
};

// Native display name for the language switcher.
export const LOCALE_LABEL: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
};

// BCP-47 tag for <html lang> / hreflang.
export const LOCALE_HREFLANG: Record<Locale, string> = {
  ar: "ar-KW",
  en: "en",
  hi: "hi",
  ur: "ur",
};

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Default locale (ar) has NO prefix; others are prefixed. Keeps Arabic at "/".
  localePrefix: "as-needed",
  // We manage <link rel=alternate hreflang> ourselves in the layout/metadata.
  alternateLinks: false,
});
