import { test } from "node:test";
import assert from "node:assert/strict";
import { ASAALI_CONFIG } from "../asaali-cost-guard";

test("monthly AI budget stays hard-capped", () => {
  assert.ok(ASAALI_CONFIG.MONTHLY_BUDGET_USD > 0);
  assert.ok(ASAALI_CONFIG.MONTHLY_BUDGET_USD <= 50);
  assert.ok(ASAALI_CONFIG.RATE_LIMIT_PER_HOUR <= 10);
});

test("CallMeBot helper uses AbortSignal timeout (source contract)", async () => {
  // Keep the timeout contract visible in code review / regressions.
  const fs = await import("node:fs/promises");
  const path = new URL("../callmebot.ts", import.meta.url);
  const src = await fs.readFile(path, "utf8");
  assert.match(src, /AbortSignal\.timeout/);
  assert.match(src, /CALLMEBOT_TIMEOUT_MS|4_000|4000/);
});

test("rate-limit module exposes failClosed option", async () => {
  const fs = await import("node:fs/promises");
  const path = new URL("../rate-limit.ts", import.meta.url);
  const src = await fs.readFile(path, "utf8");
  assert.match(src, /failClosed/);
  assert.match(src, /failClosed \? false : true/);
});

test("default search Path D no longer pages full catalog in a loop", async () => {
  const fs = await import("node:fs/promises");
  const path = new URL("../workshops.ts", import.meta.url);
  const src = await fs.readFile(path, "utf8");
  assert.doesNotMatch(src, /from < FULL_CATALOG_CAP/);
  assert.doesNotMatch(src, /const FULL_CATALOG_CAP/);
  assert.match(src, /default\/enriched/);
  assert.match(src, /JS_CANDIDATE_CAP/);
});
