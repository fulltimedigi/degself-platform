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
          <Image src="/brand/logo-icon.svg" alt="دق سلف" width={40} height={40} unoptimized />
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
