import logoKey from "@/assets/logo-key.png";

/**
 * KeyIcon: SVG inline لمفتاح السيارة - شفاف 100% بدون halo
 * يستخدم currentColor للتلوين الديناميكي
 */
function KeyIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* جسم الريموت الأصفر */}
      <rect
        x="18"
        y="6"
        width="28"
        height="26"
        rx="6"
        fill="#FFD60A"
      />
      {/* زر الباور الأسود */}
      <circle cx="32" cy="15" r="4.5" fill="#0A0A0A" />
      <path
        d="M32 13v2.5M30 14.5a2 2 0 1 0 4 0"
        stroke="#FFD60A"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* زرين القفل */}
      <rect x="24" y="22" width="6" height="5" rx="1" fill="#0A0A0A" />
      <rect x="34" y="22" width="6" height="5" rx="1" fill="#0A0A0A" />
      {/* عمود المفتاح */}
      <rect x="30" y="32" width="4" height="20" fill="#C0C0C0" />
      {/* أسنان المفتاح */}
      <path
        d="M30 48 L26 50 L26 53 L30 52 Z"
        fill="#C0C0C0"
      />
      <path
        d="M30 54 L27 56 L30 58 Z"
        fill="#C0C0C0"
      />
    </svg>
  );
}

/**
 * LogoEn: لوجو أفقي للهيدر - مفتاح SVG بسيط + نص "degself"
 */
export function LogoEn({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} data-testid="img-logo-en">
      <KeyIcon className="h-full w-auto aspect-square" />
      <span
        className="font-en font-extrabold leading-none tracking-tight"
        style={{ fontSize: "0.62em" }}
      >
        <span className="text-foreground">deg</span>
        <span className="text-primary">self</span>
      </span>
    </div>
  );
}

/**
 * LogoAr: لوجو أفقي بالعربي
 */
export function LogoAr({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} data-testid="img-logo-ar">
      <KeyIcon className="h-full w-auto aspect-square" />
      <span
        className="font-ar font-extrabold leading-none"
        style={{ fontSize: "0.62em" }}
      >
        <span className="text-foreground">دق </span>
        <span className="text-primary">سلف</span>
      </span>
    </div>
  );
}

/**
 * LogoHero: لوجو عمودي كبير لصفحات Hero - يستخدم PNG عالي الجودة
 */
export function LogoHero({ className = "h-32" }: { className?: string }) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      data-testid="img-logo-hero"
    >
      <img
        src={logoKey}
        alt="degself"
        className="h-3/4 w-auto drop-shadow-[0_8px_24px_rgba(255,214,10,0.25)]"
        draggable={false}
      />
      <span
        className="font-en font-extrabold leading-none tracking-tight"
        style={{ fontSize: "0.22em" }}
      >
        <span className="text-foreground">deg</span>
        <span className="text-primary">self</span>
      </span>
    </div>
  );
}

/**
 * LogoKey: مفتاح SVG فقط بدون نص - شفاف 100%
 */
export function LogoKey({ className = "h-9" }: { className?: string }) {
  return <KeyIcon className={className} />;
}

export const TAGLINE = "لا تحاتي، بنصلحها";
