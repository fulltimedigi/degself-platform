# ADR-0008 — Canonical mobile workshop read API

**Status:** Accepted · **Date:** 2026-08-11 · **Resolves:** OD-04 · **Scope:** M2

## Context

Web search combines Arabic normalization, synonyms, audited catalog filters, database ranking, and a private review-enrichment overlay. Reimplementing that pipeline in React Native would create ranking drift and bundle internal enrichment data into every installed app. Direct Supabase reads are safe under public RLS, but they cannot reproduce the canonical result order without duplicating the web pipeline.

## Decision

The mobile app reads workshops through `GET /api/mobile/workshops`:

- list/search: `q`, `limit`, `offset`;
- saved hydration: ordered, bounded `ids`;
- detail: case-sensitive `place_id`.

The route calls the existing `searchWorkshops` / `getWorkshop` operations, enforces live automotive scope, bounds all inputs, and returns a purpose-built public DTO. Internal search blobs, audit fields, ranking values, partner notes, claims, and enrichment records are never returned. Responses are CDN-cacheable and failures expose only stable public error codes.

Mobile retains no Supabase service secret and sends no authenticated session to this public read endpoint. Authenticated favorites remain direct Supabase operations protected by RLS.

## Consequences

- Web and mobile use one ranking source of truth.
- Search improvements reach both clients without a mobile release.
- No `packages/domain` extraction or search-state dependency is needed for M2.
- The server endpoint must remain backwards-compatible for released mobile versions.
- If offline full-catalog search becomes a product requirement, revisit domain extraction and data distribution in a new ADR.
