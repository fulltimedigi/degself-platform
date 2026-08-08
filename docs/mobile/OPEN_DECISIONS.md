# DEGSELF Mobile — Open Decisions Register

**Date:** 2026-08-08 · **Baseline:** master `f9239dd`. These are unresolved decisions. None blocks **M0**; each blocks the PR(s) noted. Resolve as an accepted ADR (or a recorded decision) before starting a blocked PR.

Legend: `[REPO]` repo evidence · `[EXT]` external primary source.

---

## OD-01 — Quote Ownership Model  ·  Status: OPEN  ·  Blocks: **M4** (create), M5 (My Quotes UI)
**Why:** `quotes` has **no `user_id`**; customer identity today = `customer_phone` + opaque `customer_token` `[REPO]`. A signed-in mobile user cannot securely retrieve "my quotes". Per architecture-contract Correction 5, the decision must land **before M4**, so we never create authenticated mobile quotes under an insufficient model.
**Options:** (a) add `quotes.user_id` + claim-by-phone-OTP + RLS; (b) verified account↔phone link, then query by verified phone; (c) MVP = create + view-via-deep-link (`customer_token`) only, no account history.
**Evidence needed before decision:** privacy/abuse review of phone-based claiming; RLS design for owner reads; migration cost. **Do not invent `user_id` silently.**
**Decision deadline:** before PR-M4 kickoff.

## OD-02 — Mobile account-deletion auth transport  ·  Status: OPEN  ·  Blocks: M1 completion / store submission
**Why:** `/api/account/delete` authenticates via **SSR cookies** and enforces a **browser Origin** allow-list `[REPO]`; native clients send a Bearer JWT and have no browser Origin → would be rejected. Store rules require in-app deletion.
**Decision (shape, per Correction 6):** add a **Bearer-JWT auth adapter** to the **same** canonical operation (shared recent-auth, typed confirmation, rate limit, admin/claimed blockers, `auth.admin.deleteUser`, error codes). No second implementation. Open sub-choices: CSRF/replay protection for the Bearer path; recent-auth signal on native.
**Decision deadline:** during PR-M1.

## OD-03 — Sign in with Apple  ·  Status: OPEN  ·  Blocks: M1 completion / iOS submission
**Why:** Apple 4.8 requires an equivalent private login alongside Google Sign-In `[EXT]`; top rejection risk.
**Options:** `expo-apple-authentication` + Supabase Apple provider (iOS), Google elsewhere.
**Evidence needed:** Supabase Apple provider config; Apple Developer capability. **Deadline:** during PR-M1.

## OD-04 — Search / domain extraction boundary  ·  Status: OPEN  ·  Blocks: M2
**Why:** ranking/enrichment/synonyms live in `workshops.ts` + bundled JSON + `unstable_cache` `[REPO]`; must not be reimplemented divergently.
**Options:** (a) extract `packages/domain` (pure) and query Supabase directly from mobile then rank client-side; (b) add `/api/search` returning ranked results (keeps enrichment server-side/private).
**Evidence needed:** size/sensitivity of enrichment data; parity test vs web. **Deadline:** before PR-M2.

## OD-05 — Ask DEGSELF per-user/device quota  ·  Status: OPEN  ·  Blocks: M3 production readiness
**Why:** current guard is IP rate-limit + monthly budget `[REPO]`; IP is weak on native (carrier NAT) → cost-abuse risk.
**Options:** per-authenticated-user quota; per-device quota (attestation); tighter anonymous cap. Keep one canonical endpoint for web+mobile. **Deadline:** during PR-M3.

## OD-06 — UGC / review moderation  ·  Status: OPEN  ·  Blocks: native review submission / display
**Why:** if reviews are shown/submitted in-app, Apple 1.2 needs filter + report + block + EULA + published contact `[EXT]`. Today reviews are anonymous + manually moderated `[REPO]`.
**Deadline:** before reviews enter the native product.

## OD-07 — Push provider & device-token model  ·  Status: OPEN  ·  Blocks: M6
**Why:** no push today; no `device_tokens` table `[REPO]`.
**Options:** Expo Push first (≤600 notif/s) → FCM/APNs or OneSignal later. Device tokens owned by `auth.users`; logout + account deletion clear tokens; multi-device handling. Push must not replace WABA garage delivery. **Deadline:** before PR-M6.

## OD-08 — Deep-link / Universal Link security policy  ·  Status: OPEN  ·  Blocks: M6
**Why:** no `.well-known/apple-app-site-association` or `assetlinks.json` present `[REPO]`. Canonical HTTPS URLs stay primary; tokenized quote/offer links must remain server-verified, not blindly mapped into the app.
**Deadline:** before PR-M6.

## OD-09 — Mobile analytics identity  ·  Status: OPEN  ·  Blocks: any identity beyond anonymous events
**Why:** web analytics are anonymous (random `distinct_id`, `$process_person_profile:false`) `[REPO]`. Whether mobile stays anonymous or adds opt-in per-user identity is a privacy/store decision.
**Deadline:** before any non-anonymous analytics.

---

## Owner-gated items (not ADRs; require explicit authorization)
- **App identifiers** (iOS bundle id / Android applicationId / Expo scheme) — publish-once identity; must be confirmed by the owner before locking (see architecture contract §9).
- **EAS Update / production OTA** and **EAS credentials / store submission / developer-account actions** — remain OPEN until explicitly approved; M0 may prepare build config only.
