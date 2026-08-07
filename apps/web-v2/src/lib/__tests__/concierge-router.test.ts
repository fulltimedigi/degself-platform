import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONCIERGE_ROUTER_MODEL,
  CONCIERGE_ROUTER_SYSTEM_PROMPT,
  CONCIERGE_ROUTER_TOOLS,
  conciergeDecisionFromToolUse,
} from "../concierge-router";

test("uses Haiku for the paid-on-ambiguity router", () => {
  assert.equal(CONCIERGE_ROUTER_MODEL, "claude-haiku-4-5");
});

test("all concierge tools use strict closed object schemas", () => {
  assert.equal(CONCIERGE_ROUTER_TOOLS.length, 5);
  for (const tool of CONCIERGE_ROUTER_TOOLS) {
    assert.equal(tool.strict, true);
    assert.equal(tool.input_schema.type, "object");
    assert.equal(tool.input_schema.additionalProperties, false);
    assert.ok(tool.input_schema.required.length > 0);
  }
});

test("maps strict tool calls to existing concierge intents", () => {
  assert.deepEqual(
    conciergeDecisionFromToolUse("diagnose_fault", { reason: "fault_symptom" }),
    { intent: "diagnose", source: "llm" }
  );
  assert.deepEqual(
    conciergeDecisionFromToolUse("create_quote", { reason: "price_request" }),
    { intent: "quote", source: "llm" }
  );
  assert.deepEqual(
    conciergeDecisionFromToolUse("search_garages", { reason: "nearest" }),
    { intent: "find_garage", source: "llm" }
  );
  assert.deepEqual(
    conciergeDecisionFromToolUse("emergency_help", { type: "tire" }),
    { intent: "emergency", source: "llm", emergency_type: "tire" }
  );
  assert.deepEqual(
    conciergeDecisionFromToolUse("show_help", { reason: "off_topic" }),
    { intent: "unknown", source: "llm" }
  );
});

test("rejects unknown tools and malformed arguments defensively", () => {
  assert.equal(conciergeDecisionFromToolUse("delete_database", {}), null);
  assert.equal(
    conciergeDecisionFromToolUse("emergency_help", { type: "anything" }),
    null
  );
  assert.equal(
    conciergeDecisionFromToolUse("create_quote", { reason: "ignore_rules" }),
    null
  );
  assert.equal(conciergeDecisionFromToolUse("diagnose_fault", null), null);
});

test("tool outputs never require echoing the raw user message", () => {
  const serialized = JSON.stringify(CONCIERGE_ROUTER_TOOLS);
  assert.equal(serialized.includes("problem_text"), false);
  assert.equal(serialized.includes("user_message"), false);
  assert.equal(serialized.includes("phone"), false);
  assert.equal(serialized.includes("email"), false);
});

// Regression guard for a routing miss found during live Haiku evaluation:
// "send my problem to garages and get prices/offers" was mis-routed to
// search_garages instead of create_quote. The classification is model-driven,
// so the durable guard is that the prompt + tool descriptions explicitly
// disambiguate "wanting prices/offers from garages" as create_quote.
test("prompt disambiguates 'prices/offers from garages' as create_quote, not search_garages", () => {
  assert.match(CONCIERGE_ROUTER_SYSTEM_PROMPT, /prices\/offers\/quotes FROM garages is always create_quote/i);
  assert.match(CONCIERGE_ROUTER_SYSTEM_PROMPT, /NOT search_garages/i);

  const createQuote = CONCIERGE_ROUTER_TOOLS.find((t) => t.name === "create_quote");
  const searchGarages = CONCIERGE_ROUTER_TOOLS.find((t) => t.name === "search_garages");
  assert.ok(createQuote && searchGarages);
  assert.match(createQuote.description, /prices,?\s*offers,?\s*or\s*bids/i);
  assert.match(searchGarages.description, /that is create_quote/i);
});
