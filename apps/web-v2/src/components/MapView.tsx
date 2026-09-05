"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LOCALE_DIR, type Locale } from "@/i18n/routing";
import type { MapPoint } from "@/lib/workshops";

const KUWAIT_CENTER: [number, number] = [29.3759, 47.9774];

// Uniform Premium-Yellow pin with a dark border so it pops on the LIGHT basemap.
const PIN = L.divIcon({
  className: "degself-pin",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#FFD60A;border:2px solid #1a1a1a;box-shadow:0 1px 3px rgba(0,0,0,0.45)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8],
});

export default function MapView({ points }: { points: MapPoint[] }) {
  const t = useTranslations("listing.map");
  const locale = useLocale() as Locale;
  const dir = LOCALE_DIR[locale] ?? "rtl";

  return (
    <MapContainer
      center={KUWAIT_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#e5e7eb" }}
    >
      {/* OpenStreetMap standard tiles — keyless and free (no watermark). CARTO's
          basemaps now require an API key and serve an "API KEY REQUIRED" watermark
          for anonymous use, so we use OSM. The dark-bordered yellow pin still pops.
          If we later want the clean light look back, add a free key (MapTiler/CARTO). */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        subdomains="abc"
        maxZoom={19}
      />
      <MarkerClusterGroup chunkedLoading>
        {points.map((p) => (
          <Marker key={p.place_id} position={[p.lat, p.lng]} icon={PIN}>
            <Popup>
              <div dir={dir} style={{ minWidth: 160 }}>
                <strong>{p.name}</strong>
                <br />
                <Link href={`/workshop/${p.place_id}`}>{t("details")}</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
