import type { Metadata } from "next";
import { AuditPanel } from "@/components/AuditPanel";

export const metadata: Metadata = {
  title: "تدقيق بيانات الكراجات",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export default function AdminAuditPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-extrabold">تدقيق بيانات الكراجات</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        طبّق ملف التصحيحات على قاعدة البيانات. التغيير غير مدمّر — لا يمسّ
        الحقل الأصلي <code>specialty</code>، بل يملأ حقول التدقيق فقط.
      </p>
      <AuditPanel />
    </div>
  );
}
