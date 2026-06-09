# Reviews, Community & Moderation — Feature Spec for degself.com
**Kuwait Car Repair Directory | Arabic-speaking Market**
*Research compiled June 2026*

---

## Executive Summary

This document is a concrete, decision-complete spec for Phase 2 (reviews) and Phase 3 (community) of degself.com. Every design decision is resolved with a recommendation and rationale, grounded in what Yelp, Trustpilot, Google Maps, TripAdvisor, Discourse, and Reddit have learned at scale — adapted for the Kuwait Arabic-mobile-first context.

**Key theme:** Launch the minimum lovable v1, resist feature creep, and solve trust before scale.

---

## Table of Contents
1. [Review System Design](#1-review-system-design)
2. [Moderation](#2-moderation)
3. [Community / Forum (Phase 3)](#3-community--forum-phase-3)
4. [Cold Start Problem](#4-cold-start-problem)
5. [Mobile & Arabic UX](#5-mobile--arabic-ux)
6. [V1 Launch Checklist vs. Deferred Features](#6-v1-launch-checklist-vs-deferred-features)
7. [Database Schema Sketch](#7-database-schema-sketch)
8. [Implementation Priorities](#8-implementation-priorities)

---

## 1. Review System Design

### 1.1 Rating Scale: 1–5 Stars (not 1–10, not thumbs)

**Decision: 1–5 stars.**

| Option | Verdict | Reason |
|---|---|---|
| 1–5 stars | ✅ Use this | Universal mental model across Google Maps, Yelp, Tripadvisor. 5 states is cognitively easy. |
| 1–10 stars | ❌ Skip | Adds precision nobody wants. Yelp, Google Maps, TripAdvisor all chose 5. |
| Yes/No recommend | ❌ Skip for v1 | Works for Netflix content; terrible for local service discovery where you need signal gradient (3-star ≠ 1-star). |
| Thumbs up/down | ❌ Skip | Good for engagement/personalization (YouTube), poor for comparative ranking of local businesses. |

**Display:** Show the decimal average (e.g., "4.7") alongside the count ("138 تقييم"). Research from [Smashing Magazine](https://www.smashingmagazine.com/2023/01/product-reviews-ratings-ux/) confirms that 70% of consumers prefer a 4.5-star product with 180 reviews over a 4.8-star product with 39 reviews — count matters as much as score.

Show the **histogram distribution** (the "J-shape" bar chart: 5★, 4★, 3★, 2★, 1★). This is the single strongest trust signal on a review page. Platforms without it look like they're hiding something. [Yelp](https://www.yelp-press.com/press-releases/press-release-details/2026/Yelp-Releases-2025-Trust--Safety-Report/default.aspx) and [Trustpilot](https://corporate.trustpilot.com/trust/trust-report-2025) both show distribution prominently.

### 1.2 Multi-Dimensional vs. Single Rating

**Decision: Single aggregate + 3 sub-dimensions, sub-dims optional at submission, displayed as averages only.**

For a car repair shop, the three most meaningful axes (validated by what users ask about in Kuwait Facebook groups about car repair):

| Dimension | Arabic label | Why it matters |
|---|---|---|
| جودة العمل (Work Quality) | Primary | Did they actually fix the car? |
| السعر (Pricing) | High value in GCC market | Kuwait consumers are price-aware even with high income |
| السرعة (Speed / Turnaround) | High value | How long did I wait? |

**Implementation rules:**
- Overall 1–5 star is mandatory.
- Sub-dimensions are optional (a single tap — 1–5 stars each).
- Show sub-dimension averages on the listing page only when ≥5 reviewers have filled that dimension.
- Do NOT make sub-dims required — every extra required field reduces submission rate by ~15–25%.

This mirrors [Airbnb's approach](https://uxdesign.cc/the-ux-of-rating-systems-bc4f9d424b90) (optional category ratings after a general score) and [Booking.com](https://blog.prototypr.io/5-star-rating-systems-are-finished-whats-the-way-forward-b02591439185) (category breakdowns that give real insight beyond the average).

### 1.3 Text Reviews: Minimums and Incentives

**Decision:**
- **Minimum length: 30 Arabic characters** (~10 words). This filters "تمام" (fine), "زين" (good) single-word reviews that carry no signal.
- **Maximum: 2,000 characters.** Enough for detailed descriptions without becoming a blog.
- **Suggested prompt:** After rating, show: *"أخبر الآخرين عن تجربتك — ما الذي أعجبك؟ وماذا تتمنى أن يتغير؟"* ("Tell others about your experience — what did you like? What would you change?")
- **Don't require text for sub-dimensions** but do prompt for it when a user gives 1 or 2 stars ("أخبرنا ما الذي حدث" — "Tell us what happened").

Research from [Yelp's 2024 Trust & Safety Report](https://www.yelp-ir.com/news/press-releases/news-release-details/2025/Yelp-Releases-2024-Trust--Safety-Report/default.aspx) confirms that reviews "lacking sufficient details about the consumer experience" are now algorithmically filtered. Length and specificity are trust signals.

### 1.4 Photo Uploads

**Decision: Yes, photos in reviews — optional, mobile-first upload.**

- Allow up to **5 photos per review**.
- Accept JPEG/WebP; compress on-server to max 1200px wide, 800KB.
- Photos appear in a carousel on the review card.
- [Yelp's expert Emily Washcovick confirms](https://www.youtube.com/watch?v=WEr_TE89p1g): "88% of people don't just want stars — reviews with text and photos are more trustworthy."
- For Kuwait: workshop photos (before/after repairs, diagnostic screens, finished results) are particularly compelling and not currently available on Facebook Groups.

### 1.5 Verified Visit

**Decision: Soft verification in v1, hard verification in v2.**

**The challenge:** Unlike e-commerce, there's no receipt to check. Yelp has no verified-visit mechanism (their algorithm merely infers it from location data). [CoreVouch](https://www.corevouch.com/blog/yelp-google-vs-verified-reviews) attempts receipt photo upload + OCR — interesting but complex for v1.

**V1 approach — Behavioral trust scoring:**
1. **Phone number verification** required at registration (OTP). Kuwait mobile penetration is ~99%, so this has near-zero friction and dramatically cuts fake accounts.
2. A "verified phone" badge on reviews from verified accounts.
3. Store the reviewer's **account age** and **review count** — surface this on their profile card (e.g., "عضو منذ 6 أشهر، 12 تقييم").
4. Flag for human review any review from an account <48 hours old.

**V2 approach — QR code verification:**
- Give each shop a QR code (printed sticker or digital card).
- When a customer scans it and leaves a review within 7 days of the scan, the review gets a "تم التحقق من الزيارة" (Verified Visit) badge.
- This is achievable with a one-time token tied to the QR scan, no OCR needed.
- [Yelp's algorithm](https://www.reputationx.com/blog/beat-yelp-algorithm) already relies heavily on whether a reviewer physically visited a business before reviewing; this formalizes that signal.

### 1.6 Owner Response Feature

**Decision: Yes, include in v1.**

This is not optional. [BrightLocal's 2024 survey](https://www.brightlocal.com/research/local-consumer-review-survey-2024/) found:
- **88%** of consumers would use a business that responds to all reviews
- Only **47%** would use a business that doesn't respond at all
- Consumers are **41% more likely** to choose a business that responds to reviews

**Implementation:**
- Businesses can post one response per review.
- Response is labeled "رد صاحب المحل" (Owner Response) with a verified badge.
- Response cannot be edited after 30 days (prevents reputation manipulation).
- Email notification to reviewer when owner responds.
- Owner response does NOT change the star rating.

### 1.7 Helpful/Unhelpful Voting

**Decision: Helpful-only voting in v1; no downvote.**

- Single "مفيد ✓" (Helpful) button per review, visible after login.
- Show count: "مفيد لـ 12 شخصاً" (Helpful to 12 people).
- Don't show downvote in v1 — it enables vote manipulation against competitors and requires complex systems to combat.
- [UX Knowledge Base](https://uxknowledgebase.com/the-ux-of-ratings-and-reviews-80d3cbfc9a15) confirms: "Let users indicate if a review was helpful or not" is a best practice, with the caveat that the helpful/unhelpful distinction should be protected against gaming.

### 1.8 Sort Orders

**Decision: Offer 3 sort options with "Most Relevant" as default.**

| Sort | Arabic | Default? | Logic |
|---|---|---|---|
| الأكثر فائدة (Most Relevant) | Yes | Bayesian blend: recency × helpful votes × length score |
| الأحدث (Most Recent) | No | Pure timestamp desc |
| الأعلى تقييماً (Highest Rated) | No | Star rating desc |

**"Most Relevant" formula (v1 simple version):**
```
score = (helpful_votes × 2) + (length_bonus) + (recency_decay)
length_bonus = min(char_count / 200, 3)
recency_decay = max(0, 3 - days_since_posted / 60)
```

This ensures that a 3-week-old detailed helpful review outranks a yesterday's one-liner. Refine with A/B testing once you have data.

### 1.9 Rating Distribution Display

**Decision: Always show the histogram, make bars clickable as filters.**

```
5 ★ ████████████████░░░░  74%  (102)
4 ★ ████░░░░░░░░░░░░░░░░  18%  (25)
3 ★ ░░░░░░░░░░░░░░░░░░░░   4%  (5)
2 ★ ░░░░░░░░░░░░░░░░░░░░   2%  (3)
1 ★ ██░░░░░░░░░░░░░░░░░░   2%  (3)
```

- Clicking "1 ★" filters to show only 1-star reviews (important for trust).
- The "J-shape" distribution (heavy 5s and 4s, smaller 1s) is the shape users consider most authentic per [Smashing Magazine's research](https://www.smashingmagazine.com/2023/01/product-reviews-ratings-ux/).
- Show this above the review list, not hidden behind a tab.

---

## 2. Moderation

### 2.1 Pre-Moderation vs. Post-Moderation

**Decision: Post-moderation by default, with pre-moderation triggers for high-risk reviews.**

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Pre-moderation (all reviews held) | Maximum control | Kills user experience, delays trust signal, high ops cost | ❌ Only for high-risk cases |
| Post-moderation (live immediately) | Fast user experience, scalable | Harmful content briefly visible | ✅ Default |
| Auto-hold triggers | Targeted | Requires upfront engineering | ✅ Layer on top |

**Auto-hold triggers (review goes to queue before publishing):**
1. Account age < 48 hours
2. First review on the platform ever
3. Automated toxicity score > 0.75
4. Contains phone number, URL, or competitor business name
5. User has active flag from previous review
6. Review length > 1500 chars (unusual, could be pasted content)

### 2.2 Arabic Auto-Moderation

**Warning: Most English-first tools have poor Arabic support.**

| Tool | Arabic Support | Status | Recommendation |
|---|---|---|---|
| Perspective API | Limited Arabic | **Sunsetting Dec 2026** | Do NOT build on this |
| Azure Content Moderator | Arabic profanity ✅ | Active | Good fallback but English-only classification |
| OpenAI Moderation API | Multilingual | Active | Best current option for Arabic |
| Custom regex wordlist | Manual | Always available | Essential as baseline |

**Recommended stack for Arabic moderation:**

**Layer 1 — Custom Arabic regex blocklist (build this first):**
```python
# Core categories to maintain:
# 1. Sexual/obscene Arabic terms (both MSA and Gulf dialect variants)
# 2. Religious insults (هجوم على الدين)  
# 3. Sectarian terms (طائفية)
# 4. Competitor spam patterns (review bomb signatures)
# 5. Phone numbers / WhatsApp numbers in reviews (spam signal)
ARABIC_PROFANITY_PATTERNS = [
    r'[\u0600-\u06FF]{2,}',  # placeholder — populate with actual terms
    r'(?:واتس|واتساب|تلفون|جوال)\s*[\d\+]+',  # contact info in reviews
    r'https?://|www\.',  # URLs
]
```

**Layer 2 — OpenAI Moderation API** (`omni-moderation-latest`):
- Supports Arabic; categories: harassment, hate, sexual, violence.
- Cost: free tier available; ~$0.002/1k requests at scale.
- Flag threshold: score > 0.70 for auto-hold; score > 0.90 for auto-reject.
- [Azure Content Moderator](https://docs.azure.cn/en-us/ai-services/content-moderator/text-moderation-api) supports Arabic profanity term detection as a complement.

**Layer 3 — Human review queue:**
- All auto-held reviews go to a simple admin dashboard.
- One person (you) can review 20–30 reviews/day in early stages.
- Build a simple approve/reject/edit UI before launch.

**Arabic-specific moderation pitfalls:**
- The same profane word may appear with different hamza forms: أ/إ/ا — normalize before checking.
- Gulf dialect (Kuwaiti) profanity differs from Egyptian/Levantine Arabic — your wordlist must be Kuwait-specific.
- Mixed Arabic-English reviews (Arabizi: Arabic written in Latin script, e.g., "w0rk5hop khar") are common among younger Kuwaitis; your regex must handle both scripts.
- Reviews about car repairs will legitimately use aggressive slang for poor service ("خرب سيارتي" = "they destroyed my car") — don't over-block frustrated legitimate reviewers.

### 2.3 Fake Review Detection

**The threat model for degself.com:**
1. **Competitor bombing** — rival shops posting 1-star reviews
2. **Owner self-promotion** — shop owners asking friends/family for 5-star reviews
3. **AI-generated reviews** — GPT-written reviews with no real visit

[Yelp's 2025 Trust & Safety Report](https://www.yelp-press.com/press-releases/press-release-details/2026/Yelp-Releases-2025-Trust--Safety-Report/default.aspx) filtered nearly **500,000 AI-generated reviews** in 2025 — this is now a first-order problem even for small platforms.

**Detection signals to implement:**

| Signal | Detection Method | Action |
|---|---|---|
| Velocity spike | >5 reviews for one listing in 24h | Auto-hold all; alert admin |
| New account reviewing | Account < 48h old | Auto-hold |
| Review bomb pattern | Multiple accounts, similar IPs, same listing, <1h apart | Auto-hold; flag for manual review |
| Exact duplicate text | Levenshtein distance < 20% vs. existing reviews | Auto-reject |
| Device fingerprint overlap | Same device ID reviewing multiple competing shops | Soft flag |
| Review-to-listing distance | Reviewer geolocation far from listing (Kuwait only) | Soft flag (not auto-reject) |
| AI-generated content | Low perplexity score (uniform, formal style) | Route to human review |
| Suspiciously perfect score | All 5-stars from single business cluster | Visual warning to users ("تم التحقق من هذه التقييمات") |

**For AI detection without a dedicated API:**
```python
# Simple heuristic: AI reviews tend to be uniformly formal and use rare words consistently
# Flag reviews with: high avg word length + no Kuwaiti dialect markers + no punctuation errors
def is_potentially_ai(text):
    avg_word_len = sum(len(w) for w in text.split()) / len(text.split())
    has_dialect = bool(re.search(r'چ|پ|گ|ويد|يبا', text))  # Kuwaiti dialect markers
    return avg_word_len > 6 and not has_dialect and len(text) > 200
```

**Owner self-promotion controls:**
- A business owner account cannot leave reviews for their own listing (database-enforced).
- Phone number used for business registration cannot be used for reviewer account registration on the same listing.

### 2.4 Report / Flag System

**Pattern: Simple report modal with predefined reasons (not free text).**

```
لماذا تبلغ عن هذا التقييم؟
○ ليس من تجربة حقيقية
○ محتوى مسيء أو إهانة
○ يحتوي على معلومات مضللة  
○ محتوى غير لائق
○ أخرى
```

- After 3 flags from different users, review enters moderation queue automatically.
- Reporter gets a "شكراً، سنراجع التقييم" confirmation; no further contact unless you have time for it.
- Do NOT tell the reporter the outcome (creates conflict escalation risk).

### 2.5 User Trust Scores

**Decision: Implement a hidden trust score in v1; expose reputation indicators to users in v2.**

**V1 hidden trust score components:**

```python
trust_score = (
    account_age_days * 0.3 +          # max 30 pts after 100 days
    verified_phone * 20 +              # 0 or 20
    review_count * min(review_count, 5) * 2 +  # up to 50 pts
    helpful_votes_received * 1 +       # unbounded signal
    flag_penalties * -15               # each confirmed bad-faith flag
)
# Score < 20: auto-hold all reviews
# Score 20-50: post-moderation with soft checks
# Score > 50: trusted, bypass auto-hold
```

**V2 user reputation (visible):**
- Show "المراجع الموثوق" (Trusted Reviewer) badge for users with score > 80 and ≥10 reviews.
- This mirrors [Discourse's Trust Level system](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/) — trust earned through participation, not purchased.

### 2.6 Kuwait Legal Considerations

**This is serious. Kuwait has a restrictive online speech environment.**

Key laws to know ([Kuwait Cybercrime Law No. 63/2015](https://smex.org/kuwaits-cybercrime-law/), [Press & Publications Law No. 3/2006](https://www.article19.org/resources/kuwait-new-cyber-crimes-law-restricts-expression-and-targets-online-activists/)):

| Risk | Legal Basis | Platform Action Required |
|---|---|---|
| Review criticizing a business owner personally (not the service) | Defamation provisions; potential civil liability | TOS must prohibit personal attacks; distinguish service criticism from personal attacks |
| Review containing religious insult | Cybercrime Law Art. 4 | Auto-detect and block; immediate removal |
| Review mentioning competitor by name as a political attack | Press Law Art. 21 | Moderate competitor mentions |
| Review about a prominent figure (not relevant here) | Cybercrime Art. 6 | N/A for car repair |

**Practical steps:**
1. **Terms of Service** must clearly state: reviews must be based on firsthand service experience; personal attacks on individuals are prohibited; content violating Kuwaiti law will be removed.
2. **Right-to-be-forgotten:** Kuwait does not have GDPR-equivalent law, but best practice for trust is to offer owners a formal dispute path (not auto-removal) and users the ability to delete their own reviews.
3. **If a Kuwaiti business owner claims a review is defamatory:** Do not auto-remove. Route to manual review. Consult a Kuwaiti legal advisor before building an automated removal pipeline. Trustpilot's model — [escalating warnings rather than immediate removal](https://corporate.trustpilot.com/legal/for-everyone/action-we-take/mar-2026) — is a good reference.
4. **Store reviewer IP addresses** (hashed/private) for a minimum of 90 days — you will need this if legal disputes arise.

### 2.7 Right-to-Be-Forgotten

**Decision: Allow reviewers to delete their own reviews (fully) at any time. Allow businesses to dispute but not delete.**

- Reviewer can delete their review from their account dashboard.
- Deletion is permanent; the star rating is recalculated.
- Business owners can submit a dispute with reason; disputed reviews go to moderation queue for human decision.
- No auto-removal based on business request alone (per Trustpilot's policy — this is the right call for platform trust).

---

## 3. Community / Forum (Phase 3)

### 3.1 Pattern Choice: Q&A vs. Forum vs. Feed

| Pattern | Examples | Good for | Weakness |
|---|---|---|---|
| Q&A (question + accepted answer) | StackOverflow, Quora | Technical troubleshooting, definitive answers | High friction to post; cold start very hard |
| Forum (threaded topics) | Discourse, Reddit | Ongoing discussion, community building | Needs critical mass |
| Feed (reverse-chronological) | Twitter/X, Facebook Groups | High-frequency casual sharing | Poor discoverability; ephemeral |

**Decision for degself.com Phase 3: Forum pattern (Discourse/Reddit-style), NOT pure Q&A.**

Rationale:
- You're replacing Facebook Groups, which is feed-based — but Facebook Groups fail at *searchability* and *threading*. Your forum should solve what Facebook Groups can't, not replicate them.
- Car owners in Kuwait primarily need two things: (1) "من يعرف عن هالمشكلة؟" (who knows about this problem?) and (2) "تجارب مع هالورشة؟" (experiences with this shop?). Both are discussion threads, not Q&A.
- Pure Q&A (StackOverflow) is too formal and feels like a test — works for programming, not for "my AC stopped working, help."
- Feed pattern has no memory — the value degrades daily.

**Hybrid approach:** Use threaded forum topics, but add an "answered" flag to threads where a good answer was confirmed — this gives Q&A discoverability without the StackOverflow friction.

### 3.2 Starting Structure for Kuwait Cars

**Recommended category structure (keep it small — 4–6 categories max at launch):**

```
degself Community
├── 🔧 أعطال وإصلاحات (Faults & Repairs)
│   └── Post a problem, get community advice
├── 🏪 تجارب الورش (Workshop Experiences)  
│   └── Share experiences with specific shops (link to listing)
├── 💰 أسعار وعروض (Prices & Deals)
│   └── Is this price fair? Workshop running a deal?
├── 🚗 نصائح السيارات (Car Tips)
│   └── Maintenance tips, seasonal advice (Kuwait summer heat)
└── 💬 عام (General)
    └── Off-topic, introductions, feedback on the site
```

**Don't start with more than 5 categories.** Empty categories look like a ghost town. Reddit learned this — their category structure grew bottom-up from usage. Start narrow, split when categories overflow.

### 3.3 Open-Source Platform Options

All three are actively maintained in 2026 ([Elest.io comparison](https://blog.elest.io/discourse-vs-flarum-vs-nodebb-which-self-hosted-forum-platform-in-2026/)):

| Platform | Stack | Real-time | Mobile UX | Arabic/RTL | Solo Dev Ops | Recommendation |
|---|---|---|---|---|---|---|
| **Discourse** | Rails + React/Ember | Partial | Good | Plugin available | Hard (Docker + Postgres + Redis + Sidekiq) | Best features, hardest ops |
| **Flarum** | PHP/Laravel + Mithril | Weak | Excellent | Extension exists | Easy (PHP + MySQL) | Best for small communities |
| **NodeBB** | Node.js + MongoDB | Excellent (WebSockets native) | Good | Plugin exists | Medium | Best real-time |
| **Lemmy** | Rust + ActivityPub | Moderate | Moderate | Poor | Medium | Skip — federated, not right fit |
| **Misago** | Python/Django | Limited | Moderate | Poor | Medium | Niche, small community |

**Recommendation for degself.com (solo developer):**

**Phase 3 Option A (recommended): Build minimal from scratch, embedded in your existing app.**
- Reason: You have full RTL/Arabic control, no ops debt from a separate forum stack, no fighting Discourse's opinionated theming for RTL, and you can tie directly into your listings data.
- Minimum feature set for embedded forum v1 (see below).

**Phase 3 Option B: Flarum with Arabic RTL extension.**
- If you don't want to build from scratch. Flarum is the least ops-heavy, and there is an Arabic RTL community extension.
- Risk: Extension may lag behind Flarum core updates; RTL quality is not first-party.

**Phase 3 Option C: Discourse (only if you want battle-tested moderation and trust levels).**
- Discourse has the best moderation tooling out of the box.
- [Bootstrap mode](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/) automatically grants TL1 to the first 50 users — exactly what you need for cold start.
- Operations cost: ~$20/month on a 2 vCPU/4GB Hetzner VPS.
- RTL: Discourse has community RTL support but it requires ongoing maintenance.

### 3.4 Minimum Feature Set for Forum V1 (Build from Scratch)

If building embedded:

```
Must-have (v1):
- Create topic (title + body, RTL-first editor)
- Reply to topic (threaded or flat — flat is simpler for v1)
- Like/upvote reply (no downvote)
- Mark reply as "best answer" (topic author only)
- Attach topic to a listing (links forum discussion to a shop page)
- Subscribe to topic (email/push notification on new reply)
- Basic categories (5 max)
- Search within forum topics
- User profile showing their topics and replies

Skip for v1 (defer):
- Private messaging
- Real-time live updates (SSE or WebSocket) — use page refresh + "X new replies" banner
- Polls
- Badges/gamification  
- Moderator tools beyond admin panel delete/hide
- Tags (add after categories fill up)
```

### 3.5 Real-Time Notifications

**Decision: Server-Sent Events (SSE) for in-browser notifications; Push Notifications (Web Push API + Firebase Cloud Messaging) for mobile.**

| Approach | Complexity | Mobile Support | Recommendation |
|---|---|---|---|
| WebSockets | High | Excellent | Overkill for v1 — requires persistent connection management |
| Server-Sent Events (SSE) | Low | Good | ✅ Use for "new reply" live indicator in browser |
| Polling (setInterval) | Trivial | Works | Acceptable for v1 fallback (poll every 30s) |
| Web Push (FCM) | Medium | Excellent | ✅ Use for mobile background notifications |
| Email | Trivial | Universal | ✅ Use for all notifications in v1 |

**V1 notifications stack:**
- Email notifications via SendGrid/Mailgun for all notification types.
- In-app notification bell (simple unread count, fetched on page load).
- Web Push via FCM for mobile — implement in v2 after confirming users want it.

### 3.6 Voting / Karma Systems and Pitfalls

**Decision: Implement upvote-only karma; display as "نقاط المساهمة" (Contribution Points).**

**Karma pitfalls to avoid:**
1. **Don't show a live karma leaderboard** in v1 — it creates anxiety and gamification that attracts low-quality engagement.
2. **Don't use karma as a gate to basic features** — this creates chicken-and-egg in cold start.
3. **Don't allow downvotes on user posts** — this enables reputational attacks.
4. **Do use karma internally** to weight trust scores (see Section 2.5).
5. **Do show karma on user profiles** as a social signal — "أضاف 47 إجابة مفيدة" (added 47 helpful answers).

[Discourse's trust level system](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/) is the gold standard: trust is earned through reading + posting + receiving likes, not through a single number. The first 50 users in a new Discourse instance are automatically granted TL1 — this is the right model for bootstrapping.

---

## 4. Cold Start Problem

### 4.1 The Core Challenge

You are launching with zero reviews and zero community posts. Every page will show "كن أول من يقيّم!" (Be the first to review!). This is not fatal, but it requires a deliberate strategy.

[Andrew Chen's Cold Start research](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/) shows that successful networks solve cold start through one of:
- **Local network saturation** (Yelp started in San Francisco; Facebook started at Harvard)
- **Single-user utility** (you're useful to one person before the network is built)
- **Seeding legitimate content** (Reddit's founders posted under fake accounts — don't do this)

Your natural advantage: you are building for a small, dense, geographically contained market (Kuwait) with a specific vertical (car repair). This is exactly the right cold start topology.

### 4.2 Strategies That Work

**Strategy 1: Import "community-noted" shops from Facebook group data (ethical version)**

You have data from Facebook groups about recommended workshops. Use it ethically:

```
DO:
- Import the shop listing (name, location, specialty)
- Mark imported shops with "مذكور في المجتمع" (Community-mentioned) badge
- Show which Facebook group mentioned them (with link)
- Note date of last Facebook mention

DON'T:
- Create fake reviews attributed to real users
- Claim ratings exist when they don't
- Represent Facebook comments as degself.com reviews
```

This is the [Yelp approach from 2004](https://andrewclark.co.uk/product-book-summaries/the-cold-start-problem) — seeding with real business data without manufacturing fake social proof.

**Strategy 2: Target the 20 most-active commenters in Kuwait car Facebook groups**

- These are the "hard side" of your network — people who already create content about car repair.
- DM them personally. Offer nothing material. Say: "أنا أبني موقع بديل لمجموعة الفيسبوك — تحب تكون من أوائل المراجعين؟"
- Getting 10–15 power users with 5+ reviews each creates enough critical mass for the next 200 casual users to see a real community.

**Strategy 3: QR code campaign with workshops**

- Visit the 30 most-recommended workshops in Kuwait City personally.
- Offer a free "verified listing" with photos and detailed specs.
- Leave a QR code for customers (no payment from shops required — this is your incentive to them: a better online presence).
- Their customers scan → review → your platform gets real reviews.

**Strategy 4: Review incentives that don't violate trust**

The line: monetary payment for reviews destroys trust ([Yelp explicitly bans it](https://www.yelp-ir.com/news/press-releases/news-release-details/2025/Yelp-Releases-2024-Trust--Safety-Report/default.aspx)). But these are acceptable:

| Incentive | Acceptable? | Why |
|---|---|---|
| Entry in a monthly prize draw for anyone who reviewed anything | ✅ Yes | Does not direct content |
| "First 100 reviewers" badge | ✅ Yes | Social recognition, not payment |
| Discount coupon for *any* shop, given for reviewing *any* shop | ⚠️ Borderline | Acceptable if coupon doesn't come from the reviewed shop |
| "Review this specific shop, get 5 KWD" | ❌ No | Direct compensation for specific review = fake review |

**Strategy 5: Ask directly, after a clear interaction**

The best review prompt is contextual:
- After a user searches for a shop and then searches again 3+ days later (suggesting they may have visited), show: "هل زرت هذه الورشة؟ أخبرنا عن تجربتك"
- After a user clicks "اتصل" (Call) or opens the map link, trigger a review nudge after 24 hours.

### 4.3 Facebook Group Import — Technical Approach

```
Phase 1 (read-only, ethical):
- Manually collect business names/locations mentioned in Kuwait car Facebook groups
- Create listings with source attribution: "مذكور في [اسم المجموعة]"
- NO fabricated star ratings — show "لا تقييمات بعد" (No ratings yet)
- Show Facebook group post count as social proof: "تمت الإشارة إليه 47 مرة"

Phase 2 (after platform launch):
- Allow users to import/link their Facebook reviews via Facebook Login (requires FB app review)
- Show imported Facebook reviews as "تقييم مستورد من فيسبوك" with lower visual weight than native reviews
```

---

## 5. Mobile & Arabic UX

### 5.1 Kuwait Mobile Context

Kuwait has one of the highest smartphone penetration rates in the world. [Social media data for Kuwait (Dec 2025)](https://stats.napoleoncat.com/social-media-users-in-kuwait/2025/) shows:
- ~5M Facebook users (roughly the entire population)
- ~3.4M Instagram users (71% of population)
- Age 25–34 is the dominant demographic (car owners)
- Male-dominated (62.8% of social media users) — consistent with car repair clientele

**Design implications:**
- **Mobile-first is not optional.** Build for 375px width first, then scale up.
- **Thumb-friendly:** Primary CTAs (Write Review button, Submit) must be in bottom-right thumb zone for RTL (bottom-left for LTR — reversed for Arabic).
- **WhatsApp integration** is expected by Kuwait users — include WhatsApp share buttons on review pages and listings.
- **Fast load time over visual richness.** Kuwait users are on mobile data; lazy-load images, compress aggressively.

### 5.2 RTL Implementation

**The golden rule:** Don't "mirror" your LTR design manually. Use CSS logical properties from the start.

```css
/* Use logical properties — work in both LTR and RTL automatically */
.review-card {
    padding-inline-start: 16px;  /* NOT padding-left */
    padding-inline-end: 16px;    /* NOT padding-right */
    margin-block-end: 8px;       /* NOT margin-bottom */
    border-inline-start: 3px solid #e5a00d;  /* NOT border-left */
}

/* Set at the HTML element */
html[lang="ar"] {
    direction: rtl;
    text-align: right;
}
```

**What to mirror in RTL (flip direction):**
- Navigation arrows (→ becomes ←)
- Pagination controls
- Progress bars (fill right-to-left)
- Breadcrumbs
- Star rating fill direction (fills right-to-left in RTL)
- Review form layout (label on right, input extends left)
- Notification bell position (move to left side of header in RTL)

**What NOT to mirror:**
- Star rating icons (the stars themselves stay as stars)
- Video/audio player controls
- Logos and brand marks
- Phone numbers (still LTR: +965 XXXX XXXX)
- URLs and email addresses
- Maps (Google Maps doesn't flip)
- Numbers (Arabic numerals are still left-to-right within Arabic text in Kuwait)
- Timestamps

**Font recommendations ([Purrweb Arabic Design Guide](https://www.purrweb.com/blog/halal-design-how-to-make-an-app-in-arabic/)):**
- **SF Arabic** (Apple) or **Noto Naskh Arabic** (Google) for body text
- **Dubai** font for modern/professional feel (GCC-specific associations)
- Increase base font size by 10% vs. English equivalent — Arabic glyphs are taller
- Never use italic for Arabic — it doesn't exist in the script
- Bold Arabic should be used sparingly (can appear crowded)

### 5.3 Arabic Text Normalization for Search

**Critical for review search and user input matching:**

Kuwait users will write the same word multiple ways. Your search and duplicate-detection must normalize before comparing.

```python
import unicodedata
import re

def normalize_arabic(text: str) -> str:
    """Normalize Arabic text for search/comparison."""
    
    # Remove diacritics (تشكيل / harakat)
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    
    # Normalize Alef variants → bare Alef (ا)
    # أ إ آ أ → ا
    text = re.sub(r'[أإآٱ]', 'ا', text)
    
    # Normalize Teh Marbuta → Ha (ة → ه)
    # Critical for search: ورشة vs ورشه
    text = re.sub(r'ة', 'ه', text)
    
    # Normalize Alef Maqsura → Ya (ى → ي)
    # يعني vs يعنى
    text = re.sub(r'ى', 'ي', text)
    
    # Remove Kashida/Tatweel (elongation: ـ)
    text = re.sub(r'ـ', '', text)
    
    # Normalize Eastern Arabic numerals → Western
    eastern = '٠١٢٣٤٥٦٧٨٩'
    western = '0123456789'
    text = text.translate(str.maketrans(eastern, western))
    
    return text.strip()
```

This is not optional — [the Nominatim geocoder team](https://github.com/osm-search/Nominatim/issues/3718) documented exactly this problem: "Searching with ة does not find results tagged with ه. This is a very common variation in Arabic typing."

**Duplicate review detection must also use normalized text:**
```python
def reviews_are_duplicate(review1: str, review2: str, threshold: float = 0.8) -> bool:
    from difflib import SequenceMatcher
    n1 = normalize_arabic(review1)
    n2 = normalize_arabic(review2)
    return SequenceMatcher(None, n1, n2).ratio() > threshold
```

### 5.4 Review Form — Mobile RTL Design

**Review submission flow (mobile-first, 5 steps):**

```
Step 1: Rating (tap to select 1-5 stars, stars flow right-to-left)
┌─────────────────────────────┐
│  كيف كانت تجربتك؟           │
│  ★ ★ ★ ★ ★  (tap a star)    │
└─────────────────────────────┘

Step 2: Sub-dimensions (optional, show after step 1)
┌─────────────────────────────┐
│  جودة العمل    ★ ★ ★ ★ ★   │
│  السعر         ★ ★ ★ ★ ★   │  
│  السرعة        ★ ★ ★ ★ ★   │
│            [تخطي / Skip]    │
└─────────────────────────────┘

Step 3: Write review (text area, RTL, Arabic keyboard shows by default)
┌─────────────────────────────┐
│  شاركنا تجربتك...           │
│  [                        ] │
│  (30 حرف كحد أدنى)          │
└─────────────────────────────┘

Step 4: Photos (optional)
┌─────────────────────────────┐
│  أضف صوراً (اختياري)        │
│  [📷] [📷] [📷]             │
└─────────────────────────────┘

Step 5: Confirm + Submit
┌─────────────────────────────┐
│  [إرسال التقييم]            │  ← Thumb-accessible bottom position
└─────────────────────────────┘
```

**Critical UX notes:**
- The text area should auto-detect Arabic keyboard and set `dir="rtl"` dynamically:
  ```javascript
  textarea.addEventListener('input', (e) => {
      const firstChar = e.target.value.trim()[0];
      if (firstChar && firstChar.charCodeAt(0) > 1536) {
          e.target.setAttribute('dir', 'rtl');
      }
  });
  ```
- The character count indicator should be in Arabic: "30 حرف / 2000"
- Submit button should be at the bottom, full-width, high contrast
- Don't use inline validation during typing (frustrating on mobile); validate on submit

### 5.5 Sort and Filter UX in Arabic

**Sort dropdown labels:**
```
الترتيب حسب: ▾
├── الأكثر فائدة  (Most Relevant — default)
├── الأحدث        (Most Recent)
└── الأعلى تقييماً (Highest Rated)
```

**Filter by star rating:** Clickable bars in the histogram (see 1.9).

**Filter by dimension (v2):** "فلترة حسب: جودة العمل | السعر | السرعة"

**Pagination vs. Infinite scroll:** Use **"تحميل المزيد"** (Load More) button rather than infinite scroll. Infinite scroll is unpredictable for mobile users trying to reach the footer, and is difficult to implement well in RTL. Load 10 reviews at a time.

---

## 6. V1 Launch Checklist vs. Deferred Features

### Phase 2 (Reviews) — V1 Launch

| Feature | Launch? | Notes |
|---|---|---|
| 1–5 star rating | ✅ Yes | Required field |
| Text review (30 char min) | ✅ Yes | Required with star |
| Sub-dimension ratings (3 dims) | ✅ Yes | Optional |
| Photo upload (up to 5) | ✅ Yes | Optional |
| Rating distribution histogram | ✅ Yes | Display only |
| Owner response | ✅ Yes | Critical for trust |
| Helpful voting | ✅ Yes | Single upvote |
| Sort: 3 options | ✅ Yes | Most Relevant default |
| Report/flag (5 reasons) | ✅ Yes | |
| Phone verification for reviewers | ✅ Yes | OTP at signup |
| Duplicate text detection | ✅ Yes | Levenshtein check |
| Velocity spike detection | ✅ Yes | >5 reviews/listing/24h alert |
| Arabic text normalization | ✅ Yes | In search + dedupe |
| Auto-hold for new accounts (<48h) | ✅ Yes | |
| OpenAI moderation API | ✅ Yes | For Arabic profanity |
| Admin moderation queue | ✅ Yes | Simple approve/reject UI |
| RTL form with dir auto-detect | ✅ Yes | |
| Owner self-review prevention | ✅ Yes | DB constraint |

| Feature | Defer? | Target Phase |
|---|---|---|
| Verified Visit (QR code) | Defer → v2 | After 100 reviews |
| AI-generated content detection | Defer → v2 | When volume > 500/month |
| User trust score (visible badges) | Defer → v2 | After 6 months |
| Full keyword analytics | Defer → v2 | |
| Review dispute formal process | Defer → v2 | After legal consult |
| Facebook review import | Defer → v2 | Requires FB app review |

### Phase 3 (Community) — V1 Launch

| Feature | Launch? | Notes |
|---|---|---|
| 5 forum categories | ✅ Yes | See structure in 3.2 |
| Create topic (title + body) | ✅ Yes | RTL text editor |
| Reply (flat, not threaded) | ✅ Yes | Threaded is v2 |
| Upvote reply | ✅ Yes | |
| Mark best answer | ✅ Yes | Author only |
| Link topic to listing | ✅ Yes | Key differentiator |
| Email notifications | ✅ Yes | Reply + mention alerts |
| Topic search | ✅ Yes | Full text, normalized |
| Reporting (flag topic/reply) | ✅ Yes | |

| Feature | Defer? | Target Phase |
|---|---|---|
| Threaded replies | Defer → v2 | |
| Real-time updates (SSE) | Defer → v2 | |
| Web Push notifications | Defer → v2 | |
| Polls | Defer → v3 | |
| Private messaging | Defer → v3 | |
| Badges/gamification | Defer → v3 | |
| Tags (in addition to categories) | Defer → v3 | |

---

## 7. Database Schema Sketch

```sql
-- Reviews
CREATE TABLE reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id    UUID NOT NULL REFERENCES listings(id),
    user_id       UUID NOT NULL REFERENCES users(id),
    overall_score SMALLINT NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
    quality_score SMALLINT CHECK (quality_score BETWEEN 1 AND 5),
    price_score   SMALLINT CHECK (price_score BETWEEN 1 AND 5),
    speed_score   SMALLINT CHECK (speed_score BETWEEN 1 AND 5),
    body          TEXT CHECK (char_length(body) >= 30 AND char_length(body) <= 2000),
    body_normalized TEXT,  -- normalized Arabic for duplicate detection
    status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'held', 'removed')),
    hold_reason   TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (listing_id, user_id)  -- one review per user per listing
);

-- Review Photos
CREATE TABLE review_photos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner Responses
CREATE TABLE review_responses (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id  UUID NOT NULL REFERENCES reviews(id) UNIQUE,
    body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 1000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful Votes
CREATE TABLE review_helpful_votes (
    review_id UUID NOT NULL REFERENCES reviews(id),
    user_id   UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (review_id, user_id)
);

-- Flags
CREATE TABLE review_flags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id  UUID NOT NULL REFERENCES reviews(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    reason     VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

-- Listing aggregate (precomputed, update via trigger or async job)
CREATE TABLE listing_review_aggregates (
    listing_id     UUID PRIMARY KEY REFERENCES listings(id),
    avg_overall    NUMERIC(3,2),
    avg_quality    NUMERIC(3,2),
    avg_price      NUMERIC(3,2),
    avg_speed      NUMERIC(3,2),
    review_count   INTEGER DEFAULT 0,
    dist_1         INTEGER DEFAULT 0,  -- count of 1-star reviews
    dist_2         INTEGER DEFAULT 0,
    dist_3         INTEGER DEFAULT 0,
    dist_4         INTEGER DEFAULT 0,
    dist_5         INTEGER DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Forum Topics
CREATE TABLE forum_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES forum_categories(id),
    listing_id  UUID REFERENCES listings(id),  -- optional link to a shop
    user_id     UUID NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
    body        TEXT NOT NULL CHECK (char_length(body) >= 20),
    status      VARCHAR(20) DEFAULT 'open',
    reply_count INTEGER DEFAULT 0,
    upvote_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Forum Replies
CREATE TABLE forum_replies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id   UUID NOT NULL REFERENCES forum_topics(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL CHECK (char_length(body) >= 10),
    is_best_answer BOOLEAN DEFAULT FALSE,
    upvote_count   INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Implementation Priorities

### 8-Week Sprint to Phase 2 Launch

| Week | Focus |
|---|---|
| 1 | User authentication (phone OTP), user profile with account age tracking |
| 2 | Review submission form (RTL, 1–5 stars, text, 3 sub-dims) |
| 3 | Review display (listing page, histogram, sort, pagination) |
| 4 | Owner response feature, helpful voting |
| 5 | Moderation: auto-hold triggers, admin queue, flag system |
| 6 | Arabic text normalization, duplicate detection, OpenAI moderation API |
| 7 | Mobile UX polish (RTL, font sizes, thumb-friendly layout) |
| 8 | Cold start: QR code generation, "community-mentioned" badge, shop onboarding |

### 8-Week Sprint to Phase 3 Launch (after Phase 2 has ≥200 reviews)

| Week | Focus |
|---|---|
| 1–2 | Forum data models, category setup, topic creation |
| 3–4 | Reply system, best answer marking, listing linkage |
| 5 | Upvote system, sort orders, search |
| 6 | Email notification system (reply alerts) |
| 7 | Moderation (flag system for forum), admin tools |
| 8 | Mobile polish, Arabic UX testing with real users |

---

## Key Sources

- [Yelp 2025 Trust & Safety Report](https://www.yelp-press.com/press-releases/press-release-details/2026/Yelp-Releases-2025-Trust--Safety-Report/default.aspx) — AI review detection, fake review volumes, moderation at scale
- [Yelp 2024 Trust & Safety Report](https://www.yelp-ir.com/news/press-releases/news-release-details/2025/Yelp-Releases-2024-Trust--Safety-Report/default.aspx) — incentivized review policies, AI enhancement
- [Trustpilot Action We Take Policy (2026)](https://corporate.trustpilot.com/legal/for-everyone/action-we-take/mar-2026) — escalation-based moderation model
- [BrightLocal Local Consumer Review Survey 2024](https://www.brightlocal.com/research/local-consumer-review-survey-2024/) — consumer trust in reviews, response impact
- [Smashing Magazine: Product Reviews UX (2023)](https://www.smashingmagazine.com/2023/01/product-reviews-ratings-ux/) — distribution charts, decimal scores, rating psychology
- [UX Knowledge Base: UX of Ratings and Reviews](https://uxknowledgebase.com/the-ux-of-ratings-and-reviews-80d3cbfc9a15) — review form design, display patterns
- [Discourse Trust Levels Engineering Blog](https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/) — trust level system, bootstrap mode
- [Elest.io: Discourse vs Flarum vs NodeBB 2026](https://blog.elest.io/discourse-vs-flarum-vs-nodebb-which-self-hosted-forum-platform-in-2026/) — forum platform comparison
- [Andrew Chen: Cold Start Problem](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/) — network bootstrapping strategies
- [Yelp Verified Licenses (Yelp Blog)](https://blog.yelp.com/news/yelp-announces-verified-licenses-bringing-peace-of-mind-to-booking-a-professional/) — verification badges for service businesses
- [Yelp Algorithm & Review Filtering (ReputationX)](https://www.reputationx.com/blog/beat-yelp-algorithm) — how Yelp infers physical visits
- [Kuwait Cybercrime Law Analysis (SMEX)](https://smex.org/kuwaits-cybercrime-law/) — legal risks for user content platforms in Kuwait
- [Purrweb Arabic App Design Guide](https://www.purrweb.com/blog/halal-design-how-to-make-an-app-in-arabic/) — RTL design, typography, numbering
- [ExtraDigital Arabic Web Design (2026)](https://www.extradigital.co.uk/articles/design/elements-arabic-web-design/) — RTL UX best practices
- [Nominatim Arabic Normalization Issue](https://github.com/osm-search/Nominatim/issues/3718) — ة/ه and Alef variant normalization documented
- [NapoleonCat Kuwait Social Media Stats 2025](https://stats.napoleoncat.com/social-media-users-in-kuwait/2025/) — Kuwait mobile/social demographics
- [Perspective API Sunset Notice](https://perspectiveapi.com) — sunsetting Dec 2026, do not build on
- [Azure Content Moderator Arabic Support](https://learn.microsoft.com/en-us/azure/ai-services/content-moderator/language-support) — Arabic profanity detection
