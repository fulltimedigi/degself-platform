"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { FavoritesSync } from "@/components/FavoritesSync";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { FloatingConcierge } from "@/components/FloatingConcierge";
import { CookieConsent } from "@/components/CookieConsent";

/**
 * Garage RFQ links are bearer capabilities. They must render as a standalone
 * surface: no global navigation and, critically, no analytics/marketing scripts
 * that could observe the capability URL. The public page itself still runs under
 * NextIntlClientProvider so its localized offer form works normally.
 */
export function isGarageRfqPath(pathname: string): boolean {
  const logical = pathname.replace(/^\/(ar|en|hi|ur)(?=\/)/, "");
  return logical === "/submit-offer" || logical.startsWith("/submit-offer/");
}

export function RouteHeader() {
  const pathname = usePathname();
  if (isGarageRfqPath(pathname)) return null;
  return <Header />;
}

export function RouteFooterAndGlobals({ footer }: { footer: ReactNode }) {
  const pathname = usePathname();
  if (isGarageRfqPath(pathname)) return null;

  return (
    <>
      {footer}
      <Analytics />
      <SpeedInsights />
      <ServiceWorkerRegister />
      <FavoritesSync />
      <PWAInstallBanner />
      <FloatingWhatsApp />
      <FloatingConcierge />
      <CookieConsent />
    </>
  );
}
