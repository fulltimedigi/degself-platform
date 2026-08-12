import assert from "node:assert/strict";
import test from "node:test";
import { performGuestHandoff, type HandoffIO } from "../favorites-handoff-runner";
import type { HandoffClaims } from "../favorites-handoff";

// In-memory device + server the way the real app would see them. A "restart" or
// "account switch" is just another performGuestHandoff() call against the SAME
// world — durable storage (guest + claim map) persists between calls, exactly
// like AsyncStorage across a process kill.
function makeWorld(catalog: string[]) {
  const durable = { guest: [] as string[], claims: {} as HandoffClaims };
  const server = new Map<string, string[]>();
  const eligible = new Set(catalog);
  const fail = {
    select: 0,
    eligible: 0,
    insert: 0,
    writeGuestOnce: false,
    writeClaimOnce: false,
  };

  const io: HandoffIO = {
    readClaims: async () =>
      Object.fromEntries(
        Object.entries(durable.claims).map(([k, v]) => [k, [...v]])
      ),
    writeClaim: async (uid, ids) => {
      if (fail.writeClaimOnce) {
        fail.writeClaimOnce = false;
        return false;
      }
      durable.claims = { ...durable.claims, [uid]: [...ids] };
      return true;
    },
    clearClaim: async (uid) => {
      const next = { ...durable.claims };
      delete next[uid];
      durable.claims = next;
      return true;
    },
    readGuest: async () => [...durable.guest],
    writeGuest: async (ids) => {
      if (fail.writeGuestOnce) {
        fail.writeGuestOnce = false;
        return false;
      }
      durable.guest = [...ids];
      return true;
    },
    selectServer: async (uid) => {
      if (fail.select > 0) {
        fail.select -= 1;
        throw new Error("net");
      }
      return [...(server.get(uid) ?? [])];
    },
    fetchEligible: async (ids) => {
      if (fail.eligible > 0) {
        fail.eligible -= 1;
        throw new Error("net");
      }
      return ids.filter((id) => eligible.has(id));
    },
    insertServer: async (uid, ids) => {
      if (fail.insert > 0) {
        fail.insert -= 1;
        throw new Error("net");
      }
      const cur = new Set(server.get(uid) ?? []);
      ids.forEach((i) => cur.add(i));
      server.set(uid, [...cur]);
    },
  };

  return { durable, server, io, fail };
}

test("guest → A: all valid ids transfer, guest cleared, claim released", async () => {
  const w = makeWorld(["a", "b"]);
  w.durable.guest = ["a", "b"];
  const r = await performGuestHandoff("A", w.io);
  assert.equal(r.done, true);
  assert.deepEqual(w.server.get("A"), ["a", "b"]);
  assert.deepEqual(w.durable.guest, []);
  assert.deepEqual(w.durable.claims, {});
});

test("H1: one hard-deleted id never blocks the valid ids", async () => {
  const w = makeWorld(["a", "b"]); // "gone" is not in the catalog (FK would fail)
  w.durable.guest = ["a", "gone", "b"];
  const r = await performGuestHandoff("A", w.io);
  assert.equal(r.done, true);
  assert.deepEqual(w.server.get("A"), ["a", "b"]); // valid ids transferred
  assert.deepEqual(w.durable.guest, []); // fully accounted, cleared
  assert.deepEqual(w.durable.claims, {});
});

test("H1: all-ineligible snapshot completes without a retry storm", async () => {
  const w = makeWorld([]); // nothing exists
  w.durable.guest = ["gone1", "gone2"];
  const r = await performGuestHandoff("A", w.io);
  assert.equal(r.done, true); // terminal, not an endless retry
  assert.equal(w.server.get("A"), undefined);
  assert.deepEqual(w.durable.guest, []);
  assert.deepEqual(w.durable.claims, {});
});

test("transient select failure is retryable and leaves nothing written", async () => {
  const w = makeWorld(["a"]);
  w.durable.guest = ["a"];
  w.fail.select = 1;
  const first = await performGuestHandoff("A", w.io);
  assert.equal(first.done, false);
  assert.deepEqual(w.durable.claims, {}); // claim only written after select succeeds
  assert.deepEqual(w.durable.guest, ["a"]);
  const second = await performGuestHandoff("A", w.io);
  assert.equal(second.done, true);
  assert.deepEqual(w.server.get("A"), ["a"]);
});

test("transient insert failure keeps the claim and resumes on retry", async () => {
  const w = makeWorld(["a", "b"]);
  w.durable.guest = ["a", "b"];
  w.fail.insert = 1;
  const first = await performGuestHandoff("A", w.io);
  assert.equal(first.done, false);
  assert.deepEqual(w.durable.claims, { A: ["a", "b"] }); // persists
  assert.deepEqual(w.durable.guest, ["a", "b"]); // not cleared
  const second = await performGuestHandoff("A", w.io);
  assert.equal(second.done, true);
  assert.deepEqual(w.server.get("A"), ["a", "b"]);
  assert.deepEqual(w.durable.guest, []);
  assert.deepEqual(w.durable.claims, {});
});

test("writeClaim failure aborts BEFORE any server write (never write server without a durable claim)", async () => {
  const w = makeWorld(["a"]);
  w.durable.guest = ["a"];
  w.fail.writeClaimOnce = true;
  const r = await performGuestHandoff("A", w.io);
  assert.equal(r.done, false);
  assert.equal(w.server.get("A"), undefined); // nothing written to the server
  assert.deepEqual(w.durable.claims, {});
  assert.deepEqual(w.durable.guest, ["a"]); // snapshot intact for retry
});

test("H2 (crash after server write, before guest cleanup) → a different account cannot inherit the snapshot", async () => {
  const w = makeWorld(["a", "b"]);
  w.durable.guest = ["a", "b"];
  // Crash simulation: the server insert lands, then the guest-clear fails and the
  // process dies. The durable claim for A survives with guest still populated.
  w.fail.writeGuestOnce = true;
  const crashed = await performGuestHandoff("A", w.io);
  assert.equal(crashed.done, false);
  assert.deepEqual(w.server.get("A"), ["a", "b"]); // A's write happened
  assert.deepEqual(w.durable.guest, ["a", "b"]); // NOT cleared (crash)
  assert.deepEqual(w.durable.claims, { A: ["a", "b"] }); // durable

  // A DIFFERENT user B signs in on the same device.
  const bResult = await performGuestHandoff("B", w.io);
  assert.equal(bResult.done, true);
  assert.equal(w.server.get("B"), undefined); // ← B inherited NONE of A's favorites
  assert.deepEqual(w.durable.claims, { A: ["a", "b"] }); // still locked for A

  // A comes back and the transfer completes idempotently.
  const aResume = await performGuestHandoff("A", w.io);
  assert.equal(aResume.done, true);
  assert.deepEqual(w.server.get("A"), ["a", "b"]);
  assert.deepEqual(w.durable.guest, []);
  assert.deepEqual(w.durable.claims, {});
});

test("H2 (crash after claim, before insert) → B still cannot take A's snapshot", async () => {
  const w = makeWorld(["a", "b"]);
  w.durable.guest = ["a", "b"];
  w.fail.insert = 1; // insert fails right after the claim is durably written
  const crashed = await performGuestHandoff("A", w.io);
  assert.equal(crashed.done, false);
  assert.equal(w.server.get("A"), undefined); // nothing on the server yet
  assert.deepEqual(w.durable.claims, { A: ["a", "b"] });

  const bResult = await performGuestHandoff("B", w.io);
  assert.equal(bResult.done, true);
  assert.equal(w.server.get("B"), undefined); // B absorbs nothing of A's
});

test("new guest favorites created after A logs out DO migrate to the next user B", async () => {
  const w = makeWorld(["a", "b", "c"]);
  w.durable.guest = ["a"];
  await performGuestHandoff("A", w.io); // A absorbs [a]
  assert.deepEqual(w.server.get("A"), ["a"]);
  assert.deepEqual(w.durable.guest, []);

  // A signs out; a guest saves a brand-new favorite before B signs in.
  w.durable.guest = ["c"];
  const bResult = await performGuestHandoff("B", w.io);
  assert.equal(bResult.done, true);
  assert.deepEqual(w.server.get("B"), ["c"]); // B gets the new one …
  assert.equal((w.server.get("B") ?? []).includes("a"), false); // … but none of A's
  assert.deepEqual(w.durable.guest, []);
});

test("foreign-claimed id stays locked while the current user's own new id transfers", async () => {
  const w = makeWorld(["aClaimed", "bNew"]);
  w.durable.guest = ["aClaimed", "bNew"];
  w.durable.claims = { A: ["aClaimed"] }; // A left a claim behind
  const r = await performGuestHandoff("B", w.io);
  assert.equal(r.done, true);
  assert.deepEqual(w.server.get("B"), ["bNew"]); // only B's own id
  assert.deepEqual(w.durable.guest, ["aClaimed"]); // A's claimed id preserved
  assert.deepEqual(w.durable.claims, { A: ["aClaimed"] }); // still locked
});

test("idempotent replay: running a completed handoff again is a no-op", async () => {
  const w = makeWorld(["a"]);
  w.durable.guest = ["a"];
  await performGuestHandoff("A", w.io);
  const again = await performGuestHandoff("A", w.io);
  assert.equal(again.done, true);
  assert.deepEqual(w.server.get("A"), ["a"]);
  assert.deepEqual(w.durable.guest, []);
});
