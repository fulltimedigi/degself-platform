// Lazily load Leaflet + MarkerCluster from CDN. Returns the global L.
let loadPromise: Promise<any> | null = null;

function loadScript(src: string, integrity?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = "";
    }
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function loadLeaflet(): Promise<any> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await loadScript(
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    );
    await loadScript(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"
    );
    return (window as any).L;
  })();
  return loadPromise;
}
