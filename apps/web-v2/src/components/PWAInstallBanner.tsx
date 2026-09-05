"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";
import { isNativeShell } from "@/lib/shell";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __bipEvent: BeforeInstallPromptEvent | null;
  }
}

const VISITS_KEY = "degself_visits";
const DISMISSED_KEY = "degself_pwa_dismissed";
const VISITS_TO_SHOW = 2;
const DISMISS_DAYS = 14;

export function PWAInstallBanner() {
  const t = useTranslations("pwa");
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Inside the native shell the user already has the app — never nag to install.
    if (isNativeShell()) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const visits = parseInt(localStorage.getItem(VISITS_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));

    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    if (visits < VISITS_TO_SHOW) return;

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setDeferred(window.__bipEvent ?? null);

    const onChange = () => setDeferred(window.__bipEvent ?? null);
    window.addEventListener("bipchange", onChange);

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("bipchange", onChange);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
    track("pwa_banner_dismissed");
  }

  async function install() {
    track("pwa_banner_install_clicked");
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      window.__bipEvent = null;
      setDeferred(null);
      setVisible(false);
      if (choice?.outcome === "accepted") {
        localStorage.setItem(DISMISSED_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
      }
      return;
    }
    setShowHelp(true);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-0">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3 shadow-2xl shadow-primary/10 backdrop-blur">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Download size={22} className="text-primary" aria-hidden />
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-extrabold">{t("bannerTitle")}</span>
            <span className="text-xs text-muted-foreground">{t("bannerSubtitle")}</span>
          </div>
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-md transition hover:opacity-90"
          >
            {t("install")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/70 hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t("howTitle")}</h2>
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => setShowHelp(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {isIOS ? (
              <ol className="flex flex-col gap-3 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {t("ios1Before")}
                    <Share size={16} className="inline text-primary" aria-hidden />
                    {t("ios1After")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {t("ios2")}
                    <Plus size={16} className="inline text-primary" aria-hidden />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <span>{t("ios3")}</span>
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-3 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span>{t("android1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span>{t("android2")}</span>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
