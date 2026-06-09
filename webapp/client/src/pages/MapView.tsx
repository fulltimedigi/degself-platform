import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ErrorState } from "@/components/States";
import { fetchMapPoints } from "@/lib/api";
import type { MapPoint, CountItem, GovernorateItem } from "@/lib/types";
import { fetchSpecialties, fetchGovernorates } from "@/lib/api";
import { useHashQuery, paramList } from "@/lib/useHashQuery";
import { ENTITY_TYPES, ENTITY_COLORS, entityColor, KUWAIT_CENTER } from "@/lib/brand";
import { loadLeaflet } from "@/lib/leaflet-loader";
import { Loader2 } from "lucide-react";

export default function MapView() {
  const { params, setParams } = useHashQuery();
  const govSel = paramList(params, "governorate");
  const specSel = paramList(params, "specialty");
  const typeSel = paramList(params, "entity_type");
  const openNow = params.get("open_now") === "true";

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const govs = useQuery<GovernorateItem[]>({ queryKey: ["/api/governorates"], queryFn: fetchGovernorates });
  const specialties = useQuery<CountItem[]>({ queryKey: ["/api/specialties"], queryFn: fetchSpecialties });

  const filters = {
    governorate: govSel,
    specialty: specSel,
    entity_type: typeSel,
    open_now: openNow,
  };

  const points = useQuery<{ total: number; results: MapPoint[] }>({
    queryKey: ["/api/workshops/map", JSON.stringify(filters)],
    queryFn: () => fetchMapPoints(filters),
  });

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView(
          KUWAIT_CENTER,
          11
        );
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);
        const cluster = L.markerClusterGroup({ maxClusterRadius: 50, chunkedLoading: true });
        map.addLayer(cluster);
        mapRef.current = map;
        clusterRef.current = cluster;
        setMapReady(true);
      })
      .catch(() => setMapError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Render markers when points change
  useEffect(() => {
    if (!mapReady || !clusterRef.current || !LRef.current || !points.data) return;
    const L = LRef.current;
    const cluster = clusterRef.current;
    cluster.clearLayers();
    const markers: any[] = [];
    for (const p of points.data.results) {
      if (!p.latitude || !p.longitude) continue;
      const color = entityColor(p.entity_type);
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #0A0A0A;box-shadow:0 0 0 1px ${color}80"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const m = L.marker([p.latitude, p.longitude], { icon });
      const rating = p.rating != null ? `★ ${p.rating.toFixed(1)}` : "بدون تقييم";
      m.bindPopup(
        `<div style="min-width:180px;font-family:Cairo,sans-serif;text-align:right" dir="rtl">
          <div style="font-weight:700;margin-bottom:4px">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:#9CA3AF;margin-bottom:2px">${escapeHtml(p.entity_type)} · ${escapeHtml(p.specialty)}</div>
          <div style="font-size:12px;color:#9CA3AF;margin-bottom:6px">${escapeHtml(p.area)} · <span style="color:#FFD60A">${rating}</span></div>
          <a href="#/workshop/${encodeURIComponent(p.place_id)}" style="display:inline-block;background:#FFD60A;color:#0A0A0A;font-weight:700;font-size:12px;padding:5px 10px;border-radius:8px;text-decoration:none">عرض التفاصيل</a>
        </div>`
      );
      markers.push(m);
    }
    cluster.addLayers(markers);
  }, [mapReady, points.data]);

  const toggleMulti = (key: string, val: string) => {
    const cur = paramList(params, key);
    const set = new Set(cur);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    const next = new URLSearchParams(params);
    if (set.size) next.set(key, Array.from(set).join(","));
    else next.delete(key);
    setParams(next, true);
  };

  return (
    <Layout noFooter>
      <div className="relative h-[calc(100vh-4rem)] w-full">
        {/* Filter bar */}
        <div className="absolute inset-x-0 top-0 z-[1000] border-b border-border bg-background/90 backdrop-blur-md">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-2.5">
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              {points.data ? `${points.data.total.toLocaleString("en-US")} منشأة` : "…"}
            </span>
            <div className="h-4 w-px shrink-0 bg-border" />
            {ENTITY_TYPES.map((t) => {
              const active = typeSel.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleMulti("entity_type", t)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold hover-elevate ${
                    active ? "border-transparent" : "border-border bg-card"
                  }`}
                  style={active ? { backgroundColor: `${ENTITY_COLORS[t]}26`, color: ENTITY_COLORS[t], borderColor: `${ENTITY_COLORS[t]}66` } : {}}
                  data-testid={`mapfilter-type-${t}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_COLORS[t] }} />
                  {t}
                </button>
              );
            })}
            <div className="h-4 w-px shrink-0 bg-border" />
            <button
              onClick={() => {
                const next = new URLSearchParams(params);
                openNow ? next.delete("open_now") : next.set("open_now", "true");
                setParams(next, true);
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold hover-elevate ${
                openNow ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"
              }`}
              data-testid="mapfilter-open-now"
            >
              مفتوح الآن
            </button>
            {(govs.data || []).map((g) => {
              const active = govSel.includes(g.name);
              return (
                <button
                  key={g.name}
                  onClick={() => toggleMulti("governorate", g.name)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold hover-elevate ${
                    active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"
                  }`}
                  data-testid={`mapfilter-gov-${g.name}`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div ref={mapEl} className="h-full w-full" data-testid="map-container" />

        {/* Loading / error overlays */}
        {!mapReady && !mapError && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/70">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background p-6">
            <ErrorState onRetry={() => window.location.reload()} />
          </div>
        )}
      </div>
    </Layout>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
