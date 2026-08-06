import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { normalizeCatalogCountClaims } from "@/lib/catalog-stats";

type Messages = typeof import("../../messages/ar.json")["default"];

const normalizedMessageCache = new Map<string, Messages>();

async function loadMessages(locale: string): Promise<Messages> {
  const cached = normalizedMessageCache.get(locale);
  if (cached) return cached;

  const raw = (await import(`../../messages/${locale}.json`)).default as Messages;
  const normalized = normalizeCatalogCountClaims(raw);
  normalizedMessageCache.set(locale, normalized);
  return normalized;
}

// Loads the message dictionary for the active request's locale. Falls back to
// the default locale (ar) for an unknown/invalid locale. Missing keys fall back
// to the Arabic message (see onError/getMessageFallback below) so a
// partially-translated locale still renders — it just shows Arabic for any
// not-yet-translated string instead of an error.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = await loadMessages(locale);
  const arMessages = locale === "ar" ? messages : await loadMessages("ar");

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
