import logoKey from "@/assets/logo-key.png";

/**
 * LogoEn: لوجو أفقي للهيدر - مفتاح صغير + نص "degself" جنبه
 * استخدمه في Navigation و Footer
 */
export function LogoEn({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} data-testid="img-logo-en">
      <img
        src={logoKey}
        alt=""
        className="h-full w-auto"
        draggable={false}
        aria-hidden="true"
      />
      <span className="font-en font-extrabold leading-none tracking-tight" style={{ fontSize: '0.58em' }}>
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
      <img
        src={logoKey}
        alt=""
        className="h-full w-auto"
        draggable={false}
        aria-hidden="true"
      />
      <span className="font-ar font-extrabold leading-none" style={{ fontSize: '0.58em' }}>
        <span className="text-foreground">دق </span>
        <span className="text-primary">سلف</span>
      </span>
    </div>
  );
}

/**
 * LogoHero: لوجو عمودي كبير لصفحات Hero - مفتاح كبير فوق + نص تحت
 */
export function LogoHero({ className = "h-32" }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className}`} data-testid="img-logo-hero">
      <img
        src={logoKey}
        alt="degself"
        className="h-3/4 w-auto drop-shadow-[0_8px_24px_rgba(255,214,10,0.25)]"
        draggable={false}
      />
      <span className="font-en font-extrabold leading-none tracking-tight" style={{ fontSize: '0.22em' }}>
        <span className="text-foreground">deg</span>
        <span className="text-primary">self</span>
      </span>
    </div>
  );
}

/**
 * LogoKey: مفتاح فقط بدون نص - للفافيكون والأماكن الصغيرة
 */
export function LogoKey({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoKey}
      alt="degself"
      className={className}
      draggable={false}
      data-testid="img-logo-key"
    />
  );
}

export const TAGLINE = "لا تحاتي، بنصلحها";
