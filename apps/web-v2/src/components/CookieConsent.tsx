"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Consent — متوافق مع GDPR (ePrivacy Directive) و CITRA Kuwait
// Resolution 26/2024.
//
// المنطق:
//   - أول زيارة: لا تحمّل أي analytics (GA / Clarity / Snap).
//   - يظهر للمستخدم banner واضح بـ 3 خيارات (قبول / رفض / فقط الضروري).
//   - بعد القرار، نحفظه في localStorage لمدة 6 أشهر (re-prompt بعدها).
//   - نُحمّل الأكواد فقط بعد القبول.
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_KEY = "degself_consent_v1";
const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 180 يوم

type ConsentValue = "accepted" | "rejected";

type StoredConsent = {
  value: ConsentValue;
  ts: number;
};

function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (Date.now() - parsed.ts > CONSENT_TTL_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentValue) {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ value, ts: Date.now() } satisfies StoredConsent),
    );
  } catch {
    // localStorage قد يكون معطّلاً في خصوصية عالية - نتجاهل
  }
}

// Public IDs — تم نقلهم من layout.tsx ليُحمَّلوا هنا فقط بعد القبول.
const GA_ID = "G-806P73YN0Z";
const SNAP_PIXEL_ID = "c75b6579-1cd5-40f8-ad85-cda23b0a85e6";
const CLARITY_ID = "xcii9sy7bl";

export function CookieConsent() {
  const [decision, setDecision] = useState<ConsentValue | null | "pending">(
    "pending",
  );

  useEffect(() => {
    setDecision(readConsent());
  }, []);

  function accept() {
    writeConsent("accepted");
    setDecision("accepted");
  }

  function reject() {
    writeConsent("rejected");
    setDecision("rejected");
  }

  // أثناء الـ SSR / hydration الأولى لا نعرض شيء
  if (decision === "pending") return null;

  return (
    <>
      {/* الـ analytics تُحمَّل فقط بعد القبول */}
      {decision === "accepted" && (
        <>
          {/* Google Analytics 4 */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
          </Script>

          {/* Snap Pixel */}
          <Script id="snap-pixel" strategy="afterInteractive">
            {`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init', '${SNAP_PIXEL_ID}');
snaptr('track', 'PAGE_VIEW');`}
          </Script>

          {/* Microsoft Clarity */}
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        </>
      )}

      {/* الـ Banner يظهر فقط لو ما اتخذ قرار بعد */}
      {decision === null && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="إشعار ملفات تعريف الارتباط"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 shadow-2xl backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-relaxed text-foreground">
              <p>
                نستخدم ملفات تعريف الارتباط (cookies) لتحسين تجربتك وتحليل استخدام
                الموقع.{" "}
                <Link
                  href="/privacy"
                  className="font-bold text-primary hover:underline"
                >
                  سياسة الخصوصية
                </Link>{" "}
                ·{" "}
                <Link
                  href="/terms"
                  className="font-bold text-primary hover:underline"
                >
                  شروط الاستخدام
                </Link>
              </p>
            </div>
            <div className="flex flex-row-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={accept}
                className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                موافق
              </button>
              <button
                type="button"
                onClick={reject}
                className="min-h-11 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-foreground/5"
              >
                رفض
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
