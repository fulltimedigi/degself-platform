import Link from "next/link";
import { MapPin } from "lucide-react";
import { GOVERNORATES } from "@/lib/constants";

export function GovernorateGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {GOVERNORATES.map((g) => (
        <Link
          key={g.name}
          href={`/search?governorate=${encodeURIComponent(g.name)}`}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <MapPin size={15} className="text-primary" aria-hidden />
            {g.name}
          </span>
          <span className="text-xs text-muted-foreground">{g.areas.join(" · ")}</span>
        </Link>
      ))}
    </div>
  );
}
