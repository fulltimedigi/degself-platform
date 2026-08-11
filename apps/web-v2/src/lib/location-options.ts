function displayKey(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\s،,؛;:.]+$/u, "")
    .trim();
}

function isPlausibleLocation(value: string): boolean {
  if (value.length < 2 || !/\p{L}/u.test(value)) return false;
  // Imported phone/reference numbers occasionally get glued to an area name.
  // Keep real numbered districts such as "قطعة 1" or "21 الشويخ" while
  // rejecting long numeric prefixes that are clearly not location names.
  return !/^\d{5,}\s*\p{L}/u.test(value);
}

/**
 * Remove obviously corrupt location facets and collapse punctuation-only
 * duplicates. The returned value always remains an original database value so
 * selecting it still works with the existing exact-match search query.
 */
export function cleanLocationOptions(values: string[]): string[] {
  const grouped = new Map<string, string[]>();

  for (const raw of values) {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    const key = displayKey(trimmed);
    if (!isPlausibleLocation(key)) continue;
    const group = grouped.get(key) ?? [];
    group.push(trimmed);
    grouped.set(key, group);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ar"))
    .map(([key, originals]) => originals.find((value) => value === key) ?? originals[0]);
}
