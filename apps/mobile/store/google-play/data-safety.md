# Google Play Data safety — DEGSELF Android 1.0

Prepared for the exact feature set in this release. Re-audit this file whenever an SDK, permission, analytics event, review form, quote flow, location feature, or push notification is added.

## Store-level answers

- Data collected or shared: **Yes — collected**. No data is sold. Service providers process data on DEGSELF's behalf.
- Data encrypted in transit: **Yes** (HTTPS/TLS for DEGSELF, Supabase, Google, Apple, and map links).
- Account creation: **Optional**. Core browsing/search works without an account.
- Account deletion: **Yes** — in-app `Account → Danger zone → Delete account` and external `https://degself.com/privacy#data-deletion`.
- Independent security review: **Do not claim one** unless a qualifying published review is completed.
- Ads: **No**. The Android app contains no ads SDK.

## Data types to declare

| Google Play category | Collected | Shared | Required | Purpose | Retention/deletion note |
|---|---:|---:|---|---|---|
| Personal info — Email address | Yes | No | Optional | Account management, authentication | Supabase Auth; deleted with account |
| Personal info — Name | Yes, if supplied by Google/Apple | No | Optional | Account management | Provider metadata; deleted with account |
| Personal info — User IDs | Yes | No | Optional | Account management, security, favorites ownership | Supabase Auth ID; deleted with account |
| Photos — Profile photo | Potentially, if supplied by sign-in provider | No | Optional | Account display/management | Declare conservatively unless OAuth scopes/metadata are changed to exclude it |
| App activity — In-app search history | Yes, processed transiently | No | Required only when searching | App functionality, security/diagnostics | Sent in the API URL to return results; DEGSELF does not intentionally build a user search-history profile |
| App activity — Other actions | Yes: saved workshop identifiers for signed-in users | No | Optional | App functionality, sync | Deleted with account; guest favorites never leave the device |
| Device or other IDs | No advertising/device ID collected by app code | No | — | — | Reassess if analytics, push, attestation, or ads is added |
| Location | No in this release | No | — | — | App requests no Android location permission; map opens an external URL |
| Crash logs / diagnostics | No dedicated mobile SDK in this release | No | — | — | Reassess if crash reporting is added |

“Shared: No” relies on Google Play's service-provider exception: Supabase/Vercel/Google/Apple process data to provide DEGSELF, under provider terms, and DEGSELF does not sell it or use it for cross-company advertising.

## Evidence in the release

- Android permissions are explicitly empty in `app.json`; storage, overlay, and vibration permissions contributed by libraries are explicitly blocked.
- Android cloud backup is disabled so guest favorites and local app state are not copied into device backup.
- Auth sessions are encrypted at rest with a key protected by Android Keystore; ciphertext is stored locally.
- Public workshop search is read-only and returns a restricted DTO without internal audit/ranking fields.
- Authenticated favorites use user-owned Supabase rows protected by RLS.
- Account deletion removes the authentication account, profile, and saved workshop rows through the canonical server operation.
- Privacy policy: `https://degself.com/privacy`.
- Deletion anchor: `https://degself.com/privacy#data-deletion`.

## Manual Play Console check

The publisher must copy these answers into **Policy and programs → App content → Data safety** and submit them. The repository cannot submit this legal declaration automatically. Confirm the production binary's final SDK list in Play Console before approval.
