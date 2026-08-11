import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCustomSections } from "../../components/WorkshopCustomSectionsEditor";

test("custom workshop sections accept complete labels and values", () => {
  assert.equal(
    validateCustomSections([
      { title: "الخدمات", items: [{ label: "تغيير زيت", value: "8 د.ك" }] },
    ]),
    null
  );
});

test("custom workshop sections reject incomplete manual fields", () => {
  assert.match(
    validateCustomSections([{ title: "", items: [{ label: "خدمة", value: "قيمة" }] }]) ?? "",
    /اسم الخانة/
  );
  assert.match(
    validateCustomSections([{ title: "الخدمات", items: [{ label: "خدمة", value: "" }] }]) ?? "",
    /اسمًا وقيمة/
  );
});
