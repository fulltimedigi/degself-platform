# ADR-0005 — Mobile auth providers & secure session storage

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `c47b6da` (M0) · **PR:** M1

## Context
M1 introduces native authentication for the Expo (SDK 57 / RN 0.86 / New Architecture) app. Identity must resolve into the **same Supabase Auth** user system the web uses — never a parallel user store. Auth tokens are secrets and must not sit in plain storage. All primary sources accessed **2026-08-08**.

## Decision

**Providers (resolve into Supabase Auth):**
- **Google — Supabase `signInWithOAuth` + system auth session** (`expo-web-browser` + `expo-auth-session`), NOT the native `@react-native-google-signin` picker. **Reason (owner review + primary sources 2026-08-08):** Supabase's current Expo Social Auth quickstart states the **free** `@react-native-google-signin` "doesn't support iOS or Android, as it doesn't allow to pass a custom nonce" to `signInWithIdToken`; the nonce-capable native path is the **paid** Universal Sign In. Per the owner's default (simplest fully-supported non-deprecated path, no paid dependency without approval), we use the free OAuth flow: `signInWithOAuth({provider:'google', options:{redirectTo, skipBrowserRedirect:true}})` → `WebBrowser.openAuthSessionAsync` → establish the session from the redirect (`exchangeCodeForSession` for PKCE `?code=`, or `setSession` for an implicit `#access_token=` — the code handles both). The Google client id/secret live ONLY on the Supabase Google provider (server-side); **no Google client id or secret ships in the bundle.** Redirect returns via `degself://` (register `degself://**` in Supabase Auth → URL Configuration).
  - *Reauth (AUTH_TOO_OLD):* re-run `signInWithOAuth` — a fresh sign-in mints a new session and advances `last_sign_in_at`. Caveat: the system browser may silently re-consent if a live Google session exists (fresh from Supabase's side, but not proof-of-presence — that would need MFA/AAL2, out of scope).
- **Apple** — `expo-apple-authentication@~57.0.1` (iOS-only) native → `signInWithIdToken({ provider:'apple', token, nonce })`. REQUIRED — see ADR-0007. (Apple's own native module DOES support a custom nonce, so the native path is correct here.)
- The native stack still requires a **custom dev build** (SecureStore/Apple auth are native); only supabase-js runs in Expo Go.

**Auth-client concurrency lock:** we intentionally do **not** pass `lock: processLock`. Audited against the installed `@supabase/auth-js@2.112.2`: `processLock` is `@deprecated` — *"The auth client coordinates refreshes itself and the server resolves concurrent refresh races, so passing `{ lock: processLock }` to it has no effect. You can safely drop the import."* The current Supabase RN quickstart no longer sets it.

**Session storage — Supabase-official `LargeSecureStore`:** a random AES-256 key in `expo-secure-store` (iOS Keychain / Android Keystore, **at rest**; the key is loaded into JS memory to encrypt/decrypt — no hardware Secure Enclave compute boundary is claimed) encrypts the session; the ciphertext lives in `AsyncStorage`. This sidesteps SecureStore's ~2 KB per-value limit (a Supabase session exceeds it) while keeping the plaintext session out of unencrypted storage. Passed as the `storage` adapter to `createClient({ auth: { storage, autoRefreshToken:true, persistSession:true, detectSessionInUrl:false }})`. Guest (non-secret) data uses **plain AsyncStorage** — never SecureStore.
  - *Accepted failure mode (inherent to the official pattern):* `setItem` writes the new key to SecureStore, then the ciphertext to AsyncStorage. A crash between those two writes leaves a key/ciphertext mismatch → `getItem` returns undecryptable bytes → a local sign-out on next launch. This is confirmed identical to Supabase's current published `LargeSecureStore` (no official transactional variant exists; a naive write-reorder does not fix it since both values rotate together). It is non-destructive (the user simply re-authenticates), low-probability (a two-adjacent-`await` window hit only by a crash mid-refresh), and M1 does NOT add a custom transactional storage layer for it.

**Token refresh:** the RN-supported `AppState` pattern — `startAutoRefresh()` on foreground, `stopAutoRefresh()` on background — registered once. No browser visibility APIs.

**Auth state owner:** Supabase Auth remains the single authority. A thin `AuthProvider` mirrors the session via `onAuthStateChange` + `getSession()` bootstrap and exposes sign-in/out/reauth/getAccessToken. **No Zustand** — no duplicated session store.

**Config model:** PUBLIC values only, via `EXPO_PUBLIC_*` (Supabase URL + publishable key, API base URL, Google **web** client id). No secret ships in the bundle. Only the Production Supabase project exists today; dev/preview currently target it with controlled test users (documented in README), never real customer data.

## Dependencies adopted (all MIT, SDK-57-pinned)
`@supabase/supabase-js@2.112.2` (pure JS; `react-native-url-polyfill/auto`) · `expo-secure-store@~57.0.1` · `@react-native-async-storage/async-storage@2.2.0` (NOT 3.x — breaks SDK 54+) · `expo-crypto@~57.0.1` · `aes-js@^3.1.2` · `expo-apple-authentication@~57.0.1` · **`expo-auth-session@~57.0.6` + `expo-web-browser@~57.0.2`** (Google OAuth) · `expo-linking@~57.0.5` (scheme). **Removed:** `@react-native-google-signin/google-signin` (free tier unsupported for this flow — see above). Native modules require a dev build; only supabase-js runs in Expo Go.

## Consequences
- The app cannot run in Expo Go; a dev/EAS build is required to exercise auth.
- Google needs **no** client id in the app; the owner configures the Google client id/secret on the Supabase Google provider and registers `degself://**` as a redirect URL. Apple needs the Sign In with Apple capability + bundle id on the Supabase Apple provider. Real provider login + binary verification need owner credentials + EAS signing — see the M1 native-build gate.
- Google login is a system-browser flow (no native One Tap). If native One Tap becomes a hard requirement, that is the paid Universal Sign In — an explicit owner decision, not adopted here.
- Deferred (unchanged): Zustand, MMKV, TanStack Query, NativeWind, PostHog RN.
