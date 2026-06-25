"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { InstallApp } from "@/components/InstallApp";
import { BUSINESS_WA_URL } from "@/lib/constants";

// Keep this list to 7 items so the desktop nav doesn't crowd at tablet widths.
// "كراجات مختارة" (/mukhtarat) takes the slot freed by "الأسئلة الشائعة" (/faq),
// which remains reachable from the footer and the sitemap.
const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/asaali", label: "اسأل دق سلف", highlight: true },
  { href: "/search", label: "البحث" },
  { href: "/best", label: "الأفضل" },
  { href: "/mukhtarat", label: "كراجات مختارة" },
  { href: "/map", label: "الخريطة" },
  { href: "/blog", label: "المدونة" },
];

// Auth (دخول/تسجيل) is deferred (Checkpoint 5). Button kept in code but hidden
// from the UI — flip to true and wire the real link when accounts ship.
const SHOW_AUTH = false;

export function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Auto-close the mobile menu when the user scrolls a meaningful amount
  // away from it or taps outside it. We intentionally:
  //   - capture the scroll position at the moment the menu opened, then only
  //     close after the user has moved > 40px (avoids the iOS/Android quirk
  //     where opening a sticky-positioned menu emits a tiny scroll event that
  //     would instantly close it again).
  //   - delay attaching the pointerdown listener by one frame so the click
  //     that opened the menu isn't treated as an "outside" click.
  useEffect(() => {
    if (!open) return;
    const startY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > 40) setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const raf = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onPointer);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        {/* Logo (RTL start = right) */}
        <Link href="/" className="flex items-center" aria-label="دق سلف — الرئيسية">
          <Image
            src="/brand/logo-wordmark.svg"
            alt="دق سلف"
            width={130}
            height={41}
            priority
            unoptimized
          />
        </Link>

        {/* Center nav (desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) =>
            n.highlight ? (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-bold text-primary transition hover:bg-primary/20"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
                {n.label}
              </Link>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-foreground/80 transition hover:text-primary"
              >
                {n.label}
              </Link>
            )
          )}
        </nav>

        {/* Login button (RTL end = left) — hidden until auth ships (SHOW_AUTH) */}
        <div className="flex items-center gap-2">
          {/* WhatsApp business CTA — desktop only, mobile shows in hamburger */}
          <a
            href={BUSINESS_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل عبر واتساب"
            title="تواصل عبر واتساب"
            className="hidden items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 md:inline-flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C7.6 2 4 5.6 4 10c0 2.4 1 4.5 2.7 6L4 22l6.3-2.1c.5.1 1.1.1 1.7.1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm0 14c-1 0-1.9-.2-2.8-.5l-3 1 .9-2.9c-1.3-1.2-2.1-2.9-2.1-4.6 0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6z" />
            </svg>
            واتساب
          </a>

          <Link
            href="/saved"
            aria-label="الكراجات المحفوظة"
            title="المحفوظة"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 transition hover:bg-muted hover:text-primary"
          >
            <Heart size={20} aria-hidden />
          </Link>

          {SHOW_AUTH && (
            <button
              type="button"
              disabled
              title="قريباً"
              className="hidden cursor-not-allowed rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground opacity-60 md:block"
            >
              دخول / تسجيل
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
            aria-expanded={open}
            className="md:hidden"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 md:hidden">
          {NAV.map((n) =>
            n.highlight ? (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
                {n.label}
              </Link>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted"
              >
                {n.label}
              </Link>
            )
          )}

          {/* WhatsApp business CTA (mobile menu) */}
          <a
            href={BUSINESS_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C7.6 2 4 5.6 4 10c0 2.4 1 4.5 2.7 6L4 22l6.3-2.1c.5.1 1.1.1 1.7.1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm0 14c-1 0-1.9-.2-2.8-.5l-3 1 .9-2.9c-1.3-1.2-2.1-2.9-2.1-4.6 0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6z" />
            </svg>
            تواصل عبر واتساب
          </a>

          {/* Always-available install option (the native prompt isn't shown to
              everyone — iOS never, Android only sometimes) */}
          <InstallApp
            onDone={() => setOpen(false)}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"
          />

          {SHOW_AUTH && (
            <button
              type="button"
              disabled
              className="mt-1 cursor-not-allowed rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground opacity-60"
            >
              دخول / تسجيل
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
