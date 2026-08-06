"use client";

/**
 * Floating interactive Degself assistant (bottom-left).
 * Opens a conversational panel — not a clone of /isal-degself.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
import { ConciergeChat } from "@/components/concierge/ConciergeChat";

function logicalPath(pathname: string): string {
  const m = pathname.match(/^\/(en|hi|ur)(\/.*)?$/);
  return m ? m[2] ?? "/" : pathname;
}

export function FloatingConcierge() {
  const t = useTranslations("concierge");
  const pathname = usePathname() || "";
  const logical = logicalPath(pathname);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Hide on admin / auth. Keep available on /isal-degself so the assistant
  // can still open the quote form as a service (different product surface).
  const hidden =
    logical.startsWith("/admin") ||
    logical.startsWith("/login") ||
    logical.startsWith("/account");

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready || hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 sm:bottom-6 sm:left-6">
      {open && (
        <div
          className="mb-3 flex h-[min(78vh,620px)] w-[min(calc(100vw-2rem),400px)] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
          role="dialog"
          aria-label={t("title")}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#FFD60A]">
                {t("title")}
              </p>
              <p className="truncate text-[11px] text-neutral-400">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ConciergeChat onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("concierge", { action: "open" });
        }}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD60A] text-[#0A0A0A] shadow-2xl shadow-yellow-500/30 transition hover:scale-105 hover:bg-yellow-300"
      >
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-yellow-400/40"
          />
        )}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="relative">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="relative">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 9h8" />
            <path d="M8 13h5" />
          </svg>
        )}
      </button>
    </div>
  );
}
