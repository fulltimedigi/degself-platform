import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeChatCost,
  computeWhisperCost,
  hashQuery,
  hashIp,
} from "../asaali-cost-guard";

test("hashQuery is stable for Arabic variants after normalize", () => {
  const a = hashQuery("  كــراج  ");
  const b = hashQuery("كراج");
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("hashIp changes with salt", () => {
  const prev = process.env.IP_HASH_SALT;
  process.env.IP_HASH_SALT = "salt-a";
  const a = hashIp("1.2.3.4");
  process.env.IP_HASH_SALT = "salt-b";
  const b = hashIp("1.2.3.4");
  assert.notEqual(a, b);
  assert.equal(a.length, 32);
  if (prev === undefined) delete process.env.IP_HASH_SALT;
  else process.env.IP_HASH_SALT = prev;
});

test("computeChatCost is non-negative and scales with tokens", () => {
  const cheap = computeChatCost(100, 50);
  const dear = computeChatCost(1000, 500);
  assert.ok(cheap >= 0);
  assert.ok(dear > cheap);
});

test("computeWhisperCost scales with audio seconds", () => {
  assert.ok(computeWhisperCost(60) > computeWhisperCost(30));
});
