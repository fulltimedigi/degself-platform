import type { Metadata } from "next";
import { ModerationPanel } from "@/components/ModerationPanel";

export const metadata: Metadata = {
  title: "مراجعة التقييمات",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export default function ModerateReviewsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-extrabold">مراجعة التقييمات</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        وافق على التقييمات الجديدة لتظهر في صفحات الكراجات، أو ارفض غير المناسب.
      </p>
      <ModerationPanel />
    </div>
  );
}
