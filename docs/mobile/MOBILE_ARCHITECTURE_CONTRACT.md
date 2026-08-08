# DEGSELF Mobile Architecture Contract

**Status:** ACCEPTED (Stage A freeze) · **Date:** 2026-08-08
**Baseline:** master `f9239dd6b1f911efd221bffef670d57da9488b53` (PR #118 merged; migration 035 live; authenticated favorites under RLS live; account deletion verified end-to-end).
**Companion docs:** `MOBILE_READINESS_AUDIT.md` (findings), `DEPENDENCY_ADOPTION_MATRIX.md` (external research), `OPEN_DECISIONS.md` (unresolved), `adr/0001-0004`.

This is the authoritative contract for the DEGSELF native app. Where it differs from the audit roadmap, **this contract wins** (see §"Corrections").

---

## 1. Strategy (settled)

- **Expo + React Native** for Android + iOS (ADR-0001). A native customer app — **not** a WebView wrapper.
- **Web (`apps/web-v2`) stays canonical** for SEO/public/admin/server. Mobile is an additional client on the **same Supabase backend**.
- **Direct Supabase** is allowed **only** where RLS completely defines authorization and no secret / privileged transition / hidden business rule / cost-abuse boundary is bypassed (ADR-0002).
- **Server-authoritative operations stay server-side** (account deletion, Ask DEGSELF, quote create/route/deliver, offer transitions, WABA, future push events).
- **No shared UI package.** Duplicated RN UI is preferred over premature cross-platform UI abstraction.
- **Deterministic business logic** (Arabic normalize, search synonyms/stopwords, ranking/facets, enrichment accessors, `isOpenNow`, geo helpers) may be extracted into `packages/domain` **later, only when both clients actually need it** (expected extraction point: M2) (ADR-0003).
- **WABA = server-only. Admin = web-only.** Neither enters the app.

## 2. Repository integration decision (from workspace audit)

- The repo has **no root workspace / no monorepo tooling**; `apps/web-v2` is a self-contained npm project, and `web-v2 CI` is **path-filtered to `apps/web-v2/**`**.
- **Decision:** `apps/mobile` will be a **self-contained Expo project** with its own `package.json`/lockfile, **not** wired into a root workspace. No package-manager conversion; **no Turborepo/Nx** introduced. This is the minimum integration that leaves existing web installs/CI byte-for-byte unchanged.
- Mobile CI (if added) will be a **separate** workflow path-filtered to `apps/mobile/**`.

## 3. Runtime ownership (target)

```
MOBILE CLIENT   : screens, navigation, native maps, Linking (tel/wa.me), secure token storage
SHARED PURE     : packages/domain (later), packages/contracts (later)
SUPABASE/RLS    : workshop reads, favorites CRUD, profile, approved-review reads   (publishable key)
SERVER API      : account deletion, Ask DEGSELF, quote create, offer accept        (service-role / Anthropic / WABA)
BACKGROUND      : network routing, WABA delivery, GSC cron
ADMIN WEB ONLY  : /admin/*, garage dashboards
```

Boundary key used in the readiness matrix: **A** Direct Supabase+RLS · **B** Shared pure package · **C** Existing endpoint · **D** New/adapted endpoint · **E** Web-only · **F** Deferred.

## 4. Corrections to the audit roadmap (BINDING)

1. **NativeWind is NOT pre-approved.** It never got an independent adoption review. Do not install it by default. It must pass the dependency gate (ADR-0004) with clearly favorable evidence; otherwise M0 uses React Native `StyleSheet` / minimal owned primitives. M0 must not depend on NativeWind because a template uses it.
2. **React Native Reusables is NOT automatically in M0.** It stays *ADOPT SELECTIVELY / COPY OWNED COMPONENTS* — only when a concrete component need exists, and only after auditing that exact component + its deps. M0 prefers minimal owned primitives.
3. **Zustand is DEFERRED.** A high score is not a reason to adopt. State hierarchy: (1) server state → TanStack Query when needed; (2) auth/session → Supabase; (3) navigation → Expo Router; (4) local → React state; (5) persistent non-secret → chosen only when a real use case exists; (6) global client-only store → Zustand **only if a concrete need appears**. Do not invent a global store.
4. **MMKV is DEFERRED.** Native/prebuild/Nitro complexity with no proven M0 need. Auth secrets later → `expo-secure-store`. Ordinary persistence chosen against real M1/M2 needs. Do not preinstall storage engines.
5. **Quote Ownership ADR precedes M4** (not M5). We must not knowingly create authenticated mobile quotes under an ownership model already known to be insufficient for secure retrieval. **`ADR — Quote Ownership Model` (OD-01) must be accepted before PR-M4 begins.** M5 may build the "My Quotes/Offers" UI later, but ownership semantics are settled before M4.
6. **Account deletion is ONE business operation.** No duplicated deletion logic for mobile. Target:
   ```
   Web cookie-auth adapter ─┐
                             ├─→ canonical account-deletion operation
   Mobile Bearer-JWT adapter ┘
   ```
   Single-source (must not fork): recent-auth rule, typed-confirmation rule, rate-limit policy, privileged-admin blocker, claimed-workshop blocker, `auth.admin.deleteUser`, retention/cascade expectations, error codes. M1 may **refactor** the existing route to accept a mobile Bearer transport; it must **not** create a second deletion implementation.

## 5. Dependency policy

Every strategic third-party dependency passes the **Open-Source Adoption Gate** (ADR-0004) against current primary sources **before** install. If there is no real M0 requirement → **DEFER**, even if excellent. Obytes template is **REFERENCE ONLY** (patterns may be borrowed and adapted; never forked / never `--template` / never copy its dep set/auth/state/UI wholesale).

**M0 expected dependency set:** Expo, Expo Router, TypeScript, and a mobile i18n runtime **only if actually required**. Explicitly NOT assumed in M0: NativeWind, Zustand, MMKV, TanStack Query, RN Reusables, expo-secure-store, expo-notifications, Maestro. (TanStack Query ≈ M2; expo-secure-store = M1; expo-notifications = M6.)

## 6. M0 scope / non-scope (foundation only)

**M0 proves:** "DEGSELF can build, boot, localize (ar/en/hi/ur with correct RTL/LTR), and navigate as a real iOS+Android Expo app inside this repo." It does **not** prove product functionality.

**In scope:** self-contained `apps/mobile` (official Expo path, TypeScript, Expo Router if gate passes), navigation shell with **placeholder** Home/Search/Saved/Account, minimal owned primitives (Screen/Text/Button/Card only as needed), locale + direction architecture, dev/preview/production env model (public values only), app identifiers (see OD/identifier gate), optional minimal EAS build profiles (no submit, no production OTA, no auto-credentials).

**Explicitly NOT in M0:** authentication (M1), Supabase business data / favorites / workshops / profiles (M1/M2), Ask DEGSELF, quote/offer flows, push, deep-link `.well-known` files, admin, WABA, `packages/domain` (M2), shared UI, `src/stores/`, speculative `src/api/`/`src/services/`.

## 7. Security invariants (mobile)

- **Every value bundled into the app is public.** Only `NEXT_PUBLIC`-class config may ship (Supabase URL, publishable key, public analytics config) — and only when actually required. **Never** bundle: service-role key, Anthropic key, WABA/Meta secrets, PostHog private secrets, DB URL, admin password/hash, Vercel tokens.
- RLS remains the authorization boundary for all direct reads/writes.
- Auth tokens (M1) live in `expo-secure-store`, separated from ordinary UI/cache state.

## 8. Roadmap (authoritative ordering; PRs are future, not this task)

| PR | Goal | Gated by |
|---|---|---|
| **M0** | Expo foundation + navigation + RTL (this task, Stage B) | dependency gate, workspace audit |
| **M1** | Supabase native auth (Google **+ Sign in with Apple**), secure token storage, profile, favorites via RLS, **account deletion via Bearer adapter (single op)** | OD-02, OD-03 |
| **M2** | Search + workshop detail (direct reads + **`packages/domain`** extraction) | OD-04 |
| **M3** | Ask DEGSELF (+ **per-user/device quota**) | OD-05 |
| **M4** | Quote creation | **OD-01 accepted first** |
| **M5** | Quote status / "My Quotes" + offers UI | OD-01 |
| **M6** | Push + deep links (`device_tokens`, `.well-known`) | OD-07, OD-08 |
| **M7** | Store readiness (privacy manifests, App Privacy + Data safety, policy/deletion pages, targetSdk 36 / Xcode 26) | — |
| **M8** | Beta hardening (Maestro E2E, a11y/RTL sweep) | — |

## 9. Open (must be resolved before their gated PR)

See `OPEN_DECISIONS.md`: OD-01 quote ownership (→ M4/M5), OD-02 mobile delete auth transport (→ M1/store), OD-03 Sign in with Apple (→ M1/iOS), OD-04 search/domain boundary (→ M2), OD-05 Ask DEGSELF quota (→ M3), OD-06 UGC moderation, OD-07 push provider/device tokens (→ M6), OD-08 deep-link security (→ M6), OD-09 mobile analytics identity. App **identifiers** and **EAS Update/credentials** are owner-gated (see OPEN_DECISIONS + ADR-0004).
