import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ErrorState } from "@/components/States";
import { fetchMapPoints } from "@/lib/api";
import type { MapPoint, CountItem, GovernorateItem } from "@/lib/types";
import { fetchSpecialties, fetchGovernorates } from "@/lib/api";
import { useHashQuery, paramList } from "@/lib/useHashQuery";
import { ENTITY_TYPES, ENTITY_COLORS, entityColor, entityGlyph, KUWAIT_CENTER } from "@/lib/brand";
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
        // Lighter, more colorful basemap (similar to Kuwait Finder)
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);
        // Cluster with custom icon per size
        const cluster = L.markerClusterGroup({
          maxClusterRadius: 60,
          chunkedLoading: true,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          iconCreateFunction: (c: any) => {
            const count = c.getChildCount();
            // Size + color tiers
            let size = 36;
            let bg = "#FFD60A"; // yellow base
            let ring = "rgba(255, 214, 10, 0.25)";
            if (count >= 100) { size = 56; bg = "#EF4444"; ring = "rgba(239,68,68,0.30)"; }
            else if (count >= 25) { size = 48; bg = "#F97316"; ring = "rgba(249,115,22,0.30)"; }
            else if (count >= 10) { size = 42; bg = "#FBBF24"; ring = "rgba(251,191,36,0.30)"; }
            const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif;font-weight:800;color:#0A0A0A;font-size:${count>99?12:14}px;box-shadow:0 0 0 6px ${ring},0 2px 8px rgba(0,0,0,0.4);border:2px solid #fff">${count}</div>`;
            return L.divIcon({ html, className: "degself-cluster", iconSize: [size, size] });
          },
        });
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
      const glyph = entityGlyph(p.entity_type);
      // Teardrop pin with glyph inside (Kuwait Finder style)
      const icon = L.divIcon({
        className: "degself-pin",
        html: `<div style="position:relative;width:32px;height:40px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
            <circle cx="16" cy="16" r="9" fill="#fff"/>
          </svg>
          <div style="position:absolute;top:7px;left:0;right:0;text-align:center;font-family:Cairo,sans-serif;font-weight:800;font-size:14px;color:${color};line-height:18px">${glyph}</div>
        </div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -36],
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
