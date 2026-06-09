import { useCallback, useSyncExternalStore } from "react";

// Read/write query params from the hash route (e.g. #/search?q=...&governorate=...)
function getHashQuery(): URLSearchParams {
  const hash = window.location.hash; // "#/search?q=x"
  const qi = hash.indexOf("?");
  return new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : "");
}

function getHashPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  const qi = hash.indexOf("?");
  return qi >= 0 ? hash.slice(0, qi) : hash;
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useHashQuery() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => ""
  );

  // recompute params on every hash change
  const params = getHashQuery();

  const setParams = useCallback((next: URLSearchParams, replace = false) => {
    const path = getHashPath() || "/search";
    const qs = next.toString();
    const newHash = `#${path}${qs ? `?${qs}` : ""}`;
    if (replace) {
      const url = window.location.pathname + window.location.search + newHash;
      window.history.replaceState(null, "", url);
      // replaceState doesn't fire hashchange — dispatch manually
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = newHash;
    }
  }, []);

  return { params, setParams, _raw: search };
}

export function paramList(params: URLSearchParams, key: string): string[] {
  const v = params.get(key);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
