import Link from "next/link";
import Image from "next/image";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_WA_URL, BUSINESS_PHONE_TEL } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-3">
        {/* عن دق سلف */}
        <div className="flex flex-col gap-3">
          <Image src="/brand/logo-latin-badge.png" alt="degself" width={56} height={56} unoptimized className="h-14 w-14" />
          <p className="text-sm font-bold">دق سلف</p>
          <p className="text-sm text-muted-foreground">
            اكتشف عطل سيارتك الآن واختر الكراج المناسب — دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.
          </p>
        </div>

        {/* روابط سريعة */}
        <div className="flex flex-col gap-2">
          <h3 className="mb-1 font-bold">روابط سريعة</h3>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            الرئيسية
          </Link>
          <Link href="/search" className="text-sm text-muted-foreground hover:text-primary">
            البحث
          </Link>
          <Link href="/mukhtarat" className="text-sm text-muted-foreground hover:text-primary">
            كراجات مختارة
          </Link>
          <Link href="/ماركة" className="text-sm text-muted-foreground hover:text-primary">
            تصفّح حسب الماركة
          </Link>
          <Link href="/saved" className="text-sm text-muted-foreground hover:text-primary">
            المحفوظة
          </Link>
          <Link href="/emergency" className="text-sm text-muted-foreground hover:text-primary">
            سطحة وكراج متنقل
          </Link>
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary">
            المدونة
          </Link>
          <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary">
            الأسئلة الشائعة
          </Link>
          <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
            عن دق سلف
          </Link>
          <Link
            href="/report-workshop"
            className="text-sm font-bold text-primary hover:underline"
          >
            بلّغنا عن كراج ناقص
          </Link>

          {/* الروابط القانونية */}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              سياسة الخصوصية
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              شروط الاستخدام
            </Link>
          </div>
        </div>

        {/* تواصل */}
        <div className="flex flex-col gap-3">
          <h3 className="font-bold">تواصل معنا</h3>

          {/* Official WhatsApp business line */}
          <a
            href={BUSINESS_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/25"
            aria-label="تواصل عبر واتساب"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C7.6 2 4 5.6 4 10c0 2.4 1 4.5 2.7 6L4 22l6.3-2.1c.5.1 1.1.1 1.7.1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm0 14c-1 0-1.9-.2-2.8-.5l-3 1 .9-2.9c-1.3-1.2-2.1-2.9-2.1-4.6 0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6z" />
            </svg>
            <span dir="ltr" className="font-en">{BUSINESS_PHONE_DISPLAY}</span>
          </a>

          <a
            href={`tel:${BUSINESS_PHONE_TEL}`}
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
            aria-label="اتصل بنا"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            اتصل بنا: <span dir="ltr" className="font-en">{BUSINESS_PHONE_DISPLAY}</span>
          </a>

          <p className="mt-2 text-sm text-muted-foreground">تابعنا على وسائل التواصل</p>
          <div className="flex gap-3">
            {/* X */}
            <a
              href="https://x.com/degself"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (تويتر)"
              className="text-muted-foreground hover:text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Instagram */}
            <a
              href="https://www.instagram.com/degselfkw"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
              </svg>
            </a>
            {/* Snapchat */}
            <a
              href="https://www.snapchat.com/add/degself"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Snapchat"
              className="text-muted-foreground hover:text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.014.449-.39.838-1.213 1.162-.09.029-.209.075-.344.119-.45.149-1.139.39-1.333.838-.09.224-.061.524.12.868l.016.015c.06.12 1.526 2.97 4.305 3.434.225.029.39.225.375.45-.005.07-.02.144-.045.21-.24.57-1.272.99-3.146 1.27-.06.092-.12.376-.164.572-.029.179-.074.36-.135.553-.075.27-.27.405-.555.405h-.03c-.135 0-.314-.03-.539-.075-.36-.075-.764-.135-1.272-.135-.3 0-.6.015-.914.075-.6.104-1.123.464-1.723.884-.853.598-1.826 1.288-3.293 1.288-.06 0-.12-.015-.18-.015-.061 0-.12.015-.181.015-1.467 0-2.426-.675-3.279-1.288-.599-.42-1.107-.78-1.707-.884-.314-.045-.629-.075-.928-.075-.54 0-.958.09-1.272.149-.211.043-.391.075-.54.075-.374 0-.523-.225-.583-.42-.061-.192-.09-.389-.135-.567-.046-.196-.105-.48-.166-.572-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.14-.055-.215-.015-.226.15-.42.375-.45 2.78-.464 4.245-3.319 4.306-3.434l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.674-1.332-.823-.121-.029-.24-.075-.346-.12-1.107-.434-1.257-.93-1.197-1.272.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.298 1.104.298.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.654.307-4.847C7.392 1.077 10.749.79 11.731.79l.475.004z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Trust signals bar */}
      <div className="border-t border-border bg-card/50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-xs font-bold text-muted-foreground">
            ليه تثق في دق سلف؟
          </p>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-extrabold text-primary">دليل شامل</span>
              <span className="text-[10px] text-muted-foreground">لكراجات الكويت</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-1 text-base font-extrabold text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                </svg>
                Google
              </span>
              <span className="text-[10px] text-muted-foreground">تقييمات حقيقية</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-extrabold text-primary">مجانًا</span>
              <span className="text-[10px] text-muted-foreground">بدون اشتراك</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-extrabold text-primary">بدون ترتيب مدفوع</span>
              <span className="text-[10px] text-muted-foreground">نتائج عادلة</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © {year} دق سلف. كل الحقوق محفوظة.
      </div>
    </footer>
  );
}
