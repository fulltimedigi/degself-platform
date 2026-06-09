import logoKey from "@/assets/logo-key.png";

/**
 * LogoEn: لوجو أفقي للهيدر — مفتاح PNG عالي الجودة + نص
 */
export function LogoEn({ className = "h-8" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      data-testid="img-logo-en"
    >
      <img
        src={logoKey}
        alt=""
        className="h-full w-auto select-none"
        style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
        draggable={false}
        aria-hidden="true"
      />
      <span
        className="font-en font-extrabold leading-none tracking-tight"
        style={{ fontSize: "0.7em" }}
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
export function LogoAr({ className = "h-8" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      data-testid="img-logo-ar"
    >
      <img
        src={logoKey}
        alt=""
        className="h-full w-auto select-none"
        style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
        draggable={false}
        aria-hidden="true"
      />
      <span
        className="font-ar font-extrabold leading-none"
        style={{ fontSize: "0.7em" }}
      >
        <span className="text-foreground">دق </span>
        <span className="text-primary">سلف</span>
      </span>
    </div>
  );
}

/**
 * LogoHero: لوجو عمودي كبير لصفحات Hero — مفتاح + نص متوازنين
 */
export function LogoHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-4 ${className}`}
      data-testid="img-logo-hero"
    >
      <img
        src={logoKey}
        alt="degself"
        className="h-24 w-24 drop-shadow-[0_8px_24px_rgba(255,214,10,0.35)] md:h-28 md:w-28"
        draggable={false}
      />
      <span className="font-en text-4xl font-extrabold leading-none tracking-tight md:text-5xl">
        <span className="text-foreground">deg</span>
        <span className="text-primary">self</span>
      </span>
      <span className="font-ar text-lg font-bold leading-none text-muted-foreground md:text-xl">
        دق <span className="text-primary">سلف</span>
      </span>
    </div>
  );
}

/**
 * LogoKey: مفتاح PNG فقط بدون نص
 */
export function LogoKey({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoKey}
      alt="degself"
      className={`${className} select-none`}
      style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
      draggable={false}
      data-testid="img-logo-key"
    />
  );
}

export const TAGLINE = "لا تحاتي، بنصلحها";
