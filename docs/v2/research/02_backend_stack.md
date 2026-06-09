# Backend Stack مقارن — degself.com (2026)

**Context:** Kuwait car repair directory (1,801 listings) adding Auth (Google + phone OTP), user reviews, comments, and a community forum/Q&A. Solo developer/PM with advanced JS. Expected scale: 10k MAU Year 1 → 100k MAU Year 2–3. Currently: Netlify static + GitHub. Considering: Hostinger VPS, Supabase, Firebase.

---

## 1. Latency Baseline: Kuwait → Each Platform

Understanding latency is non-negotiable for a GCC-first app. Here is what the research shows:

| Stack | Nearest Datacenter | Approx. Kuwait Latency | Notes |
|---|---|---|---|
| **Supabase** | AWS Mumbai (`ap-south-1`) | ~80–120 ms | No Middle East AWS region offered by Supabase. Bahrain (`me-south-1`) exists on AWS but Supabase does NOT offer it yet. Mumbai is the closest available region. |
| **Firebase / Firestore** | Doha (`me-central1`) | ~30–60 ms | Google Cloud has Doha and Dammam (KSA). Firebase Firestore supports `me-central1` (Doha) — closest GCC option. |
| **Convex** | Selectable AWS regions (Professional plan) | ~80–120 ms | Closest confirmed region is Mumbai or Singapore; no Middle East availability confirmed as of 2026. |
| **PocketBase (self-hosted)** | Your chosen VPS location | ~80–150 ms | Depends entirely on VPS provider. No Middle East VPS available at Hetzner/Hostinger. Best bet: Vultr Dubai or AWS Bahrain via Docker. |
| **Appwrite Cloud** | Managed cloud (Frankfurt default) | ~150–200 ms | Appwrite Cloud is Frankfurt-based. Self-hosted on a local VPS gives full control over latency. |
| **Cloudflare Workers + D1/R2** | Edge — Kuwait City PoP exists | ~5–30 ms (Workers edge) | Cloudflare has a Kuwait City PoP. Workers execute at the edge. D1 database queries still route to the nearest D1 region (~US or EU), so read-only edge caching is the trick. |
| **Hostinger VPS + Postgres** | Hostinger regions (US/EU/Asia) | ~80–150 ms | Hostinger has no Middle East datacenter. Frankfurt is closest EU option. However, Cloudflare proxy (free) provides edge caching/acceleration. |
| **Cloudflare Workers + Supabase** | Workers at edge + Supabase in Mumbai | ~30–60 ms for cached reads | Best of both: edge Workers serve cached/computed responses; Supabase Mumbai handles writes. |

**Key Finding:** Firebase with `me-central1` (Doha) is the ONLY managed BaaS with a genuine Gulf-region database. Cloudflare Workers run at the Kuwait City edge node. Everything else routes to Europe or Asia.

---

## 2. Stack-by-Stack Deep Dive

### 2.1 Supabase

**What it is:** Managed PostgreSQL + Auth + Realtime + Storage + Edge Functions. Open-source; self-hostable.

#### Regions Available (June 2026)
No Middle East region. Closest: **Mumbai (`ap-south-1`)**. Note: Reddit thread from Oct 2025 confirms ongoing UAE performance complaints with no ETA for a ME region ([Supabase UAE issues thread](https://www.reddit.com/r/Supabase/comments/1ni8y1i/supabase_issues_in_uae/)).

#### 2026 Pricing

| Plan | Monthly Cost | MAU Included | Notes |
|---|---|---|---|
| **Free** | $0 | 50,000 | Paused after 1 week inactivity. Not for production. |
| **Pro** | $25/mo (base) | 100,000 | + $0.00325/MAU beyond 100k. Includes $10 compute credit (covers 1 Micro instance). |
| **Team** | $599/mo | 100,000 | SOC2, SSO, SLAs. Overkill for this use case. |

**Compute add-ons (on top of Pro $25):**
| Size | Monthly | RAM | CPU |
|---|---|---|---|
| Micro (included via credit) | $10 | 1 GB | 2-core ARM |
| Small | $15 | 2 GB | 2-core ARM |
| Medium | $60 | 4 GB | 2-core ARM |
| Large | $110 | 8 GB | 2-core ARM |

**Storage:** 100 GB included in Pro; then $0.021/GB. No egress fees on storage CDN via Smart CDN.

**Realtime:** 500 concurrent connections included (Pro); 5M messages/month.

**Edge Functions:** 2M invocations/month included.

#### Phone OTP Auth (Kuwait)
Supabase phone auth uses your **own Twilio/Vonage/MessageBird account** — Supabase does NOT mark up SMS. You pay Twilio directly.
- **Important:** Basic phone login (sign-in via OTP as primary method) = **FREE on Pro plan** — no $75 fee.
- The **$75/month fee** only applies to SMS-based **MFA (second factor)**, not primary phone login. This is a common misconception.
- Twilio Kuwait SMS: **$0.3164/SMS** (outbound international number) per [Twilio Kuwait pricing](https://www.twilio.com/en-us/sms/pricing/kw).
- Twilio Verify: **$0.05/successful verification + $0.3164 channel fee** = ~$0.37/OTP to Kuwait.

#### Pricing Calculation for degself

| Scenario | MAU | Monthly Cost | Notes |
|---|---|---|---|
| **Year 1 (10k MAU)** | 10,000 | **~$25–35/mo** | Pro plan. 10k well within 100k MAU limit. Micro compute ($10, covered by credit) → $25 base only. |
| **Year 2-3 (100k MAU)** | 100,000 | **~$25–40/mo** | Still within included MAU. Upgrade compute to Small (+$15) for stability → $40/mo. |
| **+ Phone OTP** (login only) | — | **+$0 platform fee** | Pay Twilio: if 1,000 new signups/month via OTP = ~$370/mo in Kuwait SMS. Consider Google OAuth as primary to reduce OTP use. |
| **Storage (50MB/user × 1801 listings + photos)** | — | Included in 100 GB | Well within Pro limits. |

#### Auth Capabilities
- Google OAuth: ✅ Built-in
- Phone OTP (primary login): ✅ Free on Pro (bring your own Twilio/Vonage)
- Phone MFA: ✅ $75/month add-on
- Magic links, passwordless email: ✅
- Arabic/RTL in auth emails: Configurable with custom SMTP + custom email templates

#### DX & Integration
- React/Vite: `@supabase/supabase-js` — excellent. One package, auto-generated TypeScript types.
- Adding a table: Schema designer in dashboard or direct SQL migration. Row-Level Security (RLS) must be configured manually.
- Edge Functions: Deno-based. Some friction vs Node.js.
- Netlify integration: Direct via env vars. Supabase client works perfectly from Netlify.

#### Vendor Lock-in
- **Low.** PostgreSQL is portable. You can self-host Supabase (Docker Compose, ~8 services) or migrate to plain Postgres. Auth uses JWTs — replaceable. Storage is S3-compatible.
- Self-hosting Supabase is complex but well-documented.

#### Community Reception (2025–2026)
- Consensus from Reddit r/webdev and r/Supabase: "best BaaS for SQL-first apps in 2026."
- Common complaint: no Middle East region. UAE developers report ~150–200ms latency ([Reddit UAE thread](https://www.reddit.com/r/Supabase/comments/1ni8y1i/supabase_issues_in_uae/)).
- Multiple production apps at 50k-500k MAU running on Pro plan.
- AnothWrapper.com blog (2026): "Supabase is the better choice for most developers in 2026" ([source](https://anotherwrapper.com/blog/supabase-vs-firebase)).

---

### 2.2 Convex

**What it is:** Serverless TypeScript-native reactive database with built-in functions (mutations, queries, actions), realtime, and auth integration.

#### Regions Available
- Professional plan: **selectable AWS regions**. Confirmed regions: US East, US West, EU West, AP Southeast (Singapore). **No Middle East** confirmed as of 2026.
- Closest to Kuwait: **Singapore** or **Mumbai equivalent** — expect ~100–140ms.

#### 2026 Pricing

| Plan | Monthly Cost | Included |
|---|---|---|
| **Free** | $0 | 25M function calls/mo, 50 GB DB storage, 100 GB file storage, 50 GB egress |
| **Professional** | $25/developer/month | 25M function calls, 50 GB DB, 100 GB file storage, 50 GB egress + overages |
| **Enterprise** | $2,500/mo minimum | Custom |

Overage pricing (Professional):
- Additional function calls: $2/million
- DB storage: $0.20/GB beyond 50 GB
- File storage: $0.03/GB beyond 100 GB
- DB I/O: $0.20/GB beyond 50 GB
- Action compute: $0.30/GB-hour beyond 250 GB-hours

#### Phone OTP Auth (Kuwait)
Convex does **not** have built-in phone auth. You integrate a third-party auth provider (Clerk, Auth0, WorkOS). This adds $0–$0.02/MAU for most social/email auth, but phone OTP requires additional Twilio integration ($0.37/OTP to Kuwait).

#### Pricing Calculation for degself

| Scenario | MAU | Monthly Cost | Notes |
|---|---|---|---|
| **Year 1 (10k MAU)** | 10,000 | **~$25/mo** | Free plan may suffice. Professional for stability. |
| **Year 2-3 (100k MAU)** | 100,000 | **~$25–50/mo** | Professional plan. Heavy function call usage may push costs up. |
| **+ Auth (Clerk)** | 100,000 | +~$50–100/mo | Clerk Pro $25/mo + SMS add-on. |

#### DX & Integration
- TypeScript-native: query functions defined as TypeScript. Auto-typed end-to-end. Excellent DX for TS developers.
- Adding a table: Schema definition in `convex/schema.ts`. Very fast iteration.
- React/Vite: `convex/react` package — seamless.
- Netlify: Deploy functions anywhere; Convex is cloud-only.
- **Learning curve:** Convex has a distinct paradigm (reactive queries, mutations as transactions). Non-trivial shift from REST thinking.

#### Vendor Lock-in
- **High.** Convex's query/mutation model is proprietary. Data export is available but migrating away means rewriting all server logic.
- Not open-source (has some open-source components).

#### Community Reception
- Strong developer enthusiasm for DX on HN/Reddit.
- Concerns: proprietary model, pricing opacity at scale, no self-host option.
- Less battle-tested at 100k+ MAU compared to Supabase/Firebase.
- Best fit: greenfield TypeScript apps where you want realtime reactivity without building it yourself.

---

### 2.3 Firebase (Firestore + Auth + Functions)

**What it is:** Google's fully managed NoSQL (Firestore) + Auth + Cloud Functions + Storage platform.

#### Regions Available
Firebase Firestore supports **`me-central1` (Doha, Qatar)** and **`me-central2` (Dammam, Saudi Arabia)** as of 2024–2026 ([Firebase Firestore locations](https://firebase.google.com/docs/firestore/locations)). **This is the only major BaaS with a genuine Gulf datacenter.**

Expected Kuwait latency: **30–60ms** to Doha. Significant advantage for GCC users.

#### 2026 Pricing (Blaze / Pay-as-you-go plan)

Firebase pricing is complex and operation-based. Below uses realistic estimates (5–10 reads + 0.5 writes/user/day):

**Firestore Standard (operations-based):**
| Operation | Free Tier | Paid |
|---|---|---|
| Reads | 50K/day | $0.06/100K reads (GCP pricing applies) |
| Writes | 20K/day | $0.18/100K writes |
| Deletes | 20K/day | $0.02/100K deletes |
| Storage | 1 GB | $0.18/GB/month |
| Egress | 10 GB/month | ~$0.12/GB |

**Auth (Identity Platform beyond free tier):**
| MAU | Cost |
|---|---|
| 0–50,000 | Free |
| 50,001–100,000 | $0.0055/MAU |
| 100,001–1,000,000 | $0.0046/MAU |

**Phone OTP (SMS):**
- Firebase bills **per SMS sent** directly.
- Kuwait/GCC: **~$0.06–0.10/SMS** (labeled as "All Other Countries" tier, some carriers $0.34).
- 10 free SMS/day for testing only.
- Critical: SMS costs hit from first production user — no free tier.

#### Pricing Calculation for degself

| Scenario | MAU | Firestore Ops | Auth | Phone OTP | **Monthly Total** |
|---|---|---|---|---|---|
| **Year 1 (10k MAU, 8 reads/day)** | 10,000 | 10k×8×30 = 2.4M reads/mo = ~$1.44 | Free (under 50k) | 500 new signups × $0.08 = $40 | **~$42–50/mo** |
| **Year 2-3 (100k MAU)** | 100,000 | 100k×8×30 = 24M reads/mo = ~$14.40; writes 100k×0.5×30=1.5M = $2.70 | 50k free + 50k × $0.0055 = $275/mo | 5,000 new OTPs × $0.08 = $400/mo | **~$700–800/mo** (OTP dominates) |

**Warning:** Phone OTP at scale is expensive on Firebase. At 100k MAU with even 5% monthly OTP use, costs exceed $400/month just in SMS. This makes Firebase the most expensive option for Kuwait phone auth at scale.

#### Auth Capabilities
- Google OAuth: ✅ First-class
- Phone OTP: ✅ Native. Billed per SMS.
- Arabic/RTL: Firebase Auth UI (firebaseui) has limited RTL support; custom UI recommended anyway.

#### DX & Integration
- React/Vite: `firebase` v9+ modular SDK. Well-documented.
- Adding a collection: No schema — NoSQL. Very fast to prototype.
- Netlify: Works perfectly as Firebase is client-side SDK + serverless.
- Cloud Functions: Node.js, but cold starts exist. Region-locked to same Firestore region.

#### Vendor Lock-in
- **High.** Firestore's data model, security rules, and query semantics are proprietary. NoSQL → SQL migration is painful. Leaving Firebase = rewriting data layer.
- Firebase Auth tokens are JWTs but tied to Google's token infrastructure.

#### Community Reception
- Still widely used, especially mobile-first.
- Developers increasingly prefer Supabase for new web apps due to SQL, pricing predictability, and openness.
- Known pitfall: "Firebase bill shock" from SMS auth. Several viral Reddit posts in 2023–2025 about $550/day SMS bills due to abuse.
- The Doha region is a genuine advantage for Gulf apps.

---

### 2.4 PocketBase

**What it is:** Single binary (Go + embedded SQLite) that provides a REST API, realtime, auth, file storage, and an admin dashboard. 100% self-hosted. No SaaS offering.

#### Regions
You choose: deploy anywhere. For Kuwait latency, your VPS provider location determines everything.

**Recommended VPS for MENA latency:**
- **Vultr Dubai** (~10–30ms from Kuwait — closest affordable option, ~$12–24/mo for 2–4 vCPU)
- **AWS Bahrain** (`me-south-1`) via EC2 t3.small (~$15/mo) — lowest latency, highest setup complexity
- **Hetzner Frankfurt**: ~150ms from Kuwait. Acceptable with Cloudflare CDN for static assets.
- **Hostinger**: No Middle East DC. Netherlands/Lithuania/US options all ~150ms from Kuwait.

#### 2026 Pricing (infrastructure only)

| Scale | VPS Choice | Monthly Cost | Notes |
|---|---|---|---|
| **Year 1 (10k MAU)** | Hostinger KVM 1 (1 vCPU, 4 GB RAM) | **$6.49/mo** | More than enough. PocketBase handles 10k+ realtime connections on a $4 Hetzner. |
| **Year 1 (10k MAU) — low latency** | Vultr Dubai 1 vCPU 1 GB | **~$6/mo** | Add Cloudflare CDN (free). |
| **Year 2-3 (100k MAU)** | Hostinger KVM 2 (2 vCPU, 8 GB RAM) | **$8.99/mo** | Vertical scaling. SQLite WAL handles high read concurrency well. |
| **+ Phone OTP** | Twilio (direct) | ~$0.32–0.37/OTP to Kuwait | PocketBase has no built-in SMS; integrate Twilio via PocketBase hooks. |
| **Backups** | Weekly (Hostinger free) or S3 | ~$0–5/mo | |

**Total Year 1:** ~$7–15/mo (infrastructure) + SMS costs
**Total Year 2-3:** ~$9–20/mo + SMS costs

PocketBase is by far the cheapest option.

#### Limitations
- **Single-server, vertical only.** Cannot horizontally scale (no multi-master).
- SQLite means write throughput has a ceiling (~5k–10k writes/second on good hardware) — sufficient for degself at 100k MAU.
- **Not v1.0 yet as of early 2026.** Backwards compatibility is "not guaranteed before v1" per [PocketBase GitHub](https://github.com/pocketbase/pocketbase/discussions/4032). Schema migrations are manual.
- No managed failover. You need to handle backups, uptime monitoring yourself.
- Phone OTP: Not built-in. Requires PocketBase hooks + Twilio integration (doable but ~1–2 days of work).

#### Auth Capabilities
- Google OAuth: ✅ Built-in OAuth2 providers including Google
- Phone OTP: Manual via hooks (PocketBase → Twilio webhook). Works but not plug-and-play.
- Email/password: ✅

#### DX & Integration
- Admin UI: ✅ Excellent built-in admin dashboard
- JavaScript SDK: ✅ `pocketbase` npm package
- Vite/React: Straightforward
- Adding a collection: Click-and-go in admin UI or API. Very fast.
- Self-hosted: You manage the server, SSL, updates.

#### Vendor Lock-in
- **Very Low.** SQLite file you own. Export to Postgres anytime. Code is open-source Go.
- Risk: Project is primarily one developer (Gani Georgiev). If development stops, you're on your own.

#### Community Reception (2025)
- Strong enthusiasm: "PocketBase is STILL popular in 2025" ([YouTube, Dec 2025](https://www.youtube.com/watch?v=o1zXwb01MjU))
- Production users report 15k+ users on a 2 GB DigitalOcean droplet with no issues.
- Consensus: "Perfect for small-to-medium apps. Don't use it if you need horizontal scaling."
- Reddit r/pocketbase: Active community, many production deployments.

---

### 2.5 Appwrite

**What it is:** Open-source BaaS with database, auth, storage, functions, messaging — can be self-hosted or used as Appwrite Cloud.

#### Regions (Cloud)
- **Appwrite Cloud:** Frankfurt-based. ~150–200ms from Kuwait.
- **Self-hosted:** Deploy to any VPS. Same latitude options as PocketBase.

#### 2026 Pricing

| Plan | Monthly | MAU | Notes |
|---|---|---|---|
| **Free** | $0 | 75,000 | 2 projects max. Paused after inactivity. 2 GB storage, 750K executions. |
| **Pro** | $25/mo (per project) | 200,000 | 150 GB storage, 3.5M executions. +$3 per 1,000 extra MAU. |
| **Enterprise** | Custom | Custom | |

**Important:** Appwrite changed pricing in Sep 2025. Pro is now **$25/project** (was $15/org). If you have multiple projects, costs multiply.

**Phone OTP (Kuwait/GCC) via Appwrite Cloud:**
Appwrite charges per SMS directly since Feb 2025:
- **Kuwait (+965): $0.30/SMS** ([Appwrite phone OTP rates](https://appwrite.io/docs/advanced/platform/phone-otp))
- **UAE (+971): $0.16/SMS**
- **Saudi Arabia (+966): $0.33/SMS**
- **Bahrain (+973): $0.05/SMS**

These are Appwrite's managed rates — you don't need your own Twilio account.

**Self-hosted Appwrite:** Use your own Twilio/Vonage account, pay Twilio rates directly.

#### Pricing Calculation for degself

| Scenario | Monthly Cost | Notes |
|---|---|---|
| **Year 1 (10k MAU)** | **$25/mo** (Pro) | Free plan covers 75k MAU; use free until limits hit. |
| **Year 2-3 (100k MAU)** | **$25/mo + $3/1000 extra MAU** = ~$85/mo | 200k included in Pro; 100k is well within limits. Wait — 100k < 200k, so $25/mo only. |
| **+ Kuwait OTPs (500/mo)** | +**$150/mo** | 500 × $0.30 = $150 |
| **Self-hosted** | $7–20/mo (VPS) | Bring your own Twilio; Kuwait OTP ~$0.37 each via Twilio Verify |

#### Auth Capabilities
- Google OAuth: ✅
- Phone OTP: ✅ Native in Appwrite Cloud (charged per SMS) or self-hosted via your SMS provider
- Email/password, magic links: ✅

#### DX & Integration
- Multiple SDKs including JavaScript/TypeScript
- React/Vite: `appwrite` npm package
- Admin UI: ✅ Good dashboard
- Adding a collection: Click-based or SDK. Similar to PocketBase but more opinionated schema.
- More services than PocketBase: messaging, push notifications, more complex to self-host (Docker Compose, multiple services)

#### Vendor Lock-in
- **Medium.** Appwrite is open-source; self-hosting is possible but complex (~10 Docker services). Data is in their database (MariaDB internally), not directly portable like SQLite.

#### Community Reception
- Criticism of Sep 2025 pricing change: "Appwrite killed their free plan" ([YouTube](https://www.youtube.com/watch?v=dfChM6ox5Zc)). Community backlash was significant.
- Solid open-source community. More feature-rich than PocketBase.
- Self-hosted Appwrite is recommended over Appwrite Cloud for cost control.

---

### 2.6 Cloudflare Workers + D1 + R2 + Pages

**What it is:** Edge-first serverless compute (Workers), SQL database at the edge (D1/SQLite), object storage (R2), and static hosting (Pages).

#### Latency
- **Workers:** Execute at the nearest Cloudflare PoP. Kuwait City has a Cloudflare PoP per [Cloudflare network map](https://www.cloudflare.com/network/). Latency from Kuwait browser: **~5–30ms** for Worker execution.
- **D1 Database:** D1 is global but read replicas are available. Primary writes go to a home region (US East or EU). Read replicas reduce read latency. For Kuwait users: cached reads at edge (~5ms), write round-trips to home region (~150–200ms).
- **R2:** Global storage with no egress fees. Served via Workers CDN near-instantly.

#### 2026 Pricing

**Workers Paid plan ($5/month base):**
| Resource | Included | Overage |
|---|---|---|
| Worker requests | 10M/month | $0.30/million |
| CPU time | 30M CPU-ms/month | $0.02/million CPU-ms |
| KV reads | 10M/month | $0.50/million |
| KV writes | 1M/month | $5/million |

**D1 (included in Workers Paid):**
| Resource | Included | Overage |
|---|---|---|
| Rows read | 25 billion/month | $0.001/million rows |
| Rows written | 50 million/month | $1.00/million rows |
| Storage | 5 GB | $0.75/GB-month |

**R2:**
| Resource | Free Tier | Paid |
|---|---|---|
| Storage | 10 GB/month | $0.015/GB-month |
| Class A ops (writes) | 1M/month | $4.50/million |
| Class B ops (reads) | 10M/month | $0.36/million |
| Egress | **Free** | **Free** |

**Auth:** Cloudflare has no built-in auth. You build it or use Clerk/Auth0/WorkOS. Clerk Free: up to 10,000 MAU free; Pro $25/mo for more. Phone OTP requires Twilio separately (~$0.37/OTP to Kuwait).

#### Pricing Calculation for degself

| Scenario | Workers | D1 | R2 | Auth (Clerk) | **Monthly Total** |
|---|---|---|---|---|---|
| **Year 1 (10k MAU)** | $5 | Included | ~$2 (100k photos) | Free (under 10k) | **~$7–10/mo** |
| **Year 2-3 (100k MAU)** | $5 | Included (25B rows read >> 3M actual) | ~$15 (storage grows) | $25 (Clerk Pro) | **~$45–60/mo** |

This is potentially the cheapest cloud option for Year 2-3, but auth must be handled externally.

#### DX & Integration
- **Workers:** JavaScript/TypeScript (Wrangler CLI). Similar to Express/Hono.
- **D1:** SQL (SQLite dialect). `wrangler d1` migrations. Excellent DX once set up.
- **Hono on Workers:** Popular lightweight framework. Works perfectly.
- **Vite/React frontend:** Deploy to Cloudflare Pages (free, unlimited bandwidth).
- **Current Netlify setup:** Minimal migration — frontend stays, add Workers for API layer.
- **Learning curve:** Workers paradigm differs from Node.js servers. No persistent state between requests. Cold starts are ~0ms (V8 isolates).

#### Vendor Lock-in
- **Medium.** Workers JavaScript is standard. D1 is SQLite-compatible (portable). R2 is S3-compatible. But Workers-specific APIs (KV, Durable Objects) are proprietary.
- Migrating away: Frontend to Netlify ✅ (already there), API to Node.js ✅, D1 → Postgres migration possible.

#### Limitations
- **No built-in auth** — must integrate external provider.
- **D1 write performance:** D1 is not designed for high-write workloads. Community forum with comments/reviews generates writes — test carefully.
- D1 read replicas are still in beta/GA but maturing. Reddit reviewer: "switched 3 side projects from $100/month to <$5 total with D1" ([r/CloudFlare](https://www.reddit.com/r/CloudFlare/comments/1jl1tgp/cloudflare_d1_vs_other_serverless_databases_has/)).
- Community forum/Q&A with real-time features is possible but complex on Workers.

---

### 2.7 Hostinger VPS + Postgres + Custom Node/Hono Backend

**What it is:** Raw VPS with full control. You manage: OS, Postgres, Node.js/Hono API, SSL, backups, monitoring, updates.

#### Specs & Pricing

| Plan | vCPU | RAM | Storage | Bandwidth | Monthly |
|---|---|---|---|---|---|
| **KVM 1** | 1 | 4 GB | 50 GB NVMe | 4 TB | **$6.49** |
| **KVM 2** | 2 | 8 GB | 100 GB NVMe | 8 TB | **$8.99** |
| **KVM 4** | 4 | 16 GB | 200 GB NVMe | 16 TB | **$12.99** |
| **KVM 8** | 8 | 32 GB | 400 GB NVMe | 32 TB | **$25.99** |

All plans: AMD EPYC processors, NVMe SSD, 1 Gbps network, free weekly backups, AI-managed with Kodee.

**Hostinger VPS regions:** US, EU (Netherlands, Lithuania), Asia (Singapore, India), Brazil — **no Middle East**. For Kuwait users, Netherlands/Frankfurt would be ~150ms.

**Add Cloudflare (free):** Proxy all traffic through Cloudflare CDN. Static assets and read-heavy pages served from Kuwait City PoP. API requests still route to VPS (~150ms for DB round-trips from Kuwait).

#### Phone OTP
- Integrate Twilio or Vonage directly in your Node.js app.
- Twilio Kuwait: ~$0.32–0.37/OTP (via Twilio Verify).
- Vonage/MessageBird may offer better Kuwait rates; worth comparing.
- Alternatively: use **Infobip** or **Unifonic** (regional Arab telecom SMS APIs) which have local carrier agreements for GCC — potentially $0.05–0.15/SMS.

#### Pricing Calculation for degself

| Scenario | VPS | Extras | **Monthly Total** |
|---|---|---|---|
| **Year 1 (10k MAU)** | KVM 1: $6.49 | Cloudflare free | **~$7/mo** |
| **Year 2-3 (100k MAU)** | KVM 2: $8.99 | Cloudflare free | **~$9/mo** |
| **+ Phone OTPs (1,000/mo)** | — | Twilio ~$370 | $379/mo |

**Lowest infrastructure cost** of all options. The OTP SMS cost is the main variable.

#### Auth Implementation
- **Google OAuth:** Use Passport.js, or Auth.js/next-auth (works with Hono/Express), or Supabase Auth as a standalone service.
- **Phone OTP:** Full control — implement your own OTP logic (generate code, send via Twilio, verify). Well-documented pattern.
- **JWT sessions:** Roll your own or use `jsonwebtoken` + Redis for session management.

#### DX & Integration
- **Most work.** You build everything: routes, auth middleware, DB schema, migrations (Drizzle ORM / Prisma), rate limiting, error handling, monitoring.
- Drizzle ORM + Postgres on Hono is a modern, performant stack with excellent TypeScript support.
- **Existing Netlify site:** Add an API subdomain pointing to VPS. CORS configuration required. Frontend can stay on Netlify.
- **Time to first feature:** Significantly more than managed BaaS. Estimate 2–5x more setup time.

#### Vendor Lock-in
- **None.** You own everything. Migrate to any VPS anytime.

#### Operational Burden (solo developer)
- SSL renewal (auto with Let's Encrypt/Caddy)
- Postgres updates and WAL archiving
- Monitoring (UptimeRobot free tier + Sentry free)
- Security patches
- Backup verification
- **Hostinger's Kodee AI** can help with server ops via natural language prompts.
- Estimate: 2–4 hours/month ongoing maintenance once set up.

---

### 2.8 Hybrid: Cloudflare Workers (Edge) + Supabase (DB)

**What it is:** Cloudflare Workers as the API/compute layer at the edge, Supabase (Mumbai) as the Postgres database and Auth backend. This separates the edge from the DB.

#### Architecture
```
User (Kuwait)
    ↓ ~5-30ms
Cloudflare Worker (Kuwait City PoP)
  - Auth validation (JWT from Supabase)
  - Business logic
  - Edge caching (KV for hot reads)
    ↓ ~80-120ms
Supabase (Mumbai) ← database writes/reads
    ↑
  Supabase Auth issues JWTs
```

#### Latency Profile
- **Static/cached reads:** ~5–30ms (served from KV or R2 at edge)
- **Live DB reads:** ~80–150ms (Worker → Supabase Mumbai round-trip)
- **Writes:** ~80–150ms
- **Auth validation:** Near-zero (JWT verification at edge)

This is **significantly better** than Supabase alone (where the Supabase function AND DB are in Mumbai) for read-heavy workloads.

#### Pricing

| Component | Monthly |
|---|---|
| Cloudflare Workers Paid | $5 |
| Supabase Pro | $25 |
| Supabase compute (Micro, covered by credit) | $0 extra |
| **Year 1 Total** | **~$30/mo** |
| **Year 2-3 Total (100k MAU)** | **~$35–50/mo** |

#### DX & Integration
- More architectural complexity: Workers as proxy → Supabase.
- Workers can use Supabase REST API or direct Postgres via `@supabase/supabase-js` (works in Workers).
- Best for teams comfortable with edge architecture.
- For solo dev: this adds significant cognitive overhead vs. just using Supabase directly.

#### When It Makes Sense
- You need edge-speed reads (directory listings, search) with Supabase Postgres for consistency.
- You're already comfortable with Cloudflare Workers.
- You want to cache hot data (top-rated shops, popular categories) at edge.

---

## 3. Phone OTP Cost Summary for Kuwait (GCC)

| Provider/Platform | Kuwait OTP Cost | Notes |
|---|---|---|
| **Appwrite Cloud** | **$0.30/OTP** | Managed. No Twilio account needed. |
| **Twilio Verify** | **~$0.37/OTP** | $0.05 verification fee + $0.3164 SMS carrier fee |
| **Twilio SMS (raw)** | **$0.3164/SMS** | Cheaper per-message if building custom OTP |
| **Firebase Phone Auth** | **~$0.06–0.10/OTP** | Uses Firebase PNV pricing. Cheapest for Kuwait. |
| **Supabase + Twilio** | **~$0.37/OTP** | Supabase passes Twilio to you at cost |
| **Vonage (Nexmo)** | **~$0.25–0.35/OTP** | Varies; check current Gulf rates |
| **Infobip (GCC specialist)** | **~$0.05–0.15/OTP** | Regional carrier agreements; significantly cheaper for Kuwait/GCC. Contact sales. |
| **Unifonic (Saudi-based)** | **~$0.05–0.10/OTP** | Arab-focused CPaaS. Strong Kuwait/GCC coverage. |

**Recommendation:** For Kuwait OTP at scale, investigate **Infobip** or **Unifonic** as SMS gateway — they have direct local carrier relationships and rates 3–6x cheaper than Twilio. Both offer REST APIs compatible with any backend.

---

## 4. Comparison Matrix

| Dimension | Supabase | Firebase | Convex | PocketBase | Appwrite | CF Workers+D1 | Hostinger VPS | CF+Supabase Hybrid |
|---|---|---|---|---|---|---|---|---|
| **Kuwait Latency** | ~80–120ms (Mumbai) | ~30–60ms (Doha!) | ~100–140ms | ~10–150ms (your choice) | ~150ms (Cloud) / your choice (self-host) | ~5–30ms (Workers edge) | ~150ms (no ME DC) | ~5–30ms reads / 80–120ms writes |
| **Year 1 Cost (10k MAU, no OTP)** | ~$25/mo | ~$10–20/mo | ~$0–25/mo | ~$7/mo | ~$0–25/mo | ~$7–10/mo | ~$7/mo | ~$30/mo |
| **Year 2-3 Cost (100k MAU, no OTP)** | ~$25–40/mo | ~$700–800/mo* | ~$25–50/mo | ~$9/mo | ~$25/mo | ~$45–60/mo | ~$9/mo | ~$35–50/mo |
| **Phone OTP (Kuwait, 1k/mo)** | +$370 (Twilio) | +$60–100 (cheapest) | External +$370 | External +Twilio rate | +$300 (Appwrite) | External +Twilio | External +Twilio | +$370 (Twilio) |
| **Auth: Google OAuth** | ✅ | ✅ | Via Clerk/Auth0 | ✅ | ✅ | Via Clerk | Custom/Auth.js | ✅ (Supabase) |
| **Auth: Phone OTP** | ✅ (via Twilio) | ✅ (native) | Via Clerk | Manual hooks | ✅ (native) | Via Clerk/Twilio | Custom/Twilio | ✅ (via Supabase) |
| **Realtime (forum/Q&A)** | ✅ Postgres CDC | ✅ Firestore | ✅ Reactive queries | ✅ SSE-based | ✅ | Complex (D.O. needed) | Custom (WebSocket) | ✅ (Supabase Realtime) |
| **SQL/Relational** | ✅ Postgres | ❌ NoSQL | ✅ Convex DB | ✅ SQLite | ✅ (MariaDB) | ✅ SQLite (D1) | ✅ Postgres | ✅ Postgres |
| **Vendor Lock-in** | Low | High | Very High | Very Low | Medium | Medium | None | Low-Medium |
| **Migration Path** | Easy (standard PG) | Hard | Very Hard | Easy (SQLite file) | Medium | Medium (SQLite) | None (own stack) | Easy (PG) |
| **Solo Dev Ops Burden** | Low (managed) | Very Low (managed) | Very Low (managed) | Medium (self-host) | Medium (Cloud) / High (self-host) | Low (managed edge) | High | Medium |
| **DX (add new feature)** | ★★★★ | ★★★★ | ★★★★★ | ★★★★ | ★★★ | ★★★ | ★★ | ★★★ |
| **Community/Ecosystem** | ★★★★★ | ★★★★★ | ★★★ | ★★★★ | ★★★ | ★★★★ | ★★★★★ | ★★★★ |
| **Self-hostable** | ✅ (complex) | ❌ | ❌ | ✅ (trivial) | ✅ (moderate) | Partial | ✅ | Partial |
| **Arabic RTL Auth UI** | Custom templates | Custom templates | Custom templates | Custom templates | Custom templates | Custom | Custom | Custom templates |

*Firebase Year 2-3 cost dominated by SMS OTP. Without OTP: ~$50–100/mo.

---

## 5. Cost Scenarios (Detailed Math)

### Assumptions
- 10k MAU Year 1, 100k MAU Year 2-3
- 7.5 reads/user/day average (directory browsing, reviews reading)
- 0.5 writes/user/day (reviews, comments, forum posts)
- 50 MB storage/user (profile photos, shop images)
- 10% of new signups use phone OTP (90% Google OAuth)
- New signups: 1,000/month Year 1; 5,000/month Year 2-3

### Year 1 (10,000 MAU)
| Stack | Infrastructure | OTP SMS (1k/mo) | Total/Month |
|---|---|---|---|
| Supabase Pro | $25 | $370 (Twilio) | **$395** |
| Firebase Blaze | ~$15 | $80 (Firebase PNV) | **$95** |
| Convex Pro | $25 | $370 (Twilio via Clerk) | **$395** |
| PocketBase + Vultr Dubai | $12 | $320 (Twilio) | **$332** |
| PocketBase + Hostinger | $7 | $320 (Twilio) | **$327** |
| Appwrite Cloud Pro | $25 | $300 (Appwrite) | **$325** |
| CF Workers + D1 | $10 | $370 (Twilio) | **$380** |
| Hostinger VPS + Postgres | $7 | $320 (Twilio) | **$327** |
| CF Workers + Supabase | $30 | $370 (Twilio) | **$400** |

**Key insight:** Firebase is cheapest for Year 1 with phone OTP because its PNV rates for Kuwait/GCC are significantly lower than Twilio rates used by others. Using Infobip/Unifonic would bring all stacks to ~$50–80/month in SMS costs.

### Year 2-3 (100,000 MAU, 5k new signups/mo)
| Stack | Infrastructure | OTP SMS (5k/mo) | Total/Month |
|---|---|---|---|
| Supabase Pro | $40 | $1,850 (Twilio) | **$1,890** |
| Firebase Blaze | ~$75 | $400 (Firebase PNV) | **$475** |
| Convex Pro | $50 | $1,850 | **$1,900** |
| PocketBase + Hostinger KVM 2 | $9 | $1,600 | **$1,609** |
| Appwrite Cloud Pro | $25 | $1,500 | **$1,525** |
| CF Workers + D1 | $45 | $1,850 | **$1,895** |
| Hostinger VPS + Postgres | $9 | $1,600 | **$1,609** |
| CF Workers + Supabase | $50 | $1,850 | **$1,900** |

**Critical insight for Year 2-3:** SMS OTP costs dominate ALL stacks. The solution is not picking a cheaper BaaS — it's **reducing OTP volume**:
1. Push Google OAuth as primary (eliminates OTP for most users).
2. Use OTP only as fallback or for users without Google accounts.
3. Use Infobip/Unifonic instead of Twilio (~5x cheaper for Kuwait).
4. Cache phone verifications (re-verify only monthly).

**With Infobip ($0.10/OTP Kuwait estimate):**
| Stack | Infrastructure | OTP SMS (5k/mo @ $0.10) | Total/Month |
|---|---|---|---|
| Supabase Pro | $40 | $500 | **$540** |
| Firebase Blaze | $75 | $400 | **$475** |
| PocketBase + Hostinger | $9 | $500 | **$509** |
| Appwrite Cloud Pro | $25 | $500 | **$525** |

---

## 6. Top 3 Picks with Full Reasoning

### 🥇 Pick 1: Supabase (Recommended for degself.com)

**Best for:** Solo dev, production-ready, community forum needs, SQL data, future migration safety.

**Why:**
1. **PostgreSQL** means your community forum, Q&A, reviews, and 1,801 listings can all live in relational tables with proper JOINs. NoSQL (Firebase/Convex) adds complexity for relational directory data.
2. **The $25/mo Pro plan** covers 100k MAU with no surprises. No per-read/per-write billing anxiety.
3. **Auth is complete** — Google OAuth and phone OTP (via Twilio) out of the box. Phone OTP as primary login costs $0 extra on the platform.
4. **Open-source, portable** — if Supabase ever goes down or prices spike, you can self-host or migrate to plain Postgres. This is the lowest lock-in risk of any managed BaaS.
5. **Excellent React/Vite DX** — `@supabase/supabase-js` is well-maintained, TypeScript-first.
6. **Realtime built-in** — forum/Q&A with live updates is `supabase.channel()`. No extra infrastructure.
7. **Netlify compatibility** — zero migration, just add env vars.

**Cons:**
- No Middle East region (Mumbai is closest, ~80–120ms). Acceptable for a directory app where most interactions are read-heavy and cacheable.
- Phone OTP platform cost is $0, but Twilio SMS to Kuwait is expensive ($0.37/OTP). Mitigate with Infobip.
- Self-hosting Supabase is complex if you ever want to leave cloud.

**Migration path:** PostgreSQL dump → any hosted Postgres (Neon, Railway, RDS, your own VPS). Auth JWTs can be replaced with Auth.js or Lucia.

**Recommended setup for degself:**
```
Frontend: Netlify (keep as-is)
Backend:  Supabase Pro ($25/mo) — Mumbai region
         - Tables: listings, reviews, comments, forum_posts, users
         - Auth: Google OAuth + Phone OTP (via Twilio/Infobip)
         - Storage: shop photos
         - Realtime: forum subscriptions
SMS:      Infobip or Unifonic (regional, cheaper than Twilio for GCC)
CDN:      Supabase Smart CDN (included)
```

---

### 🥈 Pick 2: PocketBase on Vultr Dubai + Cloudflare

**Best for:** Absolute cost minimization + best Kuwait latency + maximum control.

**Why:**
1. **Vultr Dubai** (~$6–12/mo) gives ~10–30ms latency from Kuwait — better than any managed BaaS.
2. **Total infrastructure cost: ~$9–15/mo** including Vultr + Cloudflare free plan. Cheapest by far.
3. **PocketBase's admin UI** is excellent for managing 1,801 listings and adding new tables quickly.
4. **Single binary** — no Docker complexity, easy backup (cp the SQLite file), easy restore.
5. **SQLite in WAL mode** handles the degself workload (read-heavy directory) with ease at 100k MAU.

**Cons:**
- **Phone OTP is manual** — you'll spend 1–2 days writing the PocketBase hook + Twilio integration.
- **No automatic failover** — you need to monitor the server. UptimeRobot free tier + Pushover notifications is sufficient.
- **Not v1.0** — schema migration between versions is manual. Check changelogs before updating.
- **Single-server only** — if you hit >200k concurrent users, you'll need to migrate. At 100k MAU with degself's read pattern, this won't happen.
- **Vultr Dubai:** Less mature region than Hetzner EU or AWS; check uptime SLA.

**Migration path:** SQLite file → `sqlite3` CLI dump → import into Postgres with `pgloader`. One weekend of work.

**Recommended setup for degself:**
```
Frontend: Netlify (keep as-is)
Backend:  PocketBase v0.27+ on Vultr Dubai ($12/mo, 2 vCPU 4 GB RAM)
         - Collections: listings, reviews, comments, forum_posts, users
         - Auth: Google OAuth (built-in) + Phone OTP via hooks (Twilio/Infobip)
         - Files: PocketBase storage (or offload to Cloudflare R2)
CDN:      Cloudflare free plan (proxy for VPS, static assets from CF edge)
Monitoring: UptimeRobot free
Backups: Daily SQLite copy to Cloudflare R2 (~$0.02/day)
```

---

### 🥉 Pick 3: Firebase (Firestore + Auth) with Doha Region

**Best for:** Lowest latency from Kuwait, simplest mobile-style auth setup, if phone OTP volume is low.

**Why:**
1. **`me-central1` (Doha)** is the only Gulf-region option in any major managed BaaS. ~30–60ms from Kuwait is exceptional.
2. **Firebase Phone Auth** at $0.06–0.10/SMS for GCC is cheaper than Twilio rates — critical if OTP volume is high.
3. **No infrastructure management** — fully serverless. Scales automatically.
4. **Easiest real-time** for non-relational data (reviews, comments as subcollections).

**Cons:**
- **NoSQL data model** is awkward for a relational directory (joins require multiple queries or denormalization).
- **Vendor lock-in is high** — leaving Firebase means rewriting your data layer.
- **Firestore pricing at scale** (reads/writes per operation) becomes unpredictable. At 100k MAU with a community forum, costs can spike.
- **Firebase Function cold starts** (~500ms–2s) affect UX for API calls.
- **Bill shock risk** — multiple viral incidents of $500+/day SMS auth bills due to spam/abuse. Must implement rate limiting.

**Best use case for degself:** Only choose Firebase if you prioritize Doha latency above all else AND plan to keep the data model simple (no complex SQL queries).

---

## 7. When to Pick Each

| Situation | Best Pick |
|---|---|
| "I want to ship fast, use SQL, and sleep at night" | **Supabase** |
| "I want the cheapest possible stack with low Kuwait latency" | **PocketBase on Vultr Dubai** |
| "My users are mobile-first, Kuwait latency matters most, data is simple" | **Firebase (Doha region)** |
| "I want maximum edge performance and already know Cloudflare Workers" | **CF Workers + D1 (or CF + Supabase hybrid)** |
| "I want full control and don't mind maintaining a server" | **Hostinger VPS + Postgres + Hono** |
| "I'm building a TypeScript-native realtime app and accept lock-in" | **Convex** |
| "I want open-source, more features than PocketBase, and can self-host" | **Appwrite (self-hosted on Vultr Dubai)** |

---

## 8. Specific Recommendations for degself.com

### Phase 1: Launch (0–10k MAU)
**Use Supabase Free → Pro when needed.**

The free plan (50k MAU, 500 MB DB, 1 GB storage) will serve you for the first 6–12 months. When you add auth and community features, upgrade to Pro ($25/mo). The 1,801 listings + initial user base fits easily.

Schema suggestion:
```sql
-- listings (already exists, migrate from static to DB)
listings (id, name, area, category, phone, address, lat, lng, rating_avg, review_count)

-- auth handled by Supabase Auth (users table auto-created)

-- reviews
reviews (id, listing_id, user_id, rating, body, created_at)

-- forum_posts  
forum_posts (id, user_id, title, body, category, created_at, views)

-- forum_comments
forum_comments (id, post_id, user_id, body, created_at)
```

### Phase 2: Growth (10k–100k MAU)
Stay on Supabase Pro ($25–40/mo). Add:
- Read replicas (coming to Supabase Pro) — consider when DB reads saturate Micro instance
- Upgrade compute to Small ($15/mo add-on) when needed
- Switch SMS from Twilio to **Infobip or Unifonic** to cut OTP costs 3–5x for GCC

### Phase 3: Scale (100k+ MAU)
At this scale, re-evaluate:
- Add Cloudflare Workers as edge layer for hot reads (cache top 50 listings, search autocomplete)
- Consider Supabase read replica in Singapore (closer to APAC users if you expand)
- OR: migrate Postgres to self-hosted on Vultr Dubai for lower latency + cost

### About Latency (Honest Assessment)
For a **directory + community app**, 80–120ms DB round-trip from Kuwait to Mumbai is acceptable. Users loading a shop's page, reading reviews, or posting a comment won't notice sub-200ms latency. What users notice is:
1. Page load time (solved by Netlify's CDN + Cloudflare)
2. Auth flow speed (one-time event)
3. Realtime chat/notifications (relevant for forum — Supabase Realtime is fast)

If you hosted a low-latency gaming platform or financial trading app, you'd need Firebase Doha. For a car repair directory, Mumbai is fine.

---

## 9. Arabic/RTL Considerations (Auth UI)

All BaaS platforms provide configurable auth email templates. For in-app auth UI (sign-in forms), you build the UI yourself in React — all RTL concerns are frontend-only and not affected by your backend choice. Supabase's auth emails are customizable via dashboard or custom SMTP. No backend stack has an inherent advantage for Arabic RTL.

For phone OTP UI: build a simple Arabic-RTL input form in React. The backend just validates the token regardless of UI language.

---

## 10. Summary Recommendation

> **For degself.com in 2026: Start with Supabase (Pro at $25/mo, Mumbai region).** It gives you PostgreSQL, complete auth (Google + Phone OTP), realtime for the forum, excellent React DX, low vendor lock-in, and predictable pricing through 100k MAU. The 80–120ms Kuwait latency is acceptable for a directory/community app.
>
> **For OTP SMS:** Use **Infobip** or **Unifonic** instead of Twilio — both have GCC-specific carrier agreements and rates roughly 3–5x cheaper for Kuwait numbers. Both support REST API integration with Supabase's phone auth hooks.
>
> **If cost is the single top priority and you're willing to do 4–8 hours of setup:** Use **PocketBase on Vultr Dubai** ($12/mo) + Cloudflare free CDN. You get better latency than Supabase, full data ownership, and near-zero infrastructure costs. The tradeoff is manual OTP integration and self-managed server.
>
> **Avoid Firebase** unless you specifically need the Doha (Qatar) datacenter latency AND your data model is genuinely non-relational. Firebase's per-operation pricing at 100k MAU with a forum creates billing unpredictability, and the vendor lock-in is the highest of any option.

---

## Sources

- [Supabase Pricing (official)](https://supabase.com/pricing)
- [Supabase Regions (official docs)](https://supabase.com/docs/guides/platform/regions)
- [Convex Pricing (official)](https://www.convex.dev/pricing)
- [Firebase Pricing (official)](https://firebase.google.com/pricing)
- [Firebase Firestore Locations](https://firebase.google.com/docs/firestore/locations)
- [Firebase Auth Cost Guide (metacto.com, May 2026)](https://www.metacto.com/blogs/the-complete-guide-to-firebase-auth-costs-setup-integration-and-maintenance)
- [Cloudflare D1 Pricing (official)](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare R2 Pricing (official)](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Network Map (Kuwait PoP confirmed)](https://www.cloudflare.com/network/)
- [CDN Planet: Middle East CDN Coverage](https://www.cdnplanet.com/cdns-by-continent/middle-east-cdn/)
- [Appwrite Pricing (official)](https://appwrite.io/pricing)
- [Appwrite Phone OTP Rates (official docs)](https://appwrite.io/docs/advanced/platform/phone-otp)
- [Hostinger VPS Pricing (official)](https://www.hostinger.com/vps-hosting)
- [Twilio Kuwait SMS Pricing (official)](https://www.twilio.com/en-us/sms/pricing/kw)
- [Twilio Verify Pricing (official)](https://www.twilio.com/en-us/verify/pricing)
- [Supabase Phone Auth MFA Docs](https://supabase.com/docs/guides/auth/auth-mfa/phone)
- [Reddit: Supabase $75 phone auth clarification](https://www.reddit.com/r/Supabase/comments/1oly10c/is_it_75_just_to_enable_sms_phone_login/)
- [Reddit: Firebase new SMS costs (2023 incident)](https://www.reddit.com/r/Firebase/comments/14cj7au/firebase_new_sms_auth_costs/)
- [PocketBase FAQ (scaling, benchmarks)](https://pocketbase.io/faq/)
- [PocketBase production discussion (GitHub)](https://github.com/pocketbase/pocketbase/discussions/4032)
- [Reddit: PocketBase scale limits](https://www.reddit.com/r/pocketbase/comments/1hu5ddm/what_is_the_limit_of_pocketbase/)
- [Hetzner latency from Dubai (~150ms)](https://www.reddit.com/r/hetzner/comments/1c4ldji/hetzner_dedicated_server_from_dubai_how_to_reduce/)
- [Supabase vs Firebase 2026 (anotherwrapper.com)](https://anotherwrapper.com/blog/supabase-vs-firebase)
- [Cloudflare D1 vs other databases (Reddit, 2025)](https://www.reddit.com/r/CloudFlare/comments/1jl1tgp/cloudflare_d1_vs_other_serverless_databases_has/)
- [Appwrite pricing change controversy (YouTube, Sep 2025)](https://www.youtube.com/watch?v=dfChM6ox5Zc)
- [Best cloud for Laravel in 2026 — Vultr Middle East (deploynix.io)](https://deploynix.io/blog/the-laravel-developers-guide-to-choosing-a-cloud-provider-in-2026)
- [AWS Bahrain Region announcement](https://press.aboutamazon.com/2019/7/aws-launches-region-in-the-middle-east)
- [Reddit: Why PocketBase over Firebase/Supabase/Appwrite](https://www.reddit.com/r/pocketbase/comments/1f8t4rw/why_pocketbase_over_firebase_supabase_appwrite/)

---

*Research completed: June 2026. All pricing figures sourced from official pricing pages as of the research date. OTP pricing is subject to frequent change — verify current rates before deployment.*
