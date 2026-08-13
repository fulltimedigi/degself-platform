import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Truck, Wrench, Disc3 } from "lucide-react";

export async function EmergencyBanner() {
  const t = await getTranslations("home");
  return (
    <div className="rounded-2xl border border-red-500/25 bg-[linear-gradient(180deg,rgba(239,68,68,0.12),transparent_45%),#141414] p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          {/* pulsing red dot */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <h2 className="text-xl font-extrabold">{t("emergencyTitle")}</h2>
        </div>
        <p className="text-muted-foreground">{t("emergencySubtitle")}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/emergency?type=tow"
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white shadow-[0_10px_28px_-12px_rgba(239,68,68,0.8)] transition hover:bg-red-500"
          >
            <Truck size={18} aria-hidden />
            {t("tow")}
          </Link>
          <Link
            href="/karaj-mutanaqil"
            className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-2.5 font-bold text-foreground transition hover:bg-red-950/50"
          >
            <Wrench size={18} aria-hidden />
            {t("mobileGarage")}
          </Link>
          <Link
            href="/bansher-mutanaqil"
            className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-2.5 font-bold text-foreground transition hover:bg-red-950/50"
          >
            <Disc3 size={18} aria-hidden />
            {t("mobileTire")}
          </Link>
        </div>
      </div>
    </div>
  );
}
