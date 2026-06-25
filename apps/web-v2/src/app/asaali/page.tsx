import type { Metadata } from "next";
import { AsaaliChat } from "@/components/asaali/AsaaliChat";

const SITE = "https://degself.com";

const TITLE = "اسألي — مترجم مشاكل السيارة | دق سلف";
const DESCRIPTION =
  "اشرحي مشكلة سيارتك بلهجتك، واحصلي على المصطلح الرسمي + الكراج المناسب + رسالة جاهزة للكراج. خدمة من دق سلف للنساء في الكويت.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/asaali` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE}/asaali`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export default function AsaaliPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        {/* Hero */}
        <header className="mb-8 text-center">
          <div
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "#FFD60A", color: "#0A0A0A" }}
          >
            مترجم دق سلف
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold text-white">
            اسألي عن سيارتك بكل ثقة
          </h1>
          <p className="mt-2 text-sm md:text-base text-neutral-400 leading-relaxed">
            اشرحي المشكلة بلهجتك، وأنا أعطيك المصطلح الصحيح،
            <br />
            وأرشّحلك كراج موثوق، وأجهّز رسالة جاهزة ترسليها له.
          </p>
        </header>

        {/* Chat */}
        <AsaaliChat />

        {/* Disclaimer */}
        <footer className="mt-10 text-center text-xs text-neutral-600">
          <p>
            هذه الخدمة استرشادية فقط. لا تغني عن فحص ميكانيكي معتمد.
          </p>
        </footer>
      </div>
    </main>
  );
}
