# ADR-0002 — Direct Supabase vs Server API boundary

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `f9239dd`

## Context
The mobile app shares the Supabase backend. Some data is safe to read/write directly from the client under RLS; other operations require server authority (secrets, privileged transitions, hidden business rules, cost control).

## Decision
Use **Direct Supabase (publishable key + RLS)** for an interaction **only if all** hold:
- the publishable/anon key is sufficient (no secret);
- **RLS fully defines authorization** for the operation;
- no privileged mutation or server-derived field can be manipulated by the client;
- no hidden business rule (scoring/ranking/routing) would be bypassed;
- no material rate/cost-abuse boundary is bypassed.

Otherwise the interaction goes through a **Server API** (service-role / Anthropic / WABA / authoritative state transitions / anti-abuse / idempotent orchestration).

## Current classification `[REPO]`
**DIRECT (Supabase + RLS):**
- Workshop reads (list/detail/map points) — `workshops` RLS `select using(true)`.
- Favorites — `user_favorites` RLS (select/insert/delete own); proven live (cross-user insert rejected 42501, anon locked out).
- Profile — `profiles` RLS (select/update own).
- Approved review **reads** — RLS limits to `status='approved'`.

**SERVER (endpoint / service-role):**
- Account deletion (`/api/account/delete`) — service-role + guards; mobile via a Bearer auth adapter to the **same** operation (architecture contract Correction 6).
- Ask DEGSELF (`/api/asaali`) — Anthropic secret + cost guard.
- Quote creation (`/api/quotes`) — server-authoritative routing/delivery.
- Quote routing / delivery — service-role + WABA (server/background only).
- Offer state transitions (`/offers/[token]/accept`) — authoritative, token-gated.
- Review **submission** (`/api/reviews`) — anonymous, moderated server-side.
- WABA — server-only integration.
- Future push registration/events — server authority + device-token ownership.

## Consequences
- Search **ranking/enrichment** is a hidden business rule → not reproduced client-side; owned by `packages/domain` or `/api/search` (OD-04).
- The account-deletion route must gain a Bearer transport without forking its logic.
- Direct paths depend on RLS correctness; RLS changes are reviewed as security-affecting.
