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
            <div className="border-b border-border bg-red-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 2v2" />
                    <path d="M5.6 4.6l1.4 1.4" />
                    <path d="M18.4 4.6L17 6" />
                    <path d="M7 11a5 5 0 0 1 10 0" />
                    <rect x="4" y="16" width="16" height="3" rx="1" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-extrabold text-red-500">خدمات الطوارئ</p>
                  <p className="text-[11px] text-muted-foreground">سيارتك عطلانة؟ اختر الخدمة</p>
                </div>
              </div>
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

      {/* الزرار العائم - سارينة طوارئ */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("floating_widget", { action: "open" });
        }}
        aria-label={open ? "إغلاق قائمة الطوارئ" : "خدمات الطوارئ السريعة"}
        aria-expanded={open}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl shadow-red-600/40 transition hover:scale-105 hover:bg-red-500 hover:shadow-red-500/60"
      >
        {/* وهج نابض أحمر للطوارئ */}
        {!open && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-red-500/50"
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-red-500/0 animate-pulse"
              style={{ boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.3)" }}
            />
          </>
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
          // أيقونة سارينة الطوارئ (Emergency Siren / Beacon Light)
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="relative"
          >
            {/* خطوط الإشعاع العلوية */}
            <path d="M12 2v2" />
            <path d="M5.6 4.6l1.4 1.4" />
            <path d="M18.4 4.6L17 6" />
            {/* القبة العلوية للسارينة */}
            <path d="M7 11a5 5 0 0 1 10 0" fill="currentColor" fillOpacity="0.3" />
            {/* جسم السارينة المستطيل */}
            <rect x="5" y="11" width="14" height="5" rx="1" fill="currentColor" fillOpacity="0.2" />
            {/* قاعدة السارينة */}
            <rect x="4" y="16" width="16" height="3" rx="1" />
            {/* نقطة الضوء في المنتصف */}
            <circle cx="12" cy="13.5" r="1" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
