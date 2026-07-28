import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Settings, Wrench, Zap, CircleDot, Brush, Cog, Droplet } from "lucide-react";
import { SPECIALTIES } from "@/lib/constants";
import { ScrollRow } from "@/components/ScrollRow";

const SPEC_KEY: Record<string, string> = {
  "صيانة عامة": "general",
  "ميكانيكا": "mechanics",
  "كهرباء سيارات": "electrical",
  "تواير وبنشر": "tires",
  "بودي وصبغ": "bodywork",
  "قير": "gearbox",
  "زيوت وصيانة": "oils",
};

const ICONS = { Settings, Wrench, Zap, CircleDot, Brush, Cog, Droplet } as const;

export async function QuickFilterPills() {
  const t = await getTranslations("home.specialties");
  return (
    <ScrollRow className="gap-3 pb-1">
      {SPECIALTIES.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <Link
            key={s.label}
            href={`/search?q=${encodeURIComponent(s.q)}`}
            className="flex shrink-0 snap-start items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-primary/10 hover:border-primary/40"
          >
            <Icon size={16} className="text-primary" aria-hidden />
            {SPEC_KEY[s.label] ? t(SPEC_KEY[s.label]) : s.label}
          </Link>
        );
      })}
    </ScrollRow>
  );
}
