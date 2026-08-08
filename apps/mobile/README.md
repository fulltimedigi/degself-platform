# apps/mobile — DEGSELF native app (M1)

Native Android + iOS app for DEGSELF / دق سلف, built with **Expo SDK 57 + Expo Router + TypeScript**. **M0** shipped the foundation (navigation, i18n/RTL, build/test config). **M1** adds the first product capabilities: **auth (Google + Apple), profile, favorites, and account deletion**. Architecture and decisions live in [`docs/mobile/`](../../docs/mobile/).

## Status: M1 — Auth + Profile + Favorites + Account Deletion
Supabase-native auth (Google everywhere, Sign in with Apple on iOS), secure session persistence, profile access, favorites via RLS with a loss-safe guest→auth handoff, and in-app account deletion through the canonical server operation. See ADRs [0005](../../docs/mobile/adr/0005-mobile-auth-and-session-storage.md) (auth/session), [0006](../../docs/mobile/adr/0006-account-deletion-auth-transport.md) (deletion transport / OD-02), [0007](../../docs/mobile/adr/0007-sign-in-with-apple.md) (Sign in with Apple / OD-03).

## Identifiers (owner-approved, permanent)
- iOS `bundleIdentifier`: `com.degself.app`
- Android `package`: `com.degself.app`
- Expo `scheme`: `degself`

## Structure (M1 additions in **bold**)
```
app/
  _layout.tsx            # providers: I18n → Auth → Favorites → stack
  (tabs)/
    _layout.tsx          # 4 tabs (localized labels)
    index.tsx            # Home placeholder (unchanged)
    search.tsx           # placeholder (M2)
    saved.tsx            # guest + authenticated favorites + handoff
    account.tsx          # sign-in / signed-in profile + Danger Zone + locale switcher
src/
  lib/
    supabase.ts          # RN Supabase client (LargeSecureStore, AppState auto-refresh)
    auth/                # AuthProvider, google.ts, apple.ts, secure-store.ts (LargeSecureStore)
    favorites/           # favorites-sync (pure), guest-storage, favorites-remote (RLS), context
    account/             # account-deletion (pure contract), delete-account (Bearer call)
  components/            # primitives (+ Button), auth/AuthPanel, account/DangerZone
  config/env.ts          # PUBLIC-only runtime config (EXPO_PUBLIC_*)
  i18n/ · theme/ · types/aes-js.d.ts
```
Native `ios/` and `android/` are **not committed** — Continuous Native Generation (`expo prebuild`) regenerates them (gitignored).

## Auth (resolves into the SAME Supabase Auth as web)
- **Google** — Supabase **`signInWithOAuth`** + system auth session (`expo-web-browser` + `expo-auth-session`), the current Supabase-supported mobile path. (The *free* `@react-native-google-signin` can't pass a custom nonce and is unsupported for this flow; the native-nonce path is the paid Universal Sign In — not adopted.) The Google client id/secret live ONLY on the Supabase Google provider (server-side) — **no Google client id or secret ships in the app.** Redirect returns via `degself://` (register `degself://**` in Supabase Auth → URL Configuration). The code establishes the session from the redirect (PKCE `exchangeCodeForSession` or implicit `setSession`).
- **Apple (iOS, REQUIRED)** — `expo-apple-authentication` native → `signInWithIdToken({ provider:'apple', nonce })`. Entitlement `com.apple.developer.applesignin` (via `ios.usesAppleSignIn`). Native-only Supabase Apple provider needs just the bundle id. `fullName`/`email` are returned only on the first authorization; M1 uses only the identity token.
- **Session** — Supabase-official `LargeSecureStore` (AES-256 key in Keychain/Keystore via SecureStore **at rest**, loaded into memory to encrypt/decrypt; ciphertext in AsyncStorage) as the storage adapter; auto-refresh tied to `AppState`. `lock: processLock` is intentionally omitted (deprecated no-op in auth-js 2.112.2). Accepted rare failure mode: a crash mid-`setItem` can force a local re-login (documented in ADR-0005). Auth secrets never sit in plain storage; guest favorites use plain AsyncStorage.

Requires a **custom dev build** — this native stack does not run in Expo Go.

## Favorites (OD-02-adjacent)
Authenticated favorites go **directly** to `public.user_favorites` via the user's session + **RLS** (no service-role API). Guest favorites live in AsyncStorage. On every guest→auth transition the store snapshots → UNION-upserts → loss-safely clears only the transferred snapshot (pure logic in `favorites-sync.ts`, mirrored 1:1 with web and unit-tested). Note: `user_favorites.place_id` is FK-constrained to `public.workshops`, so authenticated favorites must reference real workshops.

## Account deletion (OD-02)
The Danger Zone posts `Authorization: Bearer <access token>` to the canonical web operation `/api/account/delete`. Server verifies the token, then runs the SAME sequence as web (typed `DELETE`, 10-min recent-auth, per-user rate limit, admin/claimed blockers, `auth.admin.deleteUser`). `AUTH_TOO_OLD` drives a provider reauth (no password prompt for OAuth users). On success the local session + secure storage + guest favorites are cleared.

## Environment model
PUBLIC values only, via `EXPO_PUBLIC_*` (see [`.env.example`](.env.example)): Supabase URL + publishable key, API base URL, Google web client id. **No secret is ever bundled.** Only the Production Supabase project exists today; dev/preview target it with controlled test users — never real customer data.

## Commands
```
npm run start        # Expo dev server (use a dev build, not Expo Go)
npm run typecheck    # tsc --noEmit
npm test             # pure logic tests (favorites-sync, account-deletion, i18n) via tsx --test
npm run doctor       # expo-doctor (pinned 1.20.1 — same version in CI)
npx expo prebuild    # config → native projects (ios/android, gitignored)
```

## Dependency resolution
Installs use **strict** npm peer enforcement (no global `legacy-peer-deps`); `npm ci` passes clean. Two SDK-consistent transitive pins remain in `package.json > overrides` (`react-dom@19.2.3`, `react-native-worklets@0.10.1`), each documented in ADR/PR. M1 added no new overrides. All M1 deps are MIT and SDK-57-pinned (see ADR-0005).

## Build & verification (this environment)
- CONFIG VERIFIED · TYPECHECK VERIFIED · TESTS VERIFIED · EXPO DOCTOR (20/20) · EXPO CONFIG VERIFIED · `npm ci` VERIFIED
- PREBUILD VERIFIED (android **and** ios, config→native) · Apple **`com.apple.developer.applesignin` entitlement generation VERIFIED** · bundle id `com.degself.app` + scheme `degself` in native output
- RLS VERIFIED live (rolled-back): own-only reads, cross-user insert/read/delete blocked, `authenticated`-only, anon denied, no UPDATE grant
- **ANDROID BINARY: NOT VERIFIED — ENVIRONMENT/CREDENTIAL BLOCKER** (no Android SDK / EAS credentials)
- **iOS BINARY: NOT VERIFIED — ENVIRONMENT/CREDENTIAL BLOCKER** (no macOS / Apple credentials)
- **REAL PROVIDER LOGIN (Google/Apple): NOT VERIFIED — device/credential blocker** — never faked from config alone

Real device binaries + provider login build via **EAS** with owner credentials. No store submission / production OTA is configured.

## Non-scope (M1)
No search / workshop discovery UI (M2), no `packages/domain` extraction, no Ask DEGSELF, no quotes/offers, no WABA, no admin, no push/device tokens, no Universal/App Links (`assetlinks.json` / `apple-app-site-association` — M6; only the auth callback scheme is configured), no analytics identity, no review UI. Deferred deps: NativeWind, Zustand, MMKV, TanStack Query, expo-notifications, PostHog RN. (Google auth uses `expo-auth-session`/`expo-web-browser`; the paid Universal Sign In is NOT adopted.)

## Next
**M2 — Search + Workshop Detail + deterministic domain extraction** (OD-04). Remaining M-gated open decisions: OD-01 (M4), OD-04 (M2), OD-05 (M3), OD-06/07/08 (later).
