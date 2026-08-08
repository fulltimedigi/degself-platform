# ADR-0003 — Shared domain extraction policy

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `f9239dd`

## Context
Some deterministic logic (Arabic normalization, search synonyms/stopwords, ranking/facets, enrichment accessors, `isOpenNow`, geo helpers) currently lives in `apps/web-v2/src/lib` and would otherwise be reimplemented — divergently — in mobile. Premature monorepo abstraction is also a real risk.

## Decision
**No speculative shared packages.** Extract into `packages/domain` **only** deterministic logic **proven to be needed by both clients**, at the moment the second consumer needs it (expected: **M2**, when mobile search/detail lands). Prefer duplicated UI over a shared UI package; prefer shared **deterministic business rules** over duplicated ranking/normalization/validation.

## Rule for each proposed shared module
Answer "why must this be shared **now**?" If the only answer is "both might need it someday," **do not extract**.

## Likely future `packages/domain` candidates
`normalizeArabic`, search synonyms + stopwords + `expandToken`, deterministic ranking/facet filters, enrichment data + accessors, `isOpenNow`, haversine/geo helpers.

## Hard constraints (must NOT appear in `packages/domain`)
`next/*` runtime, `cookies()`/`headers()`, `unstable_cache`, DOM/browser APIs, Node-only APIs, Supabase clients, server secrets, next-intl server wrappers, **UI components**.

## A separate `packages/contracts`
TypeScript types + schemas for server endpoints (quote create, asaali request/response, account-delete) may be shared once web + mobile both call them. Same discipline: types/schemas only, no runtime coupling.

## Consequences
- M0 does **not** create `packages/domain`. `apps/mobile` stays self-contained until extraction is justified.
- Extraction is its own reviewable step (part of M2), not a side effect of M0.
