import type { Metadata } from "next";
import { ReportWorkshopForm } from "@/components/ReportWorkshopForm";

export const metadata: Metadata = {
  title: "بلّغنا عن كراج ناقص — دق سلف",
  description:
    "ساعدنا في إكمال دليل كراجات الكويت — أبلغنا عن أي كراج غير موجود في دق سلف.",
  robots: { index: false, follow: true }, // utility form — no SEO value
};

export default function ReportWorkshopPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8 text-center">
        <h1 className="mb-3 text-2xl font-extrabold sm:text-3xl">
          بلّغنا عن كراج ناقص
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          هل تعرف كراجاً في الكويت غير موجود في دق سلف؟ أرسل بياناته وسنضيفه
          مجاناً بعد التحقق منه. كلما زاد الدليل، استفاد الجميع.
        </p>
      </header>

      <ReportWorkshopForm />

      <section className="mt-10 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="mb-2 font-bold text-foreground">كيف نتحقق؟</h2>
        <ul className="list-disc space-y-1 pr-5">
          <li>نراجع البيانات يدوياً.</li>
          <li>نتأكد من وجود الكراج عبر Google Maps.</li>
          <li>نضيفه إلى الدليل في غضون 3-7 أيام.</li>
        </ul>
      </section>
    </main>
  );
}
