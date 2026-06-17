"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";

// ويدجت طوارئ عائم في الزاوية اليمنى السفلية لكل الصفحات.
// يفتح قائمة فيها: سطحة، كراج متنقل، بنشر متنقل، تواصل.
export function FloatingWhatsApp() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ما نظهرش لو فوق الصفحة (Hero لسه ظاهر) — تجربة أنظف
  if (!scrolled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
      {/* القائمة */}
      {open && (
        <div className="absolute bottom-16 right-0 w-64 origin-bottom-right">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border bg-primary/10 px-4 py-3">
              <p className="text-sm font-extrabold">سيارتك عطلانة؟</p>
              <p className="text-xs text-muted-foreground">اختر الخدمة المناسبة</p>
            </div>
            <ul className="flex flex-col">
              <li>
                <Link
                  href="/emergency?type=tow"
                  onClick={() => {
                    track("floating_widget", { action: "satha" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-primary/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                    🚨
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">سطحة طوارئ</span>
                    <span className="text-[11px] text-muted-foreground">سحب فوري</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href="/karaj-mutanaqil"
                  onClick={() => {
                    track("floating_widget", { action: "karaj_mutanaqil" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 border-t border-border px-4 py-3 transition hover:bg-primary/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    🔧
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">كراج متنقل</span>
                    <span className="text-[11px] text-muted-foreground">ييجي عندك</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href="/bansher-mutanaqil"
                  onClick={() => {
                    track("floating_widget", { action: "bansher_mutanaqil" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 border-t border-border px-4 py-3 transition hover:bg-primary/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                    🛞
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">بنشر متنقل</span>
                    <span className="text-[11px] text-muted-foreground">إصلاح تواير في مكانك</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href="/asaar"
                  onClick={() => {
                    track("floating_widget", { action: "asaar" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 border-t border-border px-4 py-3 transition hover:bg-primary/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15 text-green-400">
                    💰
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">احسب التكلفة</span>
                    <span className="text-[11px] text-muted-foreground">قبل ما تروح الكراج</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* الزرار العائم */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("floating_widget", { action: "open" });
        }}
        aria-label={open ? "إغلاق قائمة المساعدة السريعة" : "قائمة المساعدة السريعة"}
        aria-expanded={open}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 transition hover:scale-105 hover:shadow-primary/50"
      >
        {/* وهج نابض */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-primary/40"
          />
        )}
        {open ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
            className="relative"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="relative"
          >
            <path d="M12 2C7.6 2 4 5.6 4 10c0 2.4 1 4.5 2.7 6L4 22l6.3-2.1c.5.1 1.1.1 1.7.1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm0 14c-1 0-1.9-.2-2.8-.5l-3 1 .9-2.9c-1.3-1.2-2.1-2.9-2.1-4.6 0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6z" />
          </svg>
        )}
      </button>
    </div>
  );
}
