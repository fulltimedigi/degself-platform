import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupePreserveCase,
  parseFavorites,
  serializeFavorites,
  unionFavorites,
  handoffInserts,
  remainingAfterClear,
} from "../favorites-sync";

// Parity vectors mirror apps/web-v2's favorites-sync tests — the mobile port
// must behave identically. place_id is CASE-SENSITIVE and opaque.
const A = "ChIJAbc123";
const B = "ChIJxyz789";
const A_LOWER = "chijabc123"; // a DIFFERENT id — must never collapse into A

test("dedupePreserveCase keeps first-seen order and exact case", () => {
  assert.deepEqual(dedupePreserveCase([A, A, B, A]), [A, B]);
  assert.deepEqual(dedupePreserveCase([A, A_LOWER]), [A, A_LOWER]);
  assert.deepEqual(dedupePreserveCase([A, "", B, "  "]), [A, B, "  "]);
  // @ts-expect-error — runtime junk must be dropped, not throw
  assert.deepEqual(dedupePreserveCase([A, 1, null, B, undefined]), [A, B]);
});

test("parseFavorites degrades malformed payloads to []", () => {
  assert.deepEqual(parseFavorites(JSON.stringify([A, B, A])), [A, B]);
  assert.deepEqual(parseFavorites(null), []);
  assert.deepEqual(parseFavorites(undefined), []);
  assert.deepEqual(parseFavorites("not json"), []);
  assert.deepEqual(parseFavorites(JSON.stringify({ a: 1 })), []);
  assert.deepEqual(parseFavorites(JSON.stringify("nope")), []);
});

test("serializeFavorites round-trips through parseFavorites (deduped)", () => {
  assert.deepEqual(parseFavorites(serializeFavorites([A, B, A])), [A, B]);
});

test("unionFavorites keeps server order then new guest ids; never drops server", () => {
  assert.deepEqual(unionFavorites([A], [B, A]), [A, B]);
  assert.deepEqual(unionFavorites([A, B], []), [A, B]); // absent-locally never lost
  assert.deepEqual(unionFavorites([], [A, A, B]), [A, B]);
});

test("handoffInserts returns only guest ids missing on the server (idempotent)", () => {
  assert.deepEqual(handoffInserts([A, B], [A]), [B]);
  assert.deepEqual(handoffInserts([A], [A, B]), []); // replay → nothing to insert
  assert.deepEqual(handoffInserts([A, A_LOWER], [A]), [A_LOWER]); // case-sensitive
});

test("remainingAfterClear preserves ids added during an in-flight transfer", () => {
  // snapshot was [A]; a new id B arrived mid-transfer → B must survive the clear.
  assert.deepEqual(remainingAfterClear([A, B], [A]), [B]);
  // nothing new arrived → store fully cleared of the snapshot
  assert.deepEqual(remainingAfterClear([A], [A]), []);
});
