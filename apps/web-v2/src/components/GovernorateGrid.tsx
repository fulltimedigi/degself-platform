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
          className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10"
        >
          <span className="flex items-center gap-1.5 font-bold transition group-hover:text-primary">
            <MapPin size={15} className="text-primary" aria-hidden />
            {g.name}
          </span>
          <span className="text-xs text-muted-foreground">{g.areas.join(" · ")}</span>
        </Link>
      ))}
    </div>
  );
}
