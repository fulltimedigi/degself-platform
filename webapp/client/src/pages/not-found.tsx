import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <Compass size={48} className="text-primary" />
        <h1 className="font-en text-5xl font-extrabold">404</h1>
        <p className="text-lg font-bold">الصفحة غير موجودة</p>
        <p className="text-sm text-muted-foreground">يبدو أنك وصلت إلى طريق مسدود. لنعد بك إلى المسار الصحيح.</p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
          data-testid="link-back-home"
        >
          العودة للرئيسية
        </Link>
      </div>
    </Layout>
  );
}
