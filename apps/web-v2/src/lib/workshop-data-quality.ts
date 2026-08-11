export type DataQualitySeverity = "error" | "warning";

export interface DataQualityWorkshop {
  place_id: string;
  name: string | null;
  area: string | null;
  governorate: string | null;
  specialty: string | null;
  reviewed_specialty: string | null;
  active: boolean | null;
  is_automotive: boolean | null;
  out_of_scope: boolean | null;
  permanently_closed: boolean | null;
  phone: string | null;
  phone_intl: string | null;
  lat: number | null;
  lng: number | null;
}

export interface DataQualityFinding {
  code:
    | "missing_value"
    | "placeholder_value"
    | "text_formatting"
    | "numeric_prefix"
    | "lifecycle_conflict"
    | "invalid_coordinate"
    | "duplicate_identity";
  severity: DataQualitySeverity;
  placeIds: string[];
  field?: string;
  value?: string;
  message: string;
}

export interface WorkshopDataQualityReport {
  generatedAt: string;
  totalWorkshops: number;
  activeWorkshops: number;
  summary: {
    errors: number;
    warnings: number;
    byCode: Record<string, number>;
    byField: Record<string, number>;
  };
  findings: DataQualityFinding[];
}

const TEXT_FIELDS = ["name", "area", "governorate", "specialty", "reviewed_specialty"] as const;
const PLACEHOLDERS = new Set([
  "",
  "n a",
  "na",
  "none",
  "null",
  "unknown",
  "غير معروف",
  "غير محدد",
  "بدون اسم",
  "لا يوجد",
]);

function normalizeArabic(value: string): string {
  return value
    .toLocaleLowerCase("ar")
    .normalize("NFKC")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplayText(value: string, trimTrailingPunctuation = false): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimTrailingPunctuation ? cleaned.replace(/[\s،,؛;:]+$/u, "").trim() : cleaned;
}

function finding(
  code: DataQualityFinding["code"],
  severity: DataQualitySeverity,
  workshop: DataQualityWorkshop,
  message: string,
  field?: string,
  value?: string,
): DataQualityFinding {
  return { code, severity, placeIds: [workshop.place_id], field, value, message };
}

export function buildWorkshopDataQualityReport(
  workshops: DataQualityWorkshop[],
  generatedAt = new Date().toISOString(),
): WorkshopDataQualityReport {
  const findings: DataQualityFinding[] = [];
  const identityGroups = new Map<string, DataQualityWorkshop[]>();

  for (const workshop of workshops) {
    const active = workshop.active === true && workshop.permanently_closed !== true;

    if (active && (workshop.is_automotive === false || workshop.out_of_scope === true)) {
      findings.push(
        finding(
          "lifecycle_conflict",
          "error",
          workshop,
          "Active workshop is marked as non-automotive or out of scope.",
        ),
      );
    }

    if (workshop.lat != null && (workshop.lat < -90 || workshop.lat > 90)) {
      findings.push(finding("invalid_coordinate", "error", workshop, "Latitude is outside the valid range.", "lat", String(workshop.lat)));
    }
    if (workshop.lng != null && (workshop.lng < -180 || workshop.lng > 180)) {
      findings.push(finding("invalid_coordinate", "error", workshop, "Longitude is outside the valid range.", "lng", String(workshop.lng)));
    }
    if ((workshop.lat == null) !== (workshop.lng == null)) {
      findings.push(finding("invalid_coordinate", "warning", workshop, "Only one coordinate is present."));
    }

    for (const field of TEXT_FIELDS) {
      const value = workshop[field];
      if (field === "reviewed_specialty" && !active) continue;

      if (value == null || value.trim() === "") {
        if (
          field === "name" ||
          field === "specialty" ||
          (active && (field === "area" || field === "governorate" || field === "reviewed_specialty"))
        ) {
          findings.push(finding("missing_value", field === "name" || field === "specialty" ? "error" : "warning", workshop, `Missing ${field}.`, field));
        }
        continue;
      }

      const normalized = normalizeArabic(value);
      if (PLACEHOLDERS.has(normalized)) {
        findings.push(finding("placeholder_value", "warning", workshop, `Placeholder text in ${field}.`, field, value));
      }

      const cleaned = cleanDisplayText(value, field === "area" || field === "governorate");
      if (cleaned !== value) {
        findings.push(finding("text_formatting", "warning", workshop, `Formatting cleanup needed in ${field}.`, field, value));
      }

      if (/^\d{5,}\s*\p{L}/u.test(cleaned)) {
        findings.push(finding("numeric_prefix", "warning", workshop, `Suspicious long numeric prefix in ${field}.`, field, value));
      }
    }

    const name = normalizeArabic(workshop.name ?? "");
    const location = normalizeArabic(workshop.area || workshop.governorate || "");
    if (name.length >= 4 && location) {
      const key = `${name}|${location}`;
      const group = identityGroups.get(key) ?? [];
      group.push(workshop);
      identityGroups.set(key, group);
    }
  }

  for (const group of identityGroups.values()) {
    if (group.length < 2) continue;
    findings.push({
      code: "duplicate_identity",
      severity: "warning",
      placeIds: group.map((workshop) => workshop.place_id).sort(),
      field: "name+location",
      value: `${group[0].name ?? ""} — ${group[0].area || group[0].governorate || ""}`,
      message: "Multiple workshops share the same normalized name and location; review before merging.",
    });
  }

  findings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    return a.code.localeCompare(b.code) || a.placeIds.join("|").localeCompare(b.placeIds.join("|"));
  });

  const byCode: Record<string, number> = {};
  const byField: Record<string, number> = {};
  for (const item of findings) {
    byCode[item.code] = (byCode[item.code] ?? 0) + 1;
    if (item.field) byField[item.field] = (byField[item.field] ?? 0) + 1;
  }

  return {
    generatedAt,
    totalWorkshops: workshops.length,
    activeWorkshops: workshops.filter((workshop) => workshop.active === true && workshop.permanently_closed !== true).length,
    summary: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      byCode,
      byField,
    },
    findings,
  };
}

export function workshopDataQualityMarkdown(report: WorkshopDataQualityReport): string {
  const lines = [
    "# Workshop data-quality audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Workshops checked: ${report.totalWorkshops} (${report.activeWorkshops} active)`,
    `Errors: ${report.summary.errors} · Warnings: ${report.summary.warnings}`,
    "",
    "## Findings by rule",
    "",
    "| Rule | Count |",
    "| --- | ---: |",
    ...Object.entries(report.summary.byCode).sort().map(([code, count]) => `| ${code} | ${count} |`),
    "",
    "## Review queue",
    "",
    ...report.findings.slice(0, 200).map((item) => `- **${item.severity} / ${item.code}** — ${item.message} (${item.placeIds.join(", ")})${item.value ? `: \`${item.value.replace(/`/g, "'")}\`` : ""}`),
  ];

  if (report.findings.length > 200) lines.push("", `_Report truncated here; the JSON artifact contains all ${report.findings.length} findings._`);
  return `${lines.join("\n")}\n`;
}
