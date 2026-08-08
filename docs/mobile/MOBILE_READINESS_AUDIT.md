# DEGSELF Mobile Readiness Audit

**Type:** Architecture/readiness audit (no app created, no deps installed during the audit).
**Master audited:** `f9239dd6b1f911efd221bffef670d57da9488b53`.
**External research date:** 2026-08-08 (primary sources: Expo, React Native, Supabase, Apple, Google).
**Evidence legend:** `[REPO]` verified in code · `[EXT]` primary external source · `[INF]` inference/recommendation · `[UNK]` unverified.

The binding decisions live in `MOBILE_ARCHITECTURE_CONTRACT.md`; dependency detail in `DEPENDENCY_ADOPTION_MATRIX.md`. This document records the findings.

---

## 1. System layer / ownership inventory `[REPO]`

| Module | Role | Classification | Shareable to mobile? |
|---|---|---|---|
| `src/app/[locale]/**` | web rendering (RSC/pages) | WEB UI | no |
| `src/proxy.ts` | next-intl + Supabase cookie refresh + admin gate + Arabic vanity URLs | SERVER ONLY (web) | no |
| `src/app/api/**` (28 routes) | server REST | SERVER ONLY | partial (create/asaali/delete only) |
| `src/lib/supabase/public.ts` (anon, cookieless) | public reads | DB/RLS | yes (pattern) |
| `src/lib/supabase/server.ts` (SSR cookies) | server session | SERVER ONLY (web) | no |
| `src/lib/supabase/admin.ts` (service-role) | RLS bypass | SERVER ONLY (secret) | no |
| `src/lib/workshops.ts` | read/search/rank/enrich | mixed: reads=DB; logic=PURE trapped in `unstable_cache` | needs extraction |
| `src/lib/searchSynonyms.ts` | dialect synonyms/stopwords | PURE/SHAREABLE | yes |
| `src/lib/normalize.ts` | Arabic normalize | PURE/SHAREABLE | yes |
| `src/lib/hours.ts` | isOpenNow | PURE/SHAREABLE | yes |
| `src/data/*.json` | enrichment (smart_score/tags) | DATA/SHAREABLE | yes |
| `src/lib/asaali-*` + `/api/asaali` | AI (Anthropic) + cost guard | SERVER ONLY (secret) | consume only |
| `src/lib/quotes.ts`, `quote-status.ts`, `quote-delivery.ts`, `network-quote-routing.ts` | quotes/offers/delivery/routing | SERVER ONLY (authoritative) | consume only |
| `src/lib/whatsapp.ts` + `WHATSAPP_*` | WABA | INTEGRATION (secret) | no |
| `src/lib/product-analytics.ts` + `/api/ds-b1` | PostHog anonymous | INTEGRATION (public token) | yes (pattern) |
| `src/lib/favorites*.ts` → `user_favorites` + RLS | favorites | DB/RLS + PURE(sync) | yes (direct) |
| `src/lib/admin-*` + `/admin/*` | admin (opaque session) | ADMIN ONLY (secret) | no |
| `messages/*.json` (ar/en/hi/ur) | translations | DATA/SHAREABLE | yes (data) |
| `src/i18n/*` (next-intl) | i18n runtime | WEB (next-intl server) | no (runtime) |
| `src/components/MapView.tsx` (react-leaflet) | web map | WEB UI | no (native maps needed) |
| `CallButton`/`WhatsAppButton` (`tel:`/`wa.me`) | contact | portable links | yes (via Linking) |

## 2. Customer journey → mobile decision matrix

| Feature | Web route | Owner | Data | Secret | RLS | Mobile decision | New endpoint | Blocker | MVP |
|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | workshops.ts | Supabase anon | no | yes | A+B | no | — | MUST |
| Search | `/search` | searchWorkshops (ILIKE search_text + JS rank/enrich) | Supabase anon | no | yes | A+B | maybe /api/search | P1 divergence | MUST |
| Workshop detail | `/workshop/[place_id]` | getWorkshop | Supabase anon | no | yes | A | no | — | MUST |
| Map | `/map` (leaflet) | getMapPoints | Supabase anon | no | yes | A + native map | no | — | SHOULD |
| Favorites | `/saved` | favorites.ts→user_favorites | Supabase | no | **yes** | A (proven live) | no | — | MUST |
| Login (Google) | `/login`,`/auth/callback` | Supabase Auth cookie/SSR | Auth | no | — | C→D native | deep-link + Apple | P1 (4.8) | MUST |
| Account | `/account` | profiles RLS | Supabase | no | yes | A | no | — | MUST |
| Account deletion | `POST /api/account/delete` | server, service-role, **cookie+Origin** | server | **yes** | — | D (Bearer adapter, one op) | adapt | **P1** | MUST |
| Ask DEGSELF | `POST /api/asaali` | server Anthropic + IP rate-limit + budget + cache | server | **yes** | — | C | per-user quota | P1 (cost) | SHOULD |
| Quote create | `POST /api/quotes` | server-authoritative | server | **yes** | — | C | no | — | SHOULD |
| Quote status / "my quotes" | `/offers/[token]` | server, customer_token | server | — | — | **D + BLOCKER** | ownership model | **P1** | POST-MVP |
| Offer accept | `POST /offers/[token]/accept` | server, token-gated | server | — | — | C via deep link | no | — | POST-MVP |
| Reviews | `/api/reviews` + cards | server anon; reads RLS approved-only | Supabase/server | no | yes | A read + C submit | — | P1 UGC (if shown) | SHOULD |
| Call / WhatsApp | `tel:`/`wa.me` | client links | — | no | — | A (Linking) | LSApplicationQueriesSchemes | — | MUST |
| Analytics | `/api/ds-b1` (random `distinct_id`, `$process_person_profile:false`) | proxy | PostHog | public token | — | A anonymous | — | — | SHOULD |
| Push | — (no schema) | — | — | — | — | **D new** | device_tokens + events | P2 | POST-MVP |
| WABA | server `WHATSAPP_*` | server-only | server | **yes** | — | **E** web/server only | — | — | WEB-ONLY |
| Admin / garage dashboards | `/admin/*` opaque session | server admin_credentials | server | **yes** | — | **E** web-only | — | — | WEB-ONLY |

## 3. Focused findings

- **Search (Phase 4)** `[REPO]`: `searchWorkshops` = anon client + ILIKE on trigram `search_text` + DB `rank_score` order, then **JS-side** enrichment overlay (`src/data/*.json`), facet filter, and re-sort. Pure/shareable parts: `normalizeArabic`, `expandToken`/synonyms/stopwords, `isOpenNow`, haversine, `passesEnrichment`/`sortList`, enrichment data. Web-bound: `unstable_cache`, RSC loaders. → mobile must not reimplement ranking independently; owner = `packages/domain` (preferred) or `/api/search`.
- **Ask DEGSELF (Phase 5)** `[REPO]`: `/api/asaali`, `ANTHROPIC_API_KEY`, model `claude-sonnet-5`, guard = **IP** rate-limit + monthly budget + 7-day cache + `hashIp`. Mobile may call the same canonical endpoint, but IP rate-limiting is weak on native (carrier NAT); a **per-user/device quota** is required before scale. Cost-abuse risk explicit.
- **Quote/offer flow (Phase 6)** `[REPO]`: create → server validate/rate-limit/dup-phone → network routing → delivery queue → WABA → garage opens token link → submits offer → customer views via `customer_token` → accept via `/offers/[token]/accept`. All state transitions **server-authoritative**. **Identity gap:** `quotes` has **no `user_id`**; customer identity = `customer_phone` + `customer_token`. A signed-in mobile user cannot securely list "my quotes" — **MOBILE BLOCKER (OD-01)**. Do not invent `user_id`.
- **Auth (Phase 7)** `[EXT]`: official Supabase RN pattern = native storage adapter + `autoRefreshToken` + `persistSession` + `detectSessionInUrl:false` + `processLock`, `flowType:'pkce'`; OAuth via `signInWithOAuth({skipBrowserRedirect:true})` + `WebBrowser.openAuthSessionAsync` + `makeRedirectUri` deep link + `setSession`; `AppState` → start/stop autoRefresh. Token → `expo-secure-store`; separate secrets from ordinary state. **Sign in with Apple** required on iOS.
- **Deep links (Phase 8)** `[REPO]`: no `.well-known/apple-app-site-association` or `assetlinks.json` present. Canonical HTTPS URLs stay primary; tokenized quote links stay server-verified. Owner = M6.
- **Push (Phase 9)** `[REPO]`: none today; no `device_tokens` table. Server-generated events; device tokens owned by `auth.users`; logout/delete clears tokens; **Expo Push first** (≤600 notif/s), FCM/APNs/OneSignal later. Push does not replace WABA garage delivery.
- **Localization (Phase 10)** `[REPO/EXT]`: locales ar (RTL default), en, hi (LTR), ur (RTL). `messages/*.json` are reusable data; next-intl runtime is web-bound. Mobile picks its own i18n runtime; RTL via `I18nManager` + logical `start/end`; switching RTL/LTR may require reload.
- **Reviews** `[REPO]`: user-facing anonymous submission (`ReviewForm` → `/api/reviews`, stored `pending`, moderated), reads limited to `approved` via RLS. If shown in-app, Apple 1.2 UGC moderation applies (OD-06).
- **Analytics** `[REPO]`: per-page random `distinct_id`, `$process_person_profile:false` — anonymous, no Supabase user id. Reuse anonymous model; per-user identity is OD-09.

## 4. Store-policy readiness `[EXT]` (observed 2026-08-08, primary Apple/Google)

| Requirement | Store | Rule (short) | DEGSELF status | Source |
|---|---|---|---|---|
| In-app account deletion | Apple 5.1.1(v) / Google | backend exists; need in-app entry + web deletion URL | NEEDS MOBILE IMPL + WEB PAGE | apple guidelines; support.google.com/.../13327111 |
| Privacy policy | Apple+Google | link in store + in-app | NEEDS POLICY + WEB | apple 5.1.1(i) |
| Apple App Privacy labels | Apple | mandatory to submit | NEEDS POLICY | app-privacy-details |
| Privacy manifests + required-reason + SDK signatures | Apple (since 2024-05-01) | GoogleSignIn on the list | NEEDS MOBILE IMPL | third-party-SDK-requirements |
| Play Data safety form | Google | mandatory | NEEDS POLICY | support.google.com/.../10787469 |
| **Sign in with Apple** | Apple 4.8 | required alongside Google Sign-In | **NEEDS MOBILE IMPL (top risk)** | apple guidelines |
| Permission purpose strings | Apple+Google | clear strings; request in context | NEEDS MOBILE IMPL | apple guidelines |
| Push consent | Apple 4.5.4/5.1.2 | push not required to function; opt-in/out | NEEDS MOBILE IMPL (later) | apple guidelines |
| UGC moderation (reviews) | Apple 1.2 | filter+report+block+EULA+contact | NEEDS MOBILE IMPL+POLICY (if shown) | apple guidelines |
| Minimum functionality | Apple 4.2/4.2.2 | not a repackaged site | LIKELY SATISFIED (verify no WebView core) | apple guidelines |
| Play target API | Google | **API 36 / Android 16** by **2026-08-31** (ext. 2026-11-01) | NEEDS BUILD CONFIG | support.google.com/.../11926878 |
| Apple SDK/Xcode | Apple | **Xcode 26 / iOS 26 SDK** from **2026-04-28** | NEEDS BUILD CONFIG | news/upcoming-requirements |
| WhatsApp/tel deep links | Apple+Google | allowed for native apps | MINOR (iOS `LSApplicationQueriesSchemes`) | apple guidelines |
| External payments | — | none in DEGSELF | N/A | — |

**Top two rejection risks:** (1) missing Sign in with Apple while Google is offered (4.8); (2) no in-app delete entry despite backend (5.1.1(v)).
**`[UNK]`:** full required-reason-API category list (verify before finalizing the manifest); whether Play needs a permission-declaration form for DEGSELF's set (foreground-only location typically doesn't).

## 5. Threat model (condensed) `[INF]`

| Threat | Current defense | Mobile mitigation |
|---|---|---|
| Stolen mobile token | delete cascades sessions/refresh (proven) | expo-secure-store + short refresh + device lock |
| Reverse-engineered publishable config | RLS is the boundary; no secret in client | keep all authority in RLS/server |
| Direct Supabase manipulation | RLS + no anon grants (proven 42501) | preserve least-privilege |
| Ask DEGSELF cost abuse | IP rate-limit + budget + cache | per-user/device quota (OD-05) |
| Quote/offer enumeration | opaque tokens + server authz | keep server-verified; no client caching of tokens in logs |
| Deep-link token leakage | server-verified links | don't persist tokenized links |
| PII in analytics | anonymous, no person profile | keep anonymous (OD-09) |
| Malicious workshop links | — | allow only `tel:`/`wa.me`/`https` |
| Compromised dependency | — | lockfile + `npm audit`/GHSA at adoption |

## 6. Blockers & GO/NO-GO

- **P0 (blocks creating `apps/mobile`):** none `[INF]`.
- **P1 (blocks the specific later PR):** OD-01 quote ownership `[REPO]`; OD-02 mobile delete auth transport `[REPO]`; OD-03 Sign in with Apple `[EXT]`; OD-04 search/domain ownership `[REPO]`; OD-05 Ask DEGSELF quota `[REPO]`; OD-06 UGC moderation `[EXT]`.
- **P2:** push architecture, `.well-known` files, native maps provider, EAS Update policy.

**Decision: GO — ready to create the `apps/mobile` foundation (M0)**, with the corrections in the architecture contract and the P1 items gating their later PRs. Nothing product-facing ships in M0.
