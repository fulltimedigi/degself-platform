"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";
import { isNativeShell } from "@/lib/shell";

// Public store listings.
const PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.degself.app";
const APP_STORE_URL = "https://apps.apple.com/app/id6809207250";

// Flip to true the moment the iOS app is approved and live on the App Store.
// Until then the App Store badge is hidden so we never show a dead link.
const IOS_LIVE = true;

function GooglePlayGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 512 512" aria-hidden>
      <path fill="#00D3FF" d="M47 24 306 256 47 488c-8 4-16-1-16-11V35c0-10 8-15 16-11z" />
      <path fill="#00F076" d="M47 24c3-1 7-1 10 1l255 145-58 58L47 24z" />
      <path fill="#FFD400" d="M312 170 391 215c12 7 12 25 0 32l-79 45-58-61 58-61z" />
      <path fill="#FF3333" d="M312 342 57 487c-3 2-7 2-10 1l207-207 58 61z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
      <path d="M318.7 268c-.5-58 47.4-85.8 49.5-87.2-27-39.5-69-45-83.9-45.6-35.7-3.6-69.7 21-87.8 21-18 0-46-20.5-75.6-20-38.9.6-74.8 22.6-94.8 57.4-40.4 70-10.3 173.6 29 330.5 19.2 27.6 42.1 58.6 72.1 57.5 28.9-1.2 39.8-18.6 74.8-18.6s44.8 18.6 75.4 18c31.2-.5 50.9-28.1 70-55.8 22.1-32 31.2-63 31.7-64.6-.7-.3-60.8-23.3-61.4-92.2zM259.9 89.3c15.9-19.3 26.7-46.1 23.8-72.9-23 1-50.8 15.3-67.3 34.6-14.8 17.1-27.7 44.4-24.3 70.6 25.6 2 51.9-13 67.8-32.3z" />
    </svg>
  );
}

export function AppDownloadBanner() {
  const t = useTranslations("home");
  const [inShell, setInShell] = useState(false);

  useEffect(() => {
    if (isNativeShell()) setInShell(true);
  }, []);

  // Already inside the native app — nothing to download.
  if (inShell) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/5 to-primary/15 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Smartphone className="text-primary" size={26} aria-hidden />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-extrabold sm:text-xl">{t("getAppTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("getAppSubtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
        <a
          href={PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-3 font-bold transition hover:border-primary hover:-translate-y-0.5"
        >
          <GooglePlayGlyph />
          <span>{t("getAppAndroid")}</span>
        </a>
        {IOS_LIVE ? (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-3 font-bold transition hover:border-primary hover:-translate-y-0.5"
          >
            <AppleGlyph />
            <span>{t("getAppIos")}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
