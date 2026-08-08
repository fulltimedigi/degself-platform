# ADR-0005 — Mobile auth providers & secure session storage

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `c47b6da` (M0) · **PR:** M1

## Context
M1 introduces native authentication for the Expo (SDK 57 / RN 0.86 / New Architecture) app. Identity must resolve into the **same Supabase Auth** user system the web uses — never a parallel user store. Auth tokens are secrets and must not sit in plain storage. All primary sources accessed **2026-08-08**.

## Decision

**Providers (native, resolve into Supabase Auth):**
- **Google** — `@react-native-google-signin/google-signin@16.1.4` native picker → Google ID token → `supabase.auth.signInWithIdToken({ provider:'google', token })`. Chosen over the browser OAuth (`expo-auth-session`) flow: native UX, no PKCE, no secret. Requires a **custom dev build** (not Expo Go).
- **Apple** — `expo-apple-authentication@~57.0.1` (iOS-only) → `signInWithIdToken({ provider:'apple', token, nonce })`. REQUIRED — see ADR-0007.
- **No `expo-auth-session`/`expo-web-browser`** in M1: the native SDKs cover both providers, so the browser-redirect deps are DEFERRED.

**Session storage — Supabase-official `LargeSecureStore`:** a random AES-256 key in `expo-secure-store` (iOS Keychain / Android Keystore) encrypts the session; the ciphertext lives in `AsyncStorage`. This sidesteps SecureStore's ~2 KB per-value limit (a Supabase session exceeds it) while keeping the plaintext session out of unencrypted storage. Passed as the `storage` adapter to `createClient({ auth: { storage, autoRefreshToken:true, persistSession:true, detectSessionInUrl:false }})`. Guest (non-secret) data uses **plain AsyncStorage** — never SecureStore.

**Token refresh:** the RN-supported `AppState` pattern — `startAutoRefresh()` on foreground, `stopAutoRefresh()` on background — registered once. No browser visibility APIs.

**Auth state owner:** Supabase Auth remains the single authority. A thin `AuthProvider` mirrors the session via `onAuthStateChange` + `getSession()` bootstrap and exposes sign-in/out/reauth/getAccessToken. **No Zustand** — no duplicated session store.

**Config model:** PUBLIC values only, via `EXPO_PUBLIC_*` (Supabase URL + publishable key, API base URL, Google **web** client id). No secret ships in the bundle. Only the Production Supabase project exists today; dev/preview currently target it with controlled test users (documented in README), never real customer data.

## Dependencies adopted (all MIT, SDK-57-pinned)
`@supabase/supabase-js@2.112.2` (pure JS; `react-native-url-polyfill/auto`) · `expo-secure-store@~57.0.1` · `@react-native-async-storage/async-storage@2.2.0` (NOT 3.x — breaks SDK 54+) · `expo-crypto@~57.0.1` · `aes-js@^3.1.2` · `expo-apple-authentication@~57.0.1` · `@react-native-google-signin/google-signin@16.1.4`. Native modules require a dev build; only supabase-js runs in Expo Go.

## Consequences
- The app cannot run in Expo Go; a dev/EAS build is required to exercise auth.
- Real provider login + binary verification need owner credentials (Google OAuth client ids, Apple capability, EAS signing) — see the M1 native-build gate.
- Deferred (unchanged): Zustand, MMKV, TanStack Query, NativeWind, PostHog RN, `expo-auth-session`.
