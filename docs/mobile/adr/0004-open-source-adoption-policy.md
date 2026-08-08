# ADR-0004 — Open-source adoption gate

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `f9239dd`

## Context
Mobile pulls in an ecosystem of third-party packages/templates. Adoption by hype, stars, or template default is a real risk (the audit corrected four such assumptions).

## Decision
**Every strategic third-party dependency must pass this gate BEFORE installation**, evaluated against **current primary sources**. This covers deliberate strategic choices (frameworks, UI kits, state/storage/query libs, auth/push/build tooling) — not every tiny transitive npm package.

For each candidate verify: package/repo identity; latest stable version + date; license; maintenance activity; Expo-SDK compatibility; React Native New-Architecture compatibility; iOS + Android support; permissions/plugins introduced; native/prebuild requirement; security advisories (GHSA/`npm audit`); open critical issues; bundle/runtime impact; lock-in + exit strategy; and **the actual requirement in the PR at hand**.

Each candidate gets exactly one decision — **ADOPT / ADOPT SELECTIVELY / REFERENCE ONLY / DEFER / REJECT** — and one integration strategy — **DEPENDENCY / COPY OWNED COMPONENTS / COPY PATTERN ONLY / DO NOT IMPORT**.

## Overriding rules
- **No real requirement in the current PR → DEFER**, even if the library is excellent (a high score is not a reason to adopt).
- A single **security or license blocker overrides any score**.
- **Templates (e.g. Obytes) are REFERENCE ONLY** — never forked, never used as `--template`, never copy their dependency set/auth/state/UI wholesale. Borrow and adapt *patterns*; record PATTERN REVIEWED / ADOPTED / REJECTED / WHY.
- **Owner-gated** (require explicit human authorization, never auto-enabled): app store identifiers, EAS credentials, EAS Update/production OTA, Apple/Google developer-account actions, store submission.

## Standing decisions (see DEPENDENCY_ADOPTION_MATRIX.md for evidence)
- **ADOPT:** Expo SDK 57, Expo Router (M0); supabase-js + expo-secure-store (M1); TanStack Query (M2); expo-notifications (M6); EAS build tooling (M0, build-only).
- **ADOPT SELECTIVELY:** async-storage (non-secret), React Native Reusables (copy owned components, per component).
- **GATE REQUIRED before any use:** NativeWind (not pre-approved).
- **DEFERRED:** Zustand, MMKV (no proven M0 need).
- **REFERENCE ONLY:** gluestack-ui, Obytes template.
- **DEFER / DO NOT IMPORT now:** OneSignal, Detox.

## Consequences
Adopting a new strategic dependency requires a short gate note in the PR that introduces it. `npm audit`/GHSA is run before versions are locked.
