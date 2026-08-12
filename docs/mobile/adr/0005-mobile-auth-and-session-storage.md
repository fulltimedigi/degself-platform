# ADR-0005 — Mobile auth providers & secure session storage

**Status:** Accepted · **Date:** 2026-08-08 · **Security review:** 2026-08-12 · **PR:** M1 / #142

## Context
The Expo app must authenticate into the same Supabase Auth user system as the web app, keep auth tokens out of plain storage, and support Google/Apple provider login without shipping provider secrets. Destructive recent-auth must also be safe when an OAuth account picker can return a different account.

## Decision

### Google — system-browser OAuth with explicit PKCE

Google uses Supabase `signInWithOAuth` with `expo-web-browser` / `expo-auth-session`, not the free native `@react-native-google-signin` path. Supabase's Expo social-auth guidance supports `signInWithOAuth` on mobile, while the free native package cannot satisfy the nonce requirement for the `signInWithIdToken` flow.

The Supabase client is explicitly configured with `flowType: "pkce"`. The app opens the provider URL in the system auth session and accepts only a returned `?code=`. It then calls `exchangeCodeForSession(code)` using the same client/storage that created the PKCE verifier. There is deliberately **no implicit-flow fallback** that accepts `access_token` / `refresh_token` from the deep-link URL.

Redirect: `degself://` (allow-list `degself://**` in Supabase Auth URL Configuration). Google client id/secret remain only in the Supabase provider configuration; no Google secret or client id is required in the app bundle for this flow.

### Apple — native identity-token flow

Apple uses `expo-apple-authentication` on iOS and `signInWithIdToken({ provider: "apple", token, nonce })`. The app generates a random nonce, sends SHA-256(raw) to Apple, and sends the raw nonce to Supabase for verification. Sign in with Apple remains required on iOS because Google is offered as a primary third-party login.

### Destructive recent-auth — isolated candidate session + exact user-id gate

A normal provider sign-in mutates the Supabase client's current session. That is unacceptable for account-deletion reauthentication because Google/Apple account selection can resolve to another Supabase user.

For `AUTH_TOO_OLD`, the app therefore creates a **separate in-memory Supabase auth client** with PKCE and no persistent session. The provider flow runs against that isolated client. Its returned session is promoted into the persistent app client **only if** `fresh.user.id === original.user.id`. A mismatch fails closed. This prevents AuthProvider, FavoritesProvider, RLS writes, or deletion UI from ever observing a candidate wrong-account session. After promotion, the persistent client calls `getUser()` and checks the exact user id again as defense in depth.

Supabase's `auth.reauthenticate()` API is not used here because it sends an email/phone OTP and is not an OAuth-provider reauthentication primitive.

### Session storage

The persistent auth client uses the Supabase LargeSecureStore pattern: a random AES-256 key is kept in `expo-secure-store` (Keychain / Android Keystore at rest), while encrypted session ciphertext is stored in AsyncStorage. The key must enter JS memory for encryption/decryption; no Secure Enclave compute claim is made. Guest favorites are non-secret and remain in plain AsyncStorage.

Accepted failure mode: a crash between rotating the SecureStore key and writing the matching ciphertext can force a local re-login. It does not delete server data.

### Token refresh and concurrency

Auto-refresh follows the React Native `AppState` pattern: start while active, stop in background. The app does not pass a custom `lock`. In the installed auth-js line, custom locks are a deprecated legacy compatibility path; the omission is based on the package API rather than on any particular quickstart snippet.

### Config model

Only public runtime values are bundled through `EXPO_PUBLIC_*`: Supabase URL, Supabase publishable key, API base URL, and logical app environment. No service-role key, DB credential, WABA secret, provider secret, or admin credential is bundled.

## Dependencies
`@supabase/supabase-js@2.112.2` · `expo-secure-store@~57.0.1` · `@react-native-async-storage/async-storage@2.2.0` · `expo-crypto@~57.0.1` · `aes-js@^3.1.2` · `expo-apple-authentication@~57.0.1` · `expo-auth-session@~57.0.6` · `expo-web-browser@~57.0.2` · `expo-linking@~57.0.5` · `react-native-url-polyfill`.

## Consequences
- Auth requires a custom development/EAS build; Expo Go is not the release target.
- Google OAuth tokens are established through authorization-code PKCE, not exposed in the deep-link URL.
- A different account selected during deletion reauthentication can never become the app-wide session.
- Provider login must be re-tested on a real Android device after any auth-flow change; Apple remains real-device/credential gated until enrollment is available.
- If native Google One Tap becomes a product requirement, that is a separate owner decision and dependency review.
