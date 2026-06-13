import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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
      "ابحث عن كراج، ميكانيكي، أو خدمة سيارات في الكويت. لا تحاتي، بنصلحها.",
    images: ["/brand/logo-arabic.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "دق سلف — دليلك لكراجات وخدمات السيارات في الكويت",
    description: "ابحث عن كراج أو خدمة سيارات في الكويت. لا تحاتي، بنصلحها.",
    images: ["/brand/logo-arabic.png"],
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
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} antialiased`}>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
