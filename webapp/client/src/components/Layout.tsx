import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Map, Info, Home, Menu, X, Siren } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { LogoAr, LogoEn, TAGLINE, BUSINESS_WA_URL, BUSINESS_PHONE } from "./Brand";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/search", label: "تصفّح", icon: Search },
  { href: "/map", label: "الخريطة", icon: Map },
  { href: "/emergency", label: "طوارئ", icon: Siren },
  { href: "/about", label: "عن المنصة", icon: Info },
];

function Header() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? loc === "/" : loc.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <LogoAr className="h-10 md:h-11" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors hover-elevate ${
                isActive(item.href) ? "text-primary" : "text-foreground/80"
              }`}
              data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
          <a
            href={BUSINESS_WA_URL}
            target="_blank"
            rel="noreferrer"
            className="mr-1 flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
            data-testid="link-nav-whatsapp"
            aria-label="تواصل عبر واتساب"
          >
            <SiWhatsapp size={16} />
            واتساب
          </a>
        </nav>

        <button
          className="rounded-lg p-2 hover-elevate md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="القائمة"
          data-testid="button-menu-toggle"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background md:hidden" data-testid="nav-mobile">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold hover-elevate ${
                  isActive(item.href) ? "text-primary" : "text-foreground/90"
                }`}
                data-testid={`link-mobnav-${item.href.replace("/", "") || "home"}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <a
              href={BUSINESS_WA_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-3 rounded-lg bg-primary px-3 py-3 text-base font-bold text-primary-foreground"
              data-testid="link-mobnav-whatsapp"
            >
              <SiWhatsapp size={18} />
              تواصل عبر واتساب
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div className="space-y-3">
          <LogoEn className="h-12" />
          <p className="text-sm font-bold text-primary">{TAGLINE}</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            دليل كويتي للكراجات ومراكز الصيانة ومحلات قطع الغيار
            في كل محافظات الكويت.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold">تواصل معنا</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href={BUSINESS_WA_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-primary transition-colors"
                data-testid="link-footer-whatsapp"
              >
                <SiWhatsapp size={14} className="text-green-400" />
                واتساب <span className="font-en" dir="ltr">{BUSINESS_PHONE}</span>
              </a>
            </li>
            <li>
              <a
                href="https://x.com/degself"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                إكس (تويتر)
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/degselfkw"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                إنستغرام
              </a>
            </li>
          </ul>
        </div>

        <div className="md:text-left">
          <h4 className="mb-3 text-sm font-bold">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="hover:text-primary"
                  data-testid={`link-footer-${n.href.replace("/", "") || "home"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        <span className="font-en">© {new Date().getFullYear()} degself</span> · دق سلف
        — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}

export function Layout({ children, noFooter }: { children: React.ReactNode; noFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
