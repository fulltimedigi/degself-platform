"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MapPoint } from "@/lib/workshops";

function MapLoading() {
  const t = useTranslations("listing.map");
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      {t("loading")}
    </div>
  );
}

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export function MapLoader({ points }: { points: MapPoint[] }) {
  return <MapView points={points} />;
}
