import logoArabic from "@/assets/logo-arabic-badge.png";
import logoLatin from "@/assets/logo-latin-badge.png";

/**
 * LogoEn: بادج دائري لاتيني "degself" — للاستخدام الدولي (Footer, About)
 * الاسم داخل البادج، لا حاجة لنص خارجي.
 */
export function LogoEn({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={logoLatin}
      alt="degself"
      className={`${className} w-auto select-none`}
      style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
      draggable={false}
      data-testid="img-logo-en"
    />
  );
}

/**
 * LogoAr: بادج دائري عربي "دق سلف" — للاستخدام الرئيسي والمحلي
 * الاسم داخل البادج، لا حاجة لنص خارجي.
 */
export function LogoAr({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={logoArabic}
      alt="دق سلف"
      className={`${className} w-auto select-none`}
      style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
      draggable={false}
      data-testid="img-logo-ar"
    />
  );
}

/**
 * LogoHero: بادج كبير لصفحات Hero — البادج العربي بحجم مميز
 */
export function LogoHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      data-testid="img-logo-hero"
    >
      <img
        src={logoArabic}
        alt="دق سلف - degself"
        className="h-32 w-32 drop-shadow-[0_8px_24px_rgba(255,214,10,0.35)] md:h-40 md:w-40"
        draggable={false}
      />
    </div>
  );
}

/**
 * LogoKey: البادج العربي فقط (اسم محفوظ للتوافق مع الكود القديم)
 */
export function LogoKey({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoArabic}
      alt="دق سلف"
      className={`${className} w-auto select-none`}
      style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
      draggable={false}
      data-testid="img-logo-key"
    />
  );
}

export const TAGLINE = "دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت";
export const SUBTITLE_AR = "دق سلف";

// Official Degself business WhatsApp line (Ooredoo postpaid eSIM)
export const BUSINESS_PHONE = "+965 6579 9195";
export const BUSINESS_PHONE_TEL = "+96565799195";
export const BUSINESS_WA = "96565799195";
export const BUSINESS_WA_URL = `https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent("السلام عليكم، تواصلت معكم من موقع degself")}`;
export const BUSINESS_EMAIL = "hello@degself.com";
