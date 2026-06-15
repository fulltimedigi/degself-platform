"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

// The browser fires this before showing its own install prompt; we capture it
// and replay it on demand from our own button. iOS Safari never fires it.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp({
  className,
  onDone,
}: {
  className?: string;
  onDone?: () => void;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // already running as an installed app → hide the option entirely
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we trigger it ourselves
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      // Android / Chrome: native install dialog
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
      onDone?.();
      return;
    }
    // iOS Safari, or a browser that hasn't fired the event → manual steps
    setShowHelp(true);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        <Download size={18} aria-hidden />
        تثبيت التطبيق
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
              <h2 className="text-lg font-extrabold">تثبيت التطبيق</h2>
              <button
                type="button"
                aria-label="إغلاق"
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
                  <span className="font-bold text-primary">١.</span>
                  <span className="flex flex-wrap items-center gap-1">
                    اضغط زر المشاركة
                    <Share size={16} className="inline text-primary" aria-hidden />
                    في شريط Safari بالأسفل.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">٢.</span>
                  <span className="flex flex-wrap items-center gap-1">
                    اختر «إضافة إلى الشاشة الرئيسية»
                    <Plus size={16} className="inline text-primary" aria-hidden />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">٣.</span>
                  <span>اضغط «إضافة» — وهيظهر أيقونة «دق سلف» على شاشتك.</span>
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-3 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">١.</span>
                  <span>افتح قائمة المتصفح (⋮) من أعلى الصفحة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">٢.</span>
                  <span>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">٣.</span>
                  <span>أكّد — وهيظهر أيقونة «دق سلف» على شاشتك.</span>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
