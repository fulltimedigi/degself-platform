import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// Cairo — the Arabic webfont used in v1
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "degself — دق سلف | كراجات وخدمات السيارات في الكويت",
  description: "لا تحاتي، بنصلحها — دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
