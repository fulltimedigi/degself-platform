# ADR-0006 — Account-deletion auth transport (resolves OD-02)

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `c47b6da` · **PR:** M1

## Context
`/api/account/delete` was written for the web: cookie (SSR) authentication + a browser **Origin** allow-list (CSRF) + deterministic session-cookie clearing. Native clients authenticate with a **Bearer** Supabase access token and have no browser Origin, so they would be rejected. App-store rules require in-app account deletion. The rule (architecture-contract Correction 6): **one canonical deletion operation**, never a second implementation.

## Decision
**Extract the destructive sequence into a canonical, transport-agnostic operation** — `performAccountDeletion()` in `apps/web-v2/src/lib/account-deletion-core.ts`. It runs, in the original order, for any already-authenticated identity: typed confirmation → recent-auth → fail-closed rate limit → privileged/claimed blockers → `auth.admin.deleteUser`. It returns `{ ok }` / `{ ok:false, code, status }`.

**One route, two transports** (`app/api/account/delete/route.ts`), chosen by the presence of a Bearer header:
- **Web (cookie):** unchanged behavior — resolves the user from the SSR cookie session, **still enforces the same-origin Origin allow-list**, and clears the session cookie deterministically on success.
- **Mobile (Bearer):** `Authorization: Bearer <supabase access token>`, verified server-side by `getUserFromBearer()` (publishable-key client → `auth.getUser(token)`; Supabase validates signature/expiry/revocation). No Origin check.

Identity is **always** server-derived — never `user_id`/role/email from the body.

### Sub-decisions
- **CSRF (Bearer):** not applicable. A cookie is auto-attached cross-site (hence the Origin allow-list); a Bearer token is not — an attacker cannot forge the victim's token, and supplying their own only deletes their own account. So routing to Bearer when the header is present is safe, and the cookie path keeps its Origin defense.
- **Recent-auth on native:** the same `isAuthFresh(last_sign_in_at, now, 10min)` gate, using the **server** `last_sign_in_at` from the verified token. Token *refresh* does not advance `last_sign_in_at`, so a long-lived refreshed native session still requires a fresh Google/Apple sign-in to delete — identical semantics to web. Stable code `AUTH_TOO_OLD`; the app drives a provider reauth (OAuth users have no password).
- **Rate limit:** composite key `${userId}:${clientIp}` (server-derived identity + network signal), `failClosed=true`, applied to both transports. Per-user scoping removes shared-NAT cross-account collisions (a real risk on carrier networks) while keeping the per-hour ceiling for any single account. This is the only intentional change to web behavior and is strictly more correct for a per-account destructive action.

## Verification
- Web-v2 typecheck + 115 tests green (incl. new `account-deletion-transport.test.ts`: Bearer selection + canonical guard-order/status contract).
- Retention model unchanged (035): auth identity deleted; `profiles` + `user_favorites` cascade; `community_mentions.matched_by` → NULL; admin/claimed blocked.

## Consequences
- The web deletion contract (response shape, codes, Origin/CSRF, recent-auth, blockers, session clearing) is preserved; the web UI needs no change.
- Real mobile Bearer deletion end-to-end requires a running session (owner credentials/dev build) — verified at the code/contract level here, device-verified later.
- Any future deletion rule changes once, in the core, for both clients.
