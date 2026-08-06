"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __bipEvent: BeforeInstallPromptEvent | null;
  }
}

export function InstallApp({
  className,
  onDone,
}: {
  className?: string;
  onDone?: () => void;
}) {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setDeferred(window.__bipEvent ?? null);

    const onChange = () => setDeferred(window.__bipEvent ?? null);
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("bipchange", onChange);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bipchange", onChange);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      window.__bipEvent = null;
      setDeferred(null);
      onDone?.();
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        <Download size={18} aria-hidden />
        {t("menuInstall")}
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => {
            setShowHelp(false);
            onDone?.();
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t("menuInstall")}</h2>
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => {
                  setShowHelp(false);
                  onDone?.();
                }}
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
                    {t("ios1AfterMenu")}
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
                  <span>{t("ios3Long")}</span>
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-3 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span>{t("android1Long")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span>{t("android2Long")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <span>{t("android3")}</span>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
