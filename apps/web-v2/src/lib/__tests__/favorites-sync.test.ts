import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupePreserveCase,
  parseFavorites,
  unionFavorites,
  handoffInserts,
  remainingAfterClear,
} from "../favorites-sync";

// place_id is CASE-SENSITIVE and opaque — every helper must preserve it verbatim.
const A = "ChIJAbc123";
const B = "ChIJxyz789";
const A_LOWER = "chijabc123"; // a DIFFERENT id — must never collapse into A

test("dedupePreserveCase keeps first-seen order and exact case", () => {
  assert.deepEqual(dedupePreserveCase([A, A, B, A]), [A, B]);
  // case differences are distinct ids, never merged
  assert.deepEqual(dedupePreserveCase([A, A_LOWER]), [A, A_LOWER]);
  // drops empty / non-string noise
  assert.deepEqual(
    dedupePreserveCase([A, "", B] as string[]),
    [A, B]
  );
});

test("parseFavorites degrades any malformed payload to []", () => {
  assert.deepEqual(parseFavorites(null), []);
  assert.deepEqual(parseFavorites(undefined), []);
  assert.deepEqual(parseFavorites(""), []);
  assert.deepEqual(parseFavorites("not json"), []);
  assert.deepEqual(parseFavorites("{}"), []); // object, not array
  assert.deepEqual(parseFavorites('"a string"'), []);
  assert.deepEqual(parseFavorites("123"), []);
  // arrays with junk elements: keep only non-empty strings, deduped
  assert.deepEqual(parseFavorites(JSON.stringify([A, 1, null, B, A])), [A, B]);
  assert.deepEqual(parseFavorites(JSON.stringify([A, A_LOWER])), [A, A_LOWER]);
});

test("unionFavorites is a UNION: never drops a server favorite absent locally", () => {
  assert.deepEqual(unionFavorites([A], [B]), [A, B]);
  // server ordering first, then new guest ids
  assert.deepEqual(unionFavorites([A, B], [B, A]), [A, B]);
  // server-only favorite survives even when guest is empty
  assert.deepEqual(unionFavorites([A], []), [A]);
  // guest-only favorite is added
  assert.deepEqual(unionFavorites([], [A]), [A]);
});

test("handoffInserts is idempotent and inserts only new guest ids", () => {
  // fresh guest ids not yet on server
  assert.deepEqual(handoffInserts([A, B], []), [A, B]);
  // replaying with the same server state yields nothing
  assert.deepEqual(handoffInserts([A, B], [A, B]), []);
  // only the genuinely new id is inserted
  assert.deepEqual(handoffInserts([A, B], [A]), [B]);
  // case-sensitive: A_LOWER is a new id even though A exists
  assert.deepEqual(handoffInserts([A, A_LOWER], [A]), [A_LOWER]);
  // dedupes guest snapshot before diffing
  assert.deepEqual(handoffInserts([B, B, A], [A]), [B]);
});

test("remainingAfterClear is loss-safe: keeps ids added during the transfer", () => {
  const snapshot = [A, B];
  // an id (C) that appeared while the transfer was in flight must survive
  const C = "ChIJnew555";
  assert.deepEqual(remainingAfterClear([A, B, C], snapshot), [C]);
  // exact snapshot present → fully cleared
  assert.deepEqual(remainingAfterClear([A, B], snapshot), []);
  // nothing to clear when guest already drained
  assert.deepEqual(remainingAfterClear([], snapshot), []);
  // case-sensitive: A_LOWER is not in the snapshot, so it stays
  assert.deepEqual(remainingAfterClear([A, A_LOWER], [A]), [A_LOWER]);
});
