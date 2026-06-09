import logoEn from "@/assets/logo-english.png";
import logoAr from "@/assets/logo-arabic.png";

export function LogoEn({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoEn}
      alt="degself"
      className={className}
      draggable={false}
      data-testid="img-logo-en"
    />
  );
}

export function LogoAr({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoAr}
      alt="دق سلف"
      className={className}
      draggable={false}
      data-testid="img-logo-ar"
    />
  );
}

export const TAGLINE = "لا تحاتي، بنصلحها";
