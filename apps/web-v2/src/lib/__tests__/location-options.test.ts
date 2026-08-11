import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLocationOptions } from "../location-options";

test("location options drop corrupt values and punctuation-only duplicates", () => {
  const cleaned = cleanLocationOptions([
    "الجهراء،",
    "الجهراء",
    "  خيطان  ",
    "2،",
    "12219835خيطان",
    "Salmiya",
  ]);

  assert.deepEqual(new Set(cleaned), new Set(["الجهراء", "خيطان", "Salmiya"]));
});

test("location options preserve the original searchable value when no clean twin exists", () => {
  assert.deepEqual(cleanLocationOptions(["منطقة تجريبية،"]), ["منطقة تجريبية،"]);
  assert.deepEqual(cleanLocationOptions(["21 الشويخ الصناعية"]), ["21 الشويخ الصناعية"]);
});
