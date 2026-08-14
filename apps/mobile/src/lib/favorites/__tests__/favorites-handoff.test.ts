import assert from "node:assert/strict";
import test from "node:test";
import {
  absorbableGuestIds,
  foreignClaimedIds,
  handoffCandidate,
  ownClaimIds,
  parseHandoffClaims,
  partitionHandoffCandidate,
  serializeHandoffClaims,
  shouldRollbackGuestWrite,
  withClaim,
  withoutClaim,
  type HandoffClaims,
} from "../favorites-handoff";

test("foreignClaimedIds: union of every OTHER user's claimed ids", () => {
  const claims: HandoffClaims = { A: ["a1", "a2"], B: ["b1"] };
  assert.deepEqual([...foreignClaimedIds(claims, "B")], ["a1", "a2"]);
  assert.deepEqual([...foreignClaimedIds(claims, "C")], ["a1", "a2", "b1"]);
  assert.deepEqual([...foreignClaimedIds({}, "A")], []);
});

test("ownClaimIds returns this user's claim (or empty)", () => {
  assert.deepEqual(ownClaimIds({ A: ["a1"] }, "A"), ["a1"]);
  assert.deepEqual(ownClaimIds({ A: ["a1"] }, "B"), []);
});

test("absorbableGuestIds: no claims → all guest ids (deduped, case-preserved)", () => {
  assert.deepEqual(
    absorbableGuestIds(["ChIJ_a", "ChIJ_b", "ChIJ_a"], {}, "A"),
    ["ChIJ_a", "ChIJ_b"]
  );
  assert.deepEqual(absorbableGuestIds(["Ab", "ab"], {}, "A"), ["Ab", "ab"]);
});

test("absorbableGuestIds: a foreign claim locks its ids out entirely (H2)", () => {
  const claims: HandoffClaims = { A: ["ChIJ_a", "ChIJ_b"] };
  assert.deepEqual(
    absorbableGuestIds(["ChIJ_a", "ChIJ_b", "ChIJ_new"], claims, "B"),
    ["ChIJ_new"]
  );
});

test("absorbableGuestIds: own claim ids fold back in for resume; foreign stays locked", () => {
  const claims: HandoffClaims = { A: ["ChIJ_a"], B: ["ChIJ_b"] };
  // A resumes its own claim even if already cleared from guest storage…
  assert.deepEqual(absorbableGuestIds([], claims, "A"), ["ChIJ_a"]);
  // …and never sees B's locked id.
  assert.deepEqual(
    absorbableGuestIds(["ChIJ_a", "ChIJ_b"], claims, "A"),
    ["ChIJ_a"]
  );
});

test("withClaim upserts without disturbing other owners; withoutClaim removes one", () => {
  const base: HandoffClaims = { A: ["a1"] };
  assert.deepEqual(withClaim(base, "B", ["b1", "b1"]), { A: ["a1"], B: ["b1"] });
  assert.deepEqual(withClaim(base, "A", []), {}); // empty removes A
  assert.deepEqual(withoutClaim({ A: ["a1"], B: ["b1"] }, "A"), { B: ["b1"] });
  // input not mutated
  assert.deepEqual(base, { A: ["a1"] });
});

test("partitionHandoffCandidate: valid ids insert, hard-deleted/ineligible drop (H1)", () => {
  assert.deepEqual(
    partitionHandoffCandidate(["valid1", "gone", "valid2"], ["valid1", "valid2"]),
    { toInsert: ["valid1", "valid2"], dropped: ["gone"] }
  );
  assert.deepEqual(partitionHandoffCandidate(["a", "b"], ["a", "b"]), {
    toInsert: ["a", "b"],
    dropped: [],
  });
  assert.deepEqual(partitionHandoffCandidate(["a", "b"], []), {
    toInsert: [],
    dropped: ["a", "b"],
  });
});

test("handoffCandidate: guest ids not already on the server", () => {
  assert.deepEqual(handoffCandidate(["a", "b", "c"], ["b"]), ["a", "c"]);
});

test("parse/serialize claim map round-trips and rejects malformed payloads", () => {
  const claims: HandoffClaims = { A: ["x", "x", "y"], B: ["z"] };
  assert.deepEqual(parseHandoffClaims(serializeHandoffClaims(claims)), {
    A: ["x", "y"],
    B: ["z"],
  });

  for (const bad of [null, undefined, "", "not json", "[1,2,3]", "42", '"str"']) {
    assert.deepEqual(parseHandoffClaims(bad as string | null), {});
  }
  // malformed entries are dropped, valid ones kept
  assert.deepEqual(
    parseHandoffClaims(JSON.stringify({ A: ["x"], B: "nope", "": ["y"], C: [] })),
    { A: ["x"] }
  );
});

test("shouldRollbackGuestWrite: only when write failed and no newer action", () => {
  assert.equal(shouldRollbackGuestWrite(false, 3, 3), true);
  assert.equal(shouldRollbackGuestWrite(true, 3, 3), false);
  assert.equal(shouldRollbackGuestWrite(false, 3, 4), false);
});
