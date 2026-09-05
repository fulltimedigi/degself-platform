# ADR-0007 — Sign in with Apple (resolves OD-03)

**Status:** Accepted — **REQUIRED** · **Date:** 2026-08-08 · **PR:** M1
**Primary sources accessed:** 2026-08-08

## Context
App Store Review Guideline **4.8 ("Login Services")** requires that an app using a third-party/social login to set up or authenticate the **primary account** must **also** offer an equivalent login that (a) limits collection to name + email, (b) lets the user keep their email private, and (c) does not track in-app activity for ads without consent. Five exemptions exist (own-account-system-only; alternative marketplace; education/enterprise account; government/industry eID; pure third-party-service client).

## Decision — REQUIRED
DEGSELF offers **Google Sign-In** as a primary-account login, and **none of the five exemptions apply** (Supabase Auth is not "the company's own account system" in the exemption's sense — the disqualifier is the presence of the third-party Google login). Therefore **Sign in with Apple MUST ship on iOS.**

**Implementation (supported native path — not a WebView):**
- `expo-apple-authentication@~57.0.1` (iOS-only; New-Architecture-compatible). Config plugin `expo-apple-authentication` + `ios.usesAppleSignIn: true` → adds the `com.apple.developer.applesignin` entitlement (**verified generated via `expo prebuild`**).
- `AppleAuthentication.signInAsync({ requestedScopes:[FULL_NAME,EMAIL], nonce: sha256(rawNonce) })` → `supabase.auth.signInWithIdToken({ provider:'apple', token: identityToken, nonce: rawNonce })`. The identity resolves into the **same** Supabase Auth user system as Google.
- **Nonce:** Apple receives `SHA-256(rawNonce)`; Supabase receives the raw nonce and re-hashes to verify the token's `nonce` claim (replay/interception defense).
- **Supabase provider (native-only):** register the bundle id `com.degself.app` in the Apple provider's Client IDs. **No** Services ID / Team ID / Key ID / `.p8` secret is needed for the native token flow (those are web/OAuth-only).

**Platform gating:** the Apple button renders only on iOS where `AppleAuthentication.isAvailableAsync()` is true; Android shows Google only.

## Sources (2026-08-08)
- Apple — App Store Review Guidelines §4.8: https://developer.apple.com/app-store/review/guidelines/
- Expo — Apple Authentication SDK: https://docs.expo.dev/versions/latest/sdk/apple-authentication/
- Supabase — Login with Apple: https://supabase.com/docs/guides/auth/social-login/auth-apple
- Apple — 2026 SDK submission requirement (iOS 26 SDK / Xcode 26 from April 2026): https://developer.apple.com/news/?id=6lxhtioi

## Consequences
- Owner must enable the **Sign In with Apple** capability for `com.degself.app` in the Apple Developer portal (EAS Build registers it automatically) and add the bundle id to the Supabase Apple provider.
- Real Apple login is verifiable only on an iOS device/simulator with owner Apple credentials — config verified here; provider login is a native-build gate.
- The April 2026 iOS-26-SDK submission mandate is satisfied by a fresh EAS Build (Xcode 26 image).
