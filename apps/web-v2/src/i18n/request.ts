import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

// Loads the message dictionary for the active request's locale. Falls back to
// the default locale (ar) for an unknown/invalid locale. Missing keys fall back
// to the Arabic message (see onError/getMessageFallback below) so a
// partially-translated locale still renders — it just shows Arabic for any
// not-yet-translated string instead of an error.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  const arMessages =
    locale === "ar" ? messages : (await import("../../messages/ar.json")).default;

  return {
    locale,
    messages,
    // Untranslated key → fall back to the Arabic string, never throw in prod.
    getMessageFallback: ({ key, namespace }) => {
      const path = namespace ? `${namespace}.${key}` : key;
      const fromAr = path
        .split(".")
        .reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), arMessages);
      return typeof fromAr === "string" ? fromAr : path;
    },
    onError() {
      // Swallow missing-message errors in production (fallback handles display).
    },
  };
});
