import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { JsonLd } from "@/components/JsonLd";

// Google Analytics 4 — public Measurement ID.
const GA_ID = "G-806P73YN0Z";

// Snapchat Pixel ID — for retargeting and lookalike audiences on Snap Ads.
const SNAP_PIXEL_ID = "c75b6579-1cd5-40f8-ad85-cda23b0a85e6";

// LocalBusiness node (distinct @id from the homepage Organization node) —
// drives the Google local pack / business knowledge panel for Kuwait.
const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://degself.com/#localbusiness",
  name: "دق سلف Degself",
  alternateName: "دق سلف",
  description:
    "دق سلف هو الدليل الأشمل لكراجات ومراكز خدمة السيارات في الكويت. يتيح لك البحث عن أقرب كراج موثوق لتغيير الزيت والبطاريات وصيانة التكييف وإصلاح الكهرباء والبنشر وأعمال البودي والجير، مع مقارنة الأسعار وقراءة تقييمات العملاء الحقيقيين.",
  url: "https://degself.com",
  logo: {
    "@type": "ImageObject",
    url: "https://degself.com/logo.png",
    width: 512,
    height: 512,
  },
  image: "https://degself.com/og-image.jpg",
  email: "info@degself.com",
  telephone: "+96565799195",
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+96565799195",
      contactType: "customer support",
      areaServed: "KW",
      availableLanguage: ["Arabic", "English"],
      contactOption: "TollFree",
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "الكويت",
    addressLocality: "مدينة الكويت",
    addressRegion: "محافظة العاصمة",
    postalCode: "13001",
    addressCountry: "KW",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 29.3759,
    longitude: 47.9774,
  },
  hasMap: "https://www.google.com/maps?q=29.3759,47.9774",
  areaServed: [
    { "@type": "AdministrativeArea", name: "محافظة العاصمة", alternateName: "Kuwait City Governorate" },
    { "@type": "AdministrativeArea", name: "محافظة حولي", alternateName: "Hawalli Governorate" },
    { "@type": "AdministrativeArea", name: "محافظة الفروانية", alternateName: "Farwaniya Governorate" },
    { "@type": "AdministrativeArea", name: "محافظة الجهراء", alternateName: "Jahra Governorate" },
    { "@type": "AdministrativeArea", name: "محافظة مبارك الكبير", alternateName: "Mubarak Al-Kabeer Governorate" },
    { "@type": "AdministrativeArea", name: "محافظة الأحمدي", alternateName: "Ahmadi Governorate" },
  ],
  openingHours: ["Mo-Fr 08:00-22:00", "Sa 08:00-22:00", "Su 10:00-20:00"],
  priceRange: "KD",
  currenciesAccepted: "KWD",
  paymentAccepted: "نقد، بطاقة ائتمان، KNET",
  knowsLanguage: ["ar", "en"],
  sameAs: [
    "https://www.instagram.com/degself",
    "https://www.facebook.com/degself",
    "https://twitter.com/degself",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "240",
    bestRating: "5",
    worstRating: "1",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://degself.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
  serviceType: [
    "تغيير الزيت",
    "بطاريات السيارات",
    "صيانة تكييف السيارات",
    "صيانة السيارات",
    "كهرباء السيارات",
    "إصلاح البنشر",
    "أعمال البودي",
    "إصلاح ناقل الحركة",
  ],
};

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "دق سلف — دليلك لكراجات وميكانيكي السيارات في الكويت",
  description:
    "ابحث عن كراج، ميكانيكي، أو خدمة سيارات في الكويت. دليل شامل لمنشآت صيانة السيارات.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://degself.com"),
  openGraph: {
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    title: "دق سلف — دليلك لكراجات وميكانيكي السيارات في الكويت",
    description:
      "ابحث عن كراج، ميكانيكي، أو خدمة سيارات في الكويت. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
    images: [
      {
        url: "https://degself.com/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "دق سلف — دليل كراجات الكويت",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "دق سلف — دليلك لكراجات وخدمات السيارات في الكويت",
    description: "ابحث عن كراج أو خدمة سيارات في الكويت. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
    images: ["https://degself.com/og-image.jpg"],
  },
  applicationName: "دق سلف",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "دق سلف",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    canonical: "https://degself.com",
    languages: {
      "ar-KW": "https://degself.com",
      "x-default": "https://degself.com",
    },
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "دق سلف - المدونة" },
      ],
    },
  },
  other: {
    // Geo-targeting: limit indexing relevance to Kuwait
    "geo.region": "KW",
    "geo.country": "KW",
    "geo.placename": "Kuwait",
    "geo.position": "29.3759;47.9774",
    "ICBM": "29.3759, 47.9774",
    "distribution": "local",
    "target-country": "KW",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar-KW" dir="rtl" className={`${cairo.variable} antialiased`}>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <JsonLd data={localBusinessLd} />

        {/* Capture the install prompt as early as possible — it can fire before
            React hydrates, and the menu (where the button lives) mounts late.
            Stash it globally so the button can replay it on demand. */}
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {`(function(){
  window.__bipEvent = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__bipEvent = e;
    window.dispatchEvent(new Event('bipchange'));
  });
  window.addEventListener('appinstalled', function(){
    window.__bipEvent = null;
    window.dispatchEvent(new Event('bipchange'));
  });
})();`}
        </Script>

        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        <Analytics />
        <ServiceWorkerRegister />
        <PWAInstallBanner />
        <FloatingWhatsApp />

        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>

        {/* Snap Pixel */}
        <Script id="snap-pixel" strategy="afterInteractive">
          {`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init', '${SNAP_PIXEL_ID}');
snaptr('track', 'PAGE_VIEW');`}
        </Script>
      </body>
    </html>
  );
}
