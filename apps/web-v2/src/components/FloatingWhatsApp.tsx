"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { BUSINESS_WA } from "@/lib/constants";

const WA_MESSAGE = encodeURIComponent(
  "السلام عليكم، تواصلت معكم من موقع دق سلف (degself.com) وأحتاج مساعدة"
);

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
              {/* تواصل واتساب مباشر — داخل القائمة */}
              <li>
                <a
                  href={`https://wa.me/${BUSINESS_WA}?text=${WA_MESSAGE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    track("floating_widget", { action: "whatsapp_direct" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 border-t border-border bg-[#25D366]/5 px-4 py-3 transition hover:bg-[#25D366]/15"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/20 text-[#25D366]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">تواصل مباشر</span>
                    <span className="text-[11px] text-muted-foreground">عبر الواتساب</span>
                  </div>
                </a>
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
