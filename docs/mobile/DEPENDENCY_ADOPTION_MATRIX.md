# DEGSELF Mobile — Dependency Adoption Matrix

**Research date:** 2026-08-08. Versions observed via npm registry / package repos; facts from Expo, React Native, Supabase official docs (primary). `[EXT]` = primary external source, `[UNK]` = unverified.
**Baseline:** Expo **SDK 57** (stable 2026-06-30) → React Native 0.86 + React 19.2. **SDK 55+ is New-Architecture-only** (Fabric/TurboModules default), so every candidate must be New-Arch-clean.

This matrix is advisory/evidence; the binding adoption **policy/gate** is `adr/0004-open-source-adoption-policy.md`. Nothing here is installed until it passes that gate for the specific PR that needs it.

## Candidate matrix `[EXT]`

| Candidate | Latest stable (2026-08-08) | License | Health | Expo fit | New Arch | RTL | Security | Decision | Integration | Earliest PR |
|---|---|---|---|---|---|---|---|---|---|---|
| Expo SDK 57 | 57.0.11 | MIT | first-party | platform | default | OS | ok | **ADOPT** | dependency | M0 |
| Expo Router | 57.0.11 | MIT | active | managed | yes | OS | ok | **ADOPT** | dependency | M0 |
| @supabase/supabase-js + official RN auth pattern | 2.112.2 | MIT | active | managed | JS | OK | ok | **ADOPT** (lib) / **COPY PATTERN** (auth) | dependency + own auth | M1 |
| @tanstack/react-query | 5.101.4 | MIT | very active | managed | JS | n/a | ok | **ADOPT** | dependency | M2 |
| expo-secure-store | 57.0.1 | MIT | first-party | plugin | yes | OS | strong | **ADOPT** (tokens) | dependency | M1 |
| @react-native-async-storage/async-storage | 3.1.1 | MIT | active | managed | TurboModule | OS | unencrypted | **ADOPT SELECTIVELY** | dependency (non-secret) | M1 |
| react-native-mmkv | 4.3.2 | MIT | active | **prebuild + Nitro** | yes | OS | ok (not secrets) | **DEFERRED** | dependency (cache) | ≥M2 if needed |
| zustand | 5.0.14 | MIT | active | managed | JS | n/a | ok | **DEFERRED** | dependency | only on real need |
| NativeWind | `[UNK verify]` | MIT | active | config plugin | verify | logical (verify) | ok | **GATE REQUIRED** (not pre-approved) | dependency | M0 only if gate passes, else StyleSheet |
| React Native Reusables | CLI/registry `[UNK ver]` | MIT | active 8.6k★ | managed | yes | logical | ok | **ADOPT SELECTIVELY** | copy-owned components | when a component is needed |
| gluestack-ui v2 | 5.0.15 | MIT (v3 in dev) | active | managed | yes | RTL-by-default `[UNK verify]` | ok | **REFERENCE ONLY** | copy pattern | — |
| Obytes template | template | MIT | active | managed | yes | i18next | ok | **REFERENCE ONLY** | copy pattern | — |
| expo-notifications + Expo Push | 57.0.9 | MIT | first-party | dev build | yes | text | ok | **ADOPT (later)** | dependency | M6 |
| OneSignal | — | — | — | — | — | — | — | **DEFER** | do not import | — |
| EAS Build/Submit/Update | service (CLI `eas-cli` `[UNK ver]`) | SaaS + MIT client | first-party | — | — | — | ok | **ADOPT** (tooling) | tooling | M0 (build only; no submit/OTA) |
| @testing-library/react-native + Maestro | 14.0.1 / CLI `[UNK ver]` | MIT / Apache-2.0 | active | managed/external | yes | n/a | ok | **ADOPT (dev, later)** | dependency (dev) | M0 build-smoke or M8 |
| Detox | — | MIT | — | complex | — | — | ok | **DEFER** | — | — |

## Scorecard `[EXT]` (0–5; Dep-weight higher=lighter; Lock-in higher=lower-risk). A single security/license blocker overrides total.

| Candidate | Maint | Lic | Expo | Sec | RTL | Arch | Dep-wt | Lock-in | Upgrade | Value | **/50** |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Expo SDK 57 | 5 | 5 | 5 | 5 | 4 | 5 | 3 | 3 | 4 | 5 | **44** |
| Expo Router | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 3 | 4 | 5 | **45** |
| supabase-js + auth | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 3 | 4 | 5 | **44** |
| TanStack Query | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **47** |
| Zustand | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | **49** (still DEFERRED — no M0 need) |
| react-native-mmkv | 4 | 5 | 3 | 4 | 5 | 4 | 4 | 4 | 3 | 4 | **40** (DEFERRED) |
| expo-secure-store | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | **48** |
| async-storage | 5 | 5 | 5 | 3 | 5 | 5 | 4 | 4 | 5 | 4 | **45** |
| RN Reusables | 4 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 5 | **46** |
| gluestack-ui v2 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 3 | 4 | **43** (REFERENCE ONLY) |
| Obytes | 4 | 5 | 5 | 4 | 4 | 4 | 2 | 4 | 3 | 3 | **38** (REFERENCE ONLY) |
| expo-notifications | 5 | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | **43** |
| EAS | 5 | 3 | 5 | 4 | 5 | 5 | 4 | 2 | 4 | 5 | **42** |
| RNTL + Maestro | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | **48** |

**Score is not a decision.** Zustand/MMKV score high yet are DEFERRED (no proven M0 need — architecture contract Corrections 3–4). NativeWind must pass the gate before any use (Correction 1).

## Notes on load-bearing facts `[EXT]`
- **Supabase RN auth**: native storage adapter + PKCE + `WebBrowser.openAuthSessionAsync` + `makeRedirectUri` deep link + `setSession`; wire `AppState` to autoRefresh. Docs default the adapter to AsyncStorage; SecureStore is the hardened swap for the token.
- **MMKV v4** uses **Nitro Modules** (RN ≥0.76, extra `react-native-nitro-modules`), not Expo Go, needs `expo prebuild`.
- **EAS Update (OTA)** ships JS/styles/images/copy/config only — **never native code**; Apple 3.3.1 forbids materially changing app purpose or enabling hidden features via OTA.

## Obytes cleaning list (copy PATTERNS, never the repo)
- **KEEP (pattern):** Expo Router structure, multi-env `.env` organization, GitHub Actions CI concepts, Husky/lint-staged, EAS profile ideas, testing/i18n organization, TS strictness.
- **REMOVE / DO-NOT-COPY:** MMKV-as-default token storage (tokens → SecureStore), bundled analytics/error SDKs you didn't choose, its UI kit, demo screens + example API layer, auth boilerplate not matching the Supabase pattern, Form/Zod scaffolding unless forms exist. Never `--template` it.
- Record for each borrowed pattern: **PATTERN REVIEWED / ADOPTED / REJECTED / WHY** (in the M0 PR).

## UNKNOWN to close before locking versions `[UNK]`
- exact `eas-cli` version + EAS pricing tiers; Maestro CLI version; RN Reusables canonical semver; gluestack v2 RTL-by-default (hands-on verify); MMKV v4 ↔ SDK 57 prebuild compatibility (spike); `npm audit`/GHSA pass at adoption.
