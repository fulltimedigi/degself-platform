// Shared display helpers — keep UI wording consistent (and golden-rule safe).

/** service_mode → Arabic badge ("كراج" not "ورشة"). */
export function serviceModeLabel(mode: string): string {
  switch (mode) {
    case "mobile":
      return "كراج متنقل";
    case "tow":
      return "سطحة";
    default:
      return "كراج";
  }
}

/** review volume → words, never a raw number (golden rule: no raw numbers in UI). */
export function reviewVolumeLabel(count: number | null): string | null {
  if (count == null) return null;
  if (count > 100) return "تقييمات كثيرة";
  if (count >= 50) return "تقييمات جيدة";
  return null; // < 50 → don't show
}
