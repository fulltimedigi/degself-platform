import type { Metadata } from "next";
import { AsaaliChat } from "@/components/asaali/AsaaliChat";

const SITE = "https://degself.com";

const TITLE = "اسأل دق سلف — توصيل سريع لأنسب كراج | دق سلف";
const DESCRIPTION =
  "احكِ مشكلة سيارتك بكلامك العادي — ونوصّلك فوراً لأفضل كراج في الكويت مع رسالة جاهزة ترسلها له.";

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
            توصيل سريع لأنسب كراج
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold text-white">
            احكِ مشكلة السيارة
          </h1>
          <p className="mt-2 text-sm md:text-base text-neutral-400 leading-relaxed">
احكِ بكلامك العادي،
            <br />
            وأرشّح لك كراج موثوق مع رسالة جاهزة ترسلها له.
          </p>
        </header>

        {/* Chat */}
        <AsaaliChat />

        {/* Disclaimer */}
        <footer className="mt-10 text-center text-xs text-neutral-600">
          <p>
            هذه الخدمة استرشادية فقط. لا تغني عن فحص ميكانيكي معتمد.
          </p>
          <p className="mt-2 text-neutral-500">
            تلميح: التسجيل الصوتي يعمل على Chrome و Safari في الجوّال والكمبيوتر.
          </p>
        </footer>
      </div>
    </main>
  );
}
