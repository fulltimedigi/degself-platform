import Link from "next/link";
import Image from "next/image";

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
            لا تحاتي، بنصلحها — دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.
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
          <Link
            href="/search?service_mode=tow"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            سطحة وكراج متنقل
          </Link>
        </div>

        {/* تواصل */}
        <div className="flex flex-col gap-3">
          <h3 className="font-bold">تواصل</h3>
          <p className="text-sm text-muted-foreground">تابعنا على وسائل التواصل</p>
          <div className="flex gap-3">
            {/* X */}
            <a href="#" aria-label="X" className="text-muted-foreground hover:text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © {year} دق سلف. كل الحقوق محفوظة.
      </div>
    </footer>
  );
}
