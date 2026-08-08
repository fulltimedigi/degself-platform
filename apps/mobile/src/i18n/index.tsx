import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  localeDirection,
  type Direction,
  type Locale,
} from "./direction";
import { MESSAGES, type Dict } from "./messages";

// Owned, dependency-free i18n runtime for M0 (next-intl is web-bound and is NOT
// imported here). Provides the current locale, its direction, and a typed
// message accessor. Layout mirroring caveat: React Native applies app-wide RTL
// via I18nManager.forceRTL(), which only takes full effect after an app
// RESTART. M0 therefore drives per-component text direction from `dir` (live),
// allows RTL globally once, and surfaces the restart requirement to the user
// rather than pretending native mirroring flips live.

// Allow RTL rendering globally (safe, idempotent). We intentionally do NOT call
// forceRTL on every switch, because that needs a reload to be consistent.
I18nManager.allowRTL(true);

type I18nContextValue = {
  locale: Locale;
  dir: Direction;
  t: Dict;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isSupportedLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );

  const setLocale = useCallback((l: Locale) => {
    if (isSupportedLocale(l)) setLocaleState(l);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: localeDirection(locale),
      t: MESSAGES[locale],
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export { DEFAULT_LOCALE, localeDirection, isRTL, LOCALES } from "./direction";
export type { Locale, Direction } from "./direction";
export { LOCALE_LABEL } from "./messages";
