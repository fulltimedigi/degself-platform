# apps/mobile — DEGSELF native app (M0 foundation)

Native Android + iOS app for DEGSELF / دق سلف, built with **Expo SDK 57 + Expo Router + TypeScript**. This is the **M0 foundation only** — navigation shell, localization/RTL, and build/test config. **No product features** (see non-scope). Architecture and decisions live in [`docs/mobile/`](../../docs/mobile/).

## Status: M0 (foundation)
Proves the app builds, boots, localizes (ar/en/hi/ur with correct RTL/LTR), and navigates as a real Expo app inside this repo. It does **not** implement any product functionality yet.

## Identifiers (owner-approved, permanent)
- iOS `bundleIdentifier`: `com.degself.app`
- Android `package`: `com.degself.app`
- Expo `scheme`: `degself`

## Structure
```
app/
  _layout.tsx            # providers + headerless stack
  (tabs)/
    _layout.tsx          # 4 tabs (localized labels)
    index.tsx            # Home placeholder
    search.tsx saved.tsx account.tsx   # placeholders (account hosts the locale switcher)
src/
  i18n/                  # owned, dependency-free i18n (direction.ts is pure + unit-tested)
  components/primitives  # Screen/ThemedText/Surface/ChoiceButton (owned; no UI kit)
  theme/tokens.ts        # minimal DEGSELF brand tokens
  config/env.ts          # env model (PUBLIC values only)
```
Native `ios/` and `android/` are **not committed** — Continuous Native Generation (`expo prebuild`) regenerates them (gitignored).

**Dependency resolution:** installs use **strict** npm peer enforcement (no global `legacy-peer-deps`), so real conflicts in future PRs surface. Two SDK-consistent transitive pins live in `package.json > overrides`, each documented:
- `react-dom: 19.2.3` — `expo-router` pulls Expo-Web-only UI deps (`vaul`, `@radix-ui/*`) that peer-require `react-dom`; the default `react-dom@19.2.8` wants `react ^19.2.8` while the SDK pins `react@19.2.3`. DEGSELF ships **no Expo Web**, so this pins that web-only package to the SDK's React version.
- `react-native-worklets: 0.10.1` — `expo-modules-core@57` requires worklets `^0.10.0` (< 0.11) but `@expo/ui`/`react-native-reanimated` resolve `0.11.3`; `0.10.1` is Expo's expected version (`expo install --check`) and satisfies every consumer.

Neither disables peer enforcement elsewhere; a future M1/M2 conflict still fails `npm ci`.

## Commands
```
npm run start        # Expo dev server (use a development build, not Expo Go, long-term)
npm run typecheck    # tsc --noEmit
npm test             # pure locale/direction tests (tsx --test)
npm run doctor       # expo-doctor (pinned 1.20.1 — same version in CI)
npx expo config      # resolved app config
```

## Localization / RTL
Owned minimal i18n (next-intl is web-only and is not imported). `src/i18n/direction.ts` is the pure source of truth (ar/ur → RTL, en/hi → LTR) and is unit-tested. The Account tab has a live language switcher; text direction updates immediately, but **full native layout mirroring (`I18nManager.forceRTL`) requires an app restart** in React Native — this is surfaced to the user, not faked.

## Environment model
Three logical envs (development/preview/production) via app config `extra.appEnv`. **Every value bundled into a mobile app is PUBLIC** — no secrets here or in `extra` (no service-role key, DB URL, Anthropic/WABA/admin/Vercel secrets). Public runtime config (Supabase URL + publishable key) is added in **M1** when auth/data land, not preemptively.

## Build verification (this environment)
- CONFIG VERIFIED · PREBUILD VERIFIED (android, config→native generation) · TYPECHECK VERIFIED · TESTS VERIFIED · EXPO DOCTOR VERIFIED (20/20) · EXPO CONFIG VERIFIED
- **ANDROID BINARY: NOT VERIFIED — ENVIRONMENT/CREDENTIAL BLOCKER** (no Android SDK / EAS credentials)
- **iOS BINARY: NOT VERIFIED — ENVIRONMENT/CREDENTIAL BLOCKER** (no macOS / Apple credentials)

Real device binaries build via **EAS** with owner credentials — not created in PR CI, and no store submission / production OTA is configured in M0.

## Non-scope (M0)
No auth / Google / Apple Sign In, no favorites/profile/Supabase business access, no search business logic, no `packages/domain`, no Ask DEGSELF, no quotes/offers, no WABA, no admin, no push/device tokens, no Universal/App Links, no analytics identity, no review UI, no production OTA. Deferred deps: NativeWind (gated), Zustand, MMKV, TanStack Query, expo-secure-store, expo-notifications, PostHog RN, ESLint (blank template ships none; see the M0 PR).

## Next
**M1 — Auth + Profile + Favorites + Account Deletion** (Supabase native auth incl. Sign in with Apple, secure token storage, favorites via RLS, and the Bearer-adapter to the canonical account-deletion operation). See [`docs/mobile/OPEN_DECISIONS.md`](../../docs/mobile/OPEN_DECISIONS.md).
