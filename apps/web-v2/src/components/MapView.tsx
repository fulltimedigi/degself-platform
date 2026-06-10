"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
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
  return (
    <MapContainer
      center={KUWAIT_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#e5e7eb" }}
    >
      {/* Light basemap (CARTO Positron) — clean, makes yellow pins clear. No Google. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <MarkerClusterGroup chunkedLoading>
        {points.map((p) => (
          <Marker key={p.place_id} position={[p.lat, p.lng]} icon={PIN}>
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
