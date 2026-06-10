"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/lib/workshops";

// Leaflet touches `window`, so it must be client-only (ssr:false). That flag is
// only allowed inside a Client Component — hence this thin loader wrapper.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      جاري تحميل الخريطة…
    </div>
  ),
});

export function MapLoader({ points }: { points: MapPoint[] }) {
  return <MapView points={points} />;
}
