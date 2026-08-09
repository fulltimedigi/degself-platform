import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("admin manual offer entry uses the same clarified structured concepts as the garage form", async () => {
  const adminFields = await source("../../components/StructuredOfferFields.tsx");
  const garageForm = await source("../../components/GarageOfferForm.tsx");

  for (const phrase of [
    "كيف تحسب السعر؟",
    "سعر نهائي",
    "السعر بعد الفحص",
    "قطع الغيار المستخدمة",
    "الضمان بعد التصليح",
    "الضمان يشمل",
    "أقصى مدة متوقعة لإصلاح السيارة",
    "غير معروف حتى الفحص",
    "+ إضافة ملاحظة",
  ]) {
    assert.match(adminFields, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(garageForm, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("admin offer entry no longer relies on ambiguous validity, warranty, or duration placeholders", async () => {
  const adminFields = await source("../../components/StructuredOfferFields.tsx");

  assert.match(adminFields, /العرض صالح لمدة/);
  assert.match(adminFields, /صلاحية العرض بالأيام/);
  assert.match(adminFields, /مدة الضمان بالأيام/);
  assert.match(adminFields, /من وقت دخول السيارة للكراج/);
  assert.match(adminFields, /DURATION_OPTIONS/);
  assert.doesNotMatch(adminFields, /placeholder=\{t\("submit\.validity"\)\}/);
  assert.doesNotMatch(adminFields, /placeholder=\{t\("submit\.warranty"/);
  assert.doesNotMatch(adminFields, /placeholder=\{t\("submit\.duration"\)\}/);
});

test("admin renders standardized repair-duration codes as human-readable Arabic with legacy fallback", async () => {
  const controls = await source("../../components/QuoteAdminControls.tsx");

  assert.match(controls, /DURATION_LABEL_AR/);
  assert.match(controls, /same_day: "نفس اليوم"/);
  assert.match(controls, /unknown_until_inspection: "غير معروف حتى الفحص"/);
  assert.match(controls, /DURATION_LABEL_AR\[o\.estimated_duration\] \?\? o\.estimated_duration/);
});
