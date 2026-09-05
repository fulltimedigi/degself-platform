# ADR-0009 — Durable, account-isolated guest→authenticated favorites handoff

**Status:** Accepted · **Date:** 2026-08-12 · **PR:** #142

## Context

When a guest signs in, their device-local favorites (AsyncStorage) must be
merged into their authenticated `public.user_favorites` rows. Two defects were
found in the first implementation:

- **H1 — FK-poisoned transfer.** `user_favorites.place_id` is a foreign key to
  `workshops(place_id)` (migration 035). The handoff inserted all guest ids in a
  single atomic `upsert([...])`. One stale id — a workshop hard-deleted from the
  catalog after the guest saved it — raised `23503` and aborted the whole batch,
  so *no* favorites migrated, the guest store was never cleared, and every app
  launch retried and failed again.
- **H2 — cross-account contamination.** The guest store is a single device-global
  key. The insert and the guest-clear are two separate awaits. If the process
  died (or the clear failed, or the user signed out) between them, the guest
  store still held user A's ids after they were written to A's account. A
  different user B signing in next would then read that snapshot and write A's
  favorites into B's account, server-side.

## Decision

### H1 — existence check before insert (FK-matching, not visibility-matching)

Before inserting, the candidate ids (guest ids not already on the server) are
checked for **existence** against `/api/mobile/workshops?mode=exists&ids=…`,
which returns the ids that exist in `workshops` **regardless of public
visibility** — exactly the condition the foreign key enforces
(`user_favorites.place_id → workshops.place_id`). Only existing ids are inserted;
truly non-existent (hard-deleted) ids are **deterministically dropped**. This
eliminates FK violations by construction and removes the retry storm, while
still migrating favorites for workshops that currently exist but are temporarily
hidden (`active=false`) — those are not silently lost. The existence endpoint
exposes nothing new: `workshops` is already anon-readable by `place_id`. A
transient failure of the check never drops ids — it returns "retry", so the
snapshot is preserved.

### H2 — a durable, per-user claim map recorded before any server write

Handoff progress is tracked in a **durable claim map** in AsyncStorage, keyed by
Supabase user id: `{ [userId]: string[] }`. The invariant:

1. Read the claim map + guest ids. The absorbable snapshot **excludes every id
   claimed by a different identity** — so a snapshot owned by A is invisible to
   B's handoff.
2. Load the user's server favorites.
3. **Write this user's claim entry BEFORE any server write.** From this point a
   crash cannot expose the snapshot to another account, because the durable claim
   keeps it out of every other user's absorbable set.
4. Insert only the eligible subset (H1).
5. Clear exactly the snapshot from guest storage (loss-safe: ids added *after*
   the snapshot survive).
6. Release **only this user's** claim entry last.

Any transient failure stops with the claim intact; the same user resumes
idempotently (the composite PK makes re-inserts no-ops), while other users stay
locked out. The claim is a **map, not a single slot**, so if A's transfer is
interrupted and B then signs in with B's own guest favorites, B records its claim
without erasing A's lock.

The claim decision and its durable write happen in **one locked, atomic
read-modify-write** (`claimAbsorbableSnapshot`): the absorbable snapshot is
computed from the same claim-map read that persists the claim. This closes the
TOCTOU where two overlapping handoffs (a fast account switch across the
server-load await) could each absorb the same still-unclaimed ids — whichever
runs second sees the first's claim and excludes those ids, so no id is written to
two accounts. The map stores only user ids and public `place_id`s — never a token
or secret; `allowBackup:false` keeps it off device backups.

### Crash-safety proof sketch

For any crash point after step 3, the durable claim `{A: snapshot}` survives.
On the next launch: if **A** returns, `absorbableGuestIds` folds A's own claim
back in and the transfer resumes idempotently; if **B** signs in,
`absorbableGuestIds` subtracts A's claimed ids, so B's insert set cannot contain
any of A's favorites — regardless of whether A's server write had completed. B
never touches A's claim entry. Therefore A→B contamination is impossible at
every crash point between the Supabase write and the guest clear.

## Consequences

- The pure decision logic (`favorites-handoff.ts`) and the injected-IO
  orchestrator (`favorites-handoff-runner.ts`) are unit-tested against in-memory
  fakes that simulate crash / restart / account switch, without React Native,
  AsyncStorage, or Supabase.
- One extra read (existence check) precedes a transfer that has ids to insert.
- Only hard-deleted (non-existent) ids are dropped; existing-but-hidden favorites
  still migrate and reappear if the workshop is re-listed.
- Known residuals (accepted): a foreign claim whose owner never returns keeps its
  guest ids locked to that owner (storage-only, no isolation break); and
  `clientIp`'s off-Vercel `X-Forwarded-For` fallback is spoofable — the search
  rate limiter is safe on the actual Vercel edge and fails open regardless.
- Behavior is CI-VERIFIED (unit tests) only; the end-to-end crash/account-switch
  matrix still requires a fresh real-device pass before release.
