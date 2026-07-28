import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "دخول لوحة التحكم",
  robots: { index: false, follow: false }, // private admin tool — never index
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-extrabold">لوحة تحكم دق سلف</h1>
        <p className="text-sm text-muted-foreground">أدخل كلمة السر للدخول.</p>
      </div>
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
