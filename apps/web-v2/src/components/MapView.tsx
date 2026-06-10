"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { entityColor } from "@/lib/brand";
import type { MapPoint } from "@/lib/workshops";

const KUWAIT_CENTER: [number, number] = [29.3759, 47.9774];

// Branded colored-dot markers (divIcon) — avoids Leaflet's broken default image
// paths and the no-Google-images rule entirely. Cached per color.
const iconCache = new Map<string, L.DivIcon>();
function dotIcon(color: string): L.DivIcon {
  let icon = iconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "degself-pin",
      html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #0a0a0a;box-shadow:0 0 0 1.5px ${color}"></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8],
    });
    iconCache.set(color, icon);
  }
  return icon;
}

export default function MapView({ points }: { points: MapPoint[] }) {
  return (
    <MapContainer
      center={KUWAIT_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <MarkerClusterGroup chunkedLoading>
        {points.map((p) => (
          <Marker
            key={p.place_id}
            position={[p.lat, p.lng]}
            icon={dotIcon(entityColor(p.entity_type))}
          >
            <Popup>
              <div dir="rtl" style={{ minWidth: 160 }}>
                <strong>{p.name}</strong>
                <br />
                <Link href={`/workshop/${p.place_id}`}>التفاصيل ←</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
