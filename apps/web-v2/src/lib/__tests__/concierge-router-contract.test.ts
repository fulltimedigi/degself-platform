import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(
  join(process.cwd(), "src/app/api/concierge/route.ts"),
  "utf8"
);
const chat = readFileSync(
  join(process.cwd(), "src/components/concierge/ConciergeChat.tsx"),
  "utf8"
);

test("router is paid-on-ambiguity and protected by shared cost guards", () => {
  assert.match(route, /isWithinBudget\(\)/);
  assert.match(route, /"concierge_router"/);
  assert.match(route, /failClosed:\s*true/);
  assert.match(route, /CONCIERGE_ROUTER_MODEL/);
  assert.match(route, /tool_choice:\s*\{[\s\S]*?type:\s*"any"[\s\S]*?\}/);
  assert.match(route, /disable_parallel_tool_use:\s*true/);
});

test("router endpoint classifies only and cannot perform concierge side effects", () => {
  for (const forbidden of [
    "NewQuoteForm",
    "searchWorkshops",
    "searchConciergeWorkshops",
    "getSupabaseAdmin",
    "/api/quotes",
    "recommended_workshops",
  ]) {
    assert.equal(
      route.includes(forbidden),
      false,
      `router route must not contain side-effect capability: ${forbidden}`
    );
  }
});

test("usage logging does not persist raw concierge text or tool arguments", () => {
  assert.match(route, /meta:\s*\{\s*feature:\s*"concierge_router"\s*\}/);
  assert.doesNotMatch(route, /meta:\s*\{[^}]*text\s*:/);
  assert.doesNotMatch(route, /meta:\s*\{[^}]*locale\s*:/);
  assert.doesNotMatch(route, /meta:\s*\{[^}]*tool/i);
});

test("client calls router only after deterministic detection and preserves diagnosis follow-ups", () => {
  const detectAt = chat.indexOf("detectConciergeIntent(text)");
  const routeAt = chat.indexOf("routeAmbiguousIntent(text)");
  assert.ok(detectAt >= 0);
  assert.ok(routeAt > detectAt);
  assert.match(chat, /lastDiagnosis\?\.status === "needs_more_info"/);
  assert.match(chat, /router:\s*"diagnosis_followup"/);
  assert.match(chat, /if \(intent === "unknown"\)[\s\S]*routeAmbiguousIntent\(text\)/);
});

test("router failure preserves an available diagnosis fallback", () => {
  assert.match(chat, /intent = "diagnose";\s*routerSource = "fallback";/);
  assert.match(chat, /await runDiagnosis\(text\)/);
});
