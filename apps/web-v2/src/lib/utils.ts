/** Truncate a string to `max` chars, adding an ellipsis when cut. */
export function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max).trim() + "…" : s;
}
