import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkshopDataQualityReport,
  workshopDataQualityMarkdown,
  type DataQualityWorkshop,
} from "../workshop-data-quality";

function workshop(overrides: Partial<DataQualityWorkshop> = {}): DataQualityWorkshop {
  return {
    place_id: "place-1",
    name: "كراج السالمية",
    area: "السالمية",
    governorate: "حولي",
    specialty: "ميكانيك عام",
    reviewed_specialty: "ميكانيك عام",
    active: true,
    is_automotive: true,
    out_of_scope: false,
    permanently_closed: false,
    phone: null,
    phone_intl: null,
    lat: 29.33,
    lng: 48.07,
    ...overrides,
  };
}

test("a clean workshop produces no findings", () => {
  const report = buildWorkshopDataQualityReport([workshop()], "2026-08-11T00:00:00.000Z");
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
  assert.equal(report.totalWorkshops, 1);
});

test("reports malformed bilingual catalog fields without changing data", () => {
  const input = workshop({
    name: "  Garage  One  ",
    area: "96555555 السالمية",
    governorate: "unknown",
    active: true,
    is_automotive: false,
  });
  const snapshot = structuredClone(input);
  const report = buildWorkshopDataQualityReport([input]);

  assert.deepEqual(input, snapshot);
  assert.ok(report.findings.some((item) => item.code === "lifecycle_conflict" && item.severity === "error"));
  assert.ok(report.findings.some((item) => item.code === "text_formatting" && item.field === "name"));
  assert.ok(report.findings.some((item) => item.code === "numeric_prefix" && item.field === "area"));
  assert.ok(report.findings.some((item) => item.code === "placeholder_value" && item.field === "governorate"));
});

test("normalizes Arabic identity variants into one manual-review group", () => {
  const report = buildWorkshopDataQualityReport([
    workshop({ place_id: "a", name: "ورشة الأمان", area: "حولي" }),
    workshop({ place_id: "b", name: "ورشة الامان", area: "حولي" }),
  ]);
  const duplicate = report.findings.find((item) => item.code === "duplicate_identity");
  assert.deepEqual(duplicate?.placeIds, ["a", "b"]);
});

test("markdown keeps the full report in JSON and caps the readable queue", () => {
  const report = buildWorkshopDataQualityReport(
    Array.from({ length: 205 }, (_, index) => workshop({ place_id: `p-${index}`, area: null })),
    "2026-08-11T00:00:00.000Z",
  );
  const markdown = workshopDataQualityMarkdown(report);
  assert.match(markdown, /Report truncated here/);
  assert.match(markdown, /Workshops checked: 205/);
});
