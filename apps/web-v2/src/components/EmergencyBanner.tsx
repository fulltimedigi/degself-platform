import Link from "next/link";
import { Truck, Wrench } from "lucide-react";

export function EmergencyBanner() {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          {/* pulsing red dot */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <h2 className="text-xl font-extrabold">سيارتك عطلانة الحين؟</h2>
        </div>
        <p className="text-muted-foreground">سطحة أو كراج متنقل ييجي عندك</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/emergency?type=tow"
            className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 font-bold text-white transition hover:bg-red-600"
          >
            <Truck size={18} aria-hidden />
            سطحة
          </Link>
          <Link
            href="/karaj-mutanaqil"
            className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-2.5 font-bold text-foreground transition hover:bg-red-950/50"
          >
            <Wrench size={18} aria-hidden />
            كراج متنقل
          </Link>
        </div>
      </div>
    </div>
  );
}
