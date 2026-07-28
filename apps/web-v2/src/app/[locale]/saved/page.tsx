import type { Metadata } from "next";
import { SavedList } from "@/components/SavedList";

export const metadata: Metadata = {
  title: "الكراجات المحفوظة | دق سلف",
  description: "الكراجات التي حفظتها على دق سلف.",
  alternates: { canonical: "/saved" },
  robots: { index: false, follow: true }, // user-specific (localStorage) — no SEO value
};

export default function SavedPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-extrabold">الكراجات المحفوظة</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        محفوظة على هذا الجهاز فقط — لا تحتاج تسجيل دخول.
      </p>
      <SavedList />
    </div>
  );
}
