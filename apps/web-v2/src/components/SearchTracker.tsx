"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/track";

/**
 * Logs a directory-search event without sending the raw query to Vercel or
 * PostHog. Snapchat keeps its existing provider-specific search string.
 */
export function SearchTracker({
  query,
  resultCount,
  filterCount,
}: {
  query: string;
  resultCount: number;
  filterCount: number;
}) {
  const locale = useLocale();

  useEffect(() => {
    const q = query.trim();
    if (!q && filterCount === 0) return;

    track(
      "search",
      {
        has_query: Boolean(q),
        query_length: q.length,
        result_count: resultCount,
        filter_count: filterCount,
        source: "directory",
        locale,
      },
      q ? { snapSearchString: q } : undefined
    );
  }, [filterCount, locale, query, resultCount]);

  return null;
}
