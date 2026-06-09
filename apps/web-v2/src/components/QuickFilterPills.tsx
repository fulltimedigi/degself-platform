import Link from "next/link";
import { Settings, Wrench, CircleDot, Brush, Cog, Droplet } from "lucide-react";
import { SPECIALTIES } from "@/lib/constants";

const ICONS = { Settings, Wrench, CircleDot, Brush, Cog, Droplet } as const;

export function QuickFilterPills() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {SPECIALTIES.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <Link
            key={s.label}
            href={`/search?q=${encodeURIComponent(s.q)}`}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-primary/10 hover:border-primary/40"
          >
            <Icon size={16} className="text-primary" aria-hidden />
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
