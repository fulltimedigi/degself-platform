"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/search", label: "البحث" },
  { href: "/map", label: "الخريطة" },
  { href: "/blog", label: "المدونة" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "#footer", label: "تواصل" },
];

// Auth (دخول/تسجيل) is deferred (Checkpoint 5). Button kept in code but hidden
// from the UI — flip to true and wire the real link when accounts ship.
const SHOW_AUTH = false;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
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
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-semibold text-foreground/80 transition hover:text-primary"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Login button (RTL end = left) — hidden until auth ships (SHOW_AUTH) */}
        <div className="flex items-center gap-2">
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
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted"
            >
              {n.label}
            </Link>
          ))}
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
