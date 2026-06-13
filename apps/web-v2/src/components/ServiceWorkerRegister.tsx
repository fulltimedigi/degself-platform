"use client";

import { useEffect } from "react";

/** يسجّل service worker بعد تحميل الصفحة لتفعيل التثبيت والعمل بدون نت. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* فشل التسجيل — نتجاهل بهدوء، الموقع يشتغل عادي بدونه */
      });
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
