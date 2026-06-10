"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/** Logs a "search" event (with the query) once per distinct query view. */
export function SearchTracker({ query }: { query: string }) {
  useEffect(() => {
    const q = query.trim();
    if (q) track("search", { query: q });
  }, [query]);
  return null;
}
