// Stable public-facing catalog claim.
//
// Production currently has 1,854 active, in-scope automotive workshops. We
// publish a rounded-down label so normal additions/removals do not make SEO and
// translated copy contradict one another between deployments.
export const PUBLIC_WORKSHOP_COUNT_LABEL = "1,850+";

const CURRENT_COUNT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["1,640+", PUBLIC_WORKSHOP_COUNT_LABEL],
  ["1,640", "1,850"],
  ["1,757", PUBLIC_WORKSHOP_COUNT_LABEL],
  // Existing copy often says “more than 1,800”, so keep this replacement
  // without a trailing plus to avoid rendering “more than 1,850+”.
  ["1,800", "1,850"],
];

function normalizeString(value: string): string {
  return CURRENT_COUNT_REPLACEMENTS.reduce(
    (result, [legacy, current]) => result.replaceAll(legacy, current),
    value,
  );
}

/**
 * Rewrites only known legacy *current catalog size* claims in translated
 * message dictionaries. Historical collection/audit numbers such as 1,798 are
 * deliberately left untouched.
 */
export function normalizeCatalogCountClaims<T>(value: T): T {
  if (typeof value === "string") {
    return normalizeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCatalogCountClaims(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeCatalogCountClaims(item),
      ]),
    ) as T;
  }

  return value;
}
