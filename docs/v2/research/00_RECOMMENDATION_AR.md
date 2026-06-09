# 🎯 خطة degself v2 — التقرير النهائي والتوصية

> تقرير مبني على 6 أبحاث منفصلة شاملة (~245KB تحليل) لأفضل طريقة لإعادة بناء degself.com كمنصة directory + community.

---

## ملخص تنفيذي

| القرار | التوصية | البديل |
|---|---|---|
| **Framework** | **Next.js 15 (App Router) + ISR** | Astro Islands |
| **Backend + DB + Auth** | **Supabase Pro (Mumbai)** | Firebase (Doha) لو الـ latency حرج |
| **Auth أساسي** | **WhatsApp OTP + Google Sign-In** | SMS OTP fallback (Infobip بدل Twilio) |
| **Hosting** | **Vercel (Free → Pro $20/mo)** | Netlify (الحالي) |
| **Search** | **Supabase pg_trgm v1** → Meilisearch v2 | Algolia (مكلف) |
| **Moderation** | **OpenAI Moderation API + قائمة كلمات عربية** | Cloudflare AI |
| **FB Groups** | **شبه يدوي + LLM matching** (legally safe) | لا تستخدم scrapers تلقائية |
| **Community Phase 3** | **Forum مبني من الصفر داخل التطبيق** | Discourse embed |
| **التكلفة شهرياً** | **$25–40 لـ 10k MAU** | $80–150 لـ 100k MAU |

---

## 1. القرار المعماري الكبير

### المشكلة الحالية
موقعك الآن **React+Vite Static** على Netlify. الأبحاث أكدت إن ده **يحدّك في 3 مشاكل كبيرة** لما تضيف UGC:
1. ❌ المراجعات (Reviews) لازم تظهر في HTML الأولي عشان Google يفهرسها — وده مش ممكن في static pure
2. ❌ مفيش backend = مفيش auth أو user accounts
3. ❌ كل تعديل = rebuild كامل (1801 صفحة)

### الحل: ISR (Incremental Static Regeneration)
ده النمط اللي اعتمده **Yelp + Reddit + Trustpilot**. باختصار:
- الصفحة مبدئياً Static (سريعة + SEO ممتاز)
- لما يتضاف review جديد → الصفحة دي **فقط** تتعاد بناءها في الخلفية
- المستخدم اللي عنده tab مفتوح يشوف التحديث في خلال ثوانٍ

**Next.js 15 (App Router)** هو أنضف framework يعمل ISR مع دعم RTL ممتاز و SEO جاهز.

> **بحث 01 + 06** أكدوا: مفيش طريقة جدية تانية. لو فضلت على Vite + Static، هتفقد ميزة Reviews-in-HTML تماماً.

---

## 2. Backend: Supabase Pro (Mumbai)

### ليش Supabase وليس Firebase رغم إن Firebase أقرب جغرافياً؟

| المعيار | Supabase (Mumbai) | Firebase (Doha) |
|---|---|---|
| Latency من الكويت | 80–120ms | 30–60ms ✅ |
| **PostgreSQL** (relational) | ✅ | ❌ NoSQL Firestore |
| **Schema للريفيوهات** | بسيط جداً | معقد (joins صعبة) |
| **Full-text search عربي** | ✅ pg_trgm + Arabic config | ❌ بحاجة Algolia |
| **Realtime للفورم** | ✅ مدمج | ✅ مدمج |
| **Vendor lock-in** | منخفض (Postgres قياسي) | عالي جداً |
| **التكلفة 10k MAU** | $25/mo (Pro) | $30–50/mo (Blaze) |
| **التكلفة 100k MAU** | ~$80/mo | ~$150/mo |

**الـ 60ms زيادة في الـ latency** غير محسوسة. لكن Postgres + بساطة الـ schema + إمكانية الانتقال لاحقاً لأي VPS = decision واضح.

### Schema للـ v1
```sql
users              -- linked to Supabase Auth
workshops          -- import from current workshops.json (1801 records)
reviews            -- user_id, workshop_id, rating, body, photos[]
community_mentions -- from FB Groups (workshop_id, source_url, count)
```

> **بحث 02** نصح بـ PocketBase على Vultr Dubai كأرخص خيار، لكن DX و auth الجاهز في Supabase يوفّر أسابيع شغل.

---

## 3. Auth: WhatsApp OTP + Google

### الواقع الكويتي
- **90% من سكان الكويت** عندهم WhatsApp ([Infobip 2026](https://www.infobip.com/blog/whatsapp-statistics))
- **99% internet penetration** ([DataReportal](https://datareportal.com/reports/digital-2024-kuwait))
- Android 68% / iOS 32%

### الاستراتيجية
1. **الأساسي:** WhatsApp OTP عبر Twilio Verify (أو Infobip — أرخص في المنطقة)
2. **الاحتياطي 1:** Google Sign-In (one-tap)
3. **الاحتياطي 2:** SMS OTP (لو WhatsApp فشل)

### مقارنة التكلفة (10k MAU = ~3,300 verify/شهر)
| الطريقة | التكلفة الشهرية |
|---|---|
| Twilio SMS فقط | ~$1,200 ❌ |
| **WhatsApp OTP (Twilio)** | **~$50–80 ✅** |
| WhatsApp OTP (Infobip/Unifonic) | ~$25–50 (أرخص) |

### حماية إجبارية
- **Cloudflare Turnstile** قبل أي OTP request (يمنع SMS pumping)
- **Country whitelist:** أرقام +965 فقط
- **Rate limit:** 3 محاولات / IP / ساعة

> **بحث 03** حذّر بشكل واضح: OTP بدون حماية = خسارة آلاف الدولارات في حالة attack واحد.

---

## 4. Facebook Groups: شبه يدوي (الطريق الآمن قانونياً)

### الحقيقة المؤلمة
بعد قراءة **بحث 04** بعناية:
- ❌ Apify scrapers تلقائية = **مخالفة Meta ToS** + خطر حظر الحساب
- ❌ Custom Playwright = نفس الشيء  
- ❌ نشر أسماء المعلّقين = **مخالفة قانون البيانات الكويتي** (غرامة حتى KWD 5,000 + سجن)

### الطريقة الآمنة (الموصى بها)
1. **يدوياً:** افتح Kuwait Insiders، ابحث "ورشة" / "كراج" / "ميكانيكي"
2. **استخدم extension زي ExportComments** لاستخراج التعليقات (cookies محلية، آمن)
3. **AI extraction:** نشغّل GPT-4o على النصوص لاستخراج أسماء الكراجات
4. **Fuzzy matching** على الـ 1801 منشأة (rapidfuzz + Arabic normalization)
5. **النشر:** فقط **عدد التوصيات الإجمالي** بدون أسماء — مثلاً:
   > "موصى به **12 مرة** في مجتمعات السيارات الكويتية"
   ولا تنشر أبداً أسماء المعلّقين أو نصوص حرفية.

### مصادر بديلة لازم تضيفها
- **Reddit r/Kuwait** — قانوني 100%، indexed بالفعل
- **Q8Car forum** — منتدى علني كويتي
- **Twitter/X** عبر بحث Google: `site:x.com "ورشة" "الكويت"`

### الجهد المتوقع
- **Backfill أولي:** 40–70 ساعة (مرة واحدة)
- **استمرار شهري:** 4–8 ساعات

---

## 5. Reviews System (Phase 2)

### القرارات النهائية من بحث 05

| القرار | الخيار |
|---|---|
| **التقييم** | 1–5 نجوم (لا تتجاوزه) |
| **أبعاد فرعية اختيارية** | جودة العمل / السعر / السرعة |
| **حد أدنى للنص** | 30 حرف عربي |
| **الصور** | حتى 5 لكل review (compressed server-side) |
| **Verified Visit** | v1 بالـ signals (phone OTP + age) — v2 بـ QR |
| **رد المالك** | ✅ في v1 (88% من المستخدمين يفضّلوا الشركات اللي ترد) |
| **التصويت** | Upvote فقط (لا downvote — يحمي من sabotage) |
| **الترتيب** | افتراضي: "الأكثر صلة" (recency × helpful × length) |
| **Histogram** | يظهر دايماً (أقوى trust signal) |

### Moderation
- ✅ **OpenAI Moderation API** + قائمة كلمات عربية محلية
- ❌ **Perspective API** متوقف ديسمبر 2026 — لا تستخدمه
- **Auto-hold triggers:** حساب جديد / velocity spike / رقم هاتف في النص / toxicity عالية
- **post-moderation** افتراضياً (الـ review يظهر فوراً، لكن قابل للحجب)

### المخاطر القانونية الكويتية
- خزّن `hashed IPs` لمدة 90 يوم (لو فيه دعوى قضائية)
- TOS صريح: ممنوع personal attacks (Cybercrime Law 63/2015)
- لا تحذف review لمجرد طلب المالك — لازم سبب موضوعي

---

## 6. SEO (الأهم لاستمرار النمو)

### القواعد الذهبية من بحث 06
1. ✅ **الـ 10 reviews الأولى في HTML المبدئي** (لو فُتحت بـ JS، Google يفهرسهم متأخر بأسابيع)
2. ✅ **JSON-LD واحد لكل صفحة:** `AutoRepair` + `aggregateRating` + `Review` (يعطي نجوم في SERP)
3. ❌ **FAQPage rich result متوقف** مايو 2026 — استخدم `QAPage` بدلاً منه
4. ✅ **DiscussionForumPosting** schema للمنتدى (released Nov 2023)
5. ❌ **لا تجمع reviews من Google/Yelp** في schema الخاص بك (Google يعتبره spam)
6. ✅ **Pagination noindex** + canonical للصفحة الرئيسية للمنشأة
7. ✅ **User profiles noindex** حتى يصلوا ≥5 contributions
8. ✅ **`<html lang="ar" dir="rtl">`** + Latin slug للروابط (لا تستخدم URL-encoded Arabic)
9. ✅ **Bing Webmaster Tools** — يأخذ ~10% من Saudi traffic

### Core Web Vitals
- احجز مساحة (height) للـ review containers قبل تحميلها (يمنع CLS)
- Preload Arabic webfonts (أثقل 2–5x من Latin)
- ISR revalidation عند كل review جديد (في الـ background)

---

## 7. خريطة الطريق المقترحة

### Phase 1 — الأساسات (4 أسابيع)
**الهدف:** Next.js + Supabase + إعادة نشر الـ 1801 منشأة بدون فقد SEO

| أسبوع | المخرجات |
|---|---|
| 1 | Next.js 15 setup + استيراد البيانات + ISR لكل صفحة منشأة |
| 2 | Auth (WhatsApp OTP + Google) + onboarding flow بسيط |
| 3 | Schema للـ reviews + UI لقراءة فقط (لسه مفيش writes) |
| 4 | Migration من Netlify لـ Vercel + اختبار SEO شامل + redirects |

### Phase 2 — Reviews (4 أسابيع)
**الهدف:** المستخدمون يكتبوا reviews

| أسبوع | المخرجات |
|---|---|
| 5 | كتابة review form (1–5 + نص + صور) + validation |
| 6 | Moderation pipeline (OpenAI + Arabic wordlist + manual queue) |
| 7 | Owner responses + helpful voting + sort options |
| 8 | aggregateRating schema + rich snippets + سياسة المراجعة |

### Phase 3 — Community Bootstrap (2 أسابيع)
**الهدف:** استيراد توصيات FB Groups كـ social proof

| أسبوع | المخرجات |
|---|---|
| 9 | Pipeline يدوي/شبه يدوي لاستخراج توصيات FB + matching |
| 10 | باج "موصى به × مرات في مجتمعات الكويت" + صفحة عن المصدر |

### Phase 4 — Forum (8 أسابيع — لاحقاً)
**يبدأ فقط بعد ما تكون عندك 500+ مستخدم نشط**

- 5 فئات: أعطال / تجارب الورش / أسعار / نصائح / عام
- مبني من الصفر داخل التطبيق (نفس DB، نفس Auth)
- SSE للنوتيفيكيشن، FCM للموبايل
- Upvote-only karma، بدون leaderboard في v1

---

## 8. التكلفة المتوقعة

### السنة الأولى (10k MAU)
| البند | شهرياً |
|---|---|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| WhatsApp OTP (Twilio Verify) | $15 |
| OpenAI Moderation | $5 |
| Cloudflare Turnstile | مجاني |
| **المجموع** | **~$65/شهر** |

### السنة الثانية (100k MAU)
| البند | شهرياً |
|---|---|
| Supabase (مع compute add-on) | $80 |
| Vercel (مع bandwidth) | $40 |
| WhatsApp OTP | $50 |
| OpenAI / moderation | $20 |
| Meilisearch (search v2) | $30 |
| **المجموع** | **~$220/شهر** |

> **بحث 02** أكد إن Infobip للـ OTP في المنطقة (3–6× أرخص من Twilio) ممكن يقلّل التكلفة 30% إضافية في السنة الثانية.

---

## 9. ما لا تفعله

❌ **لا تكتب forum من الصفر في Phase 2** — مشروع كبير جداً  
❌ **لا تستخدم Apify scrapers على FB Groups** — risk قانوني واضح  
❌ **لا تنشر أسماء معلّقين FB** أبداً — قانون البيانات الكويتي صارم  
❌ **لا تستخدم Twilio SMS مباشرة** بدون WhatsApp قبله — هدر $1000+/شهر  
❌ **لا تعمل big-bang rewrite** — Yelp فعلها وأضاع 6 أشهر  
❌ **لا تنسى redirects** من URLs القديمة عند الانتقال لـ Vercel  
❌ **لا تخلط schemas** (Google/Yelp reviews + reviews) في JSON-LD  
❌ **لا تستخدم Perspective API** — متوقف ديسمبر 2026  
❌ **لا تفتح OTP بدون Cloudflare Turnstile** — SMS pumping attack جاهز  

---

## 10. الخطوة التالية الفورية

لو وافقت على الخطة، أبدأ فوراً:

1. **إنشاء branch جديد** `v2-nextjs` على الـ repo
2. **Next.js 15 scaffold** بنفس design system الحالي
3. **استيراد workshops.json** كـ seed data في Supabase
4. **بناء 3 صفحات v1:** Home / Search / Workshop Detail (مع ISR)
5. **اختبار محلي شامل** قبل أي deployment

التوقع الواقعي: **أسبوع لـ MVP يمكن نشره** بدون features جديدة، فقط نفس الموقع الحالي بـ stack جديد جاهز للـ Auth + Reviews.

---

## مراجع البحث الكاملة

كل ملف فيه ~30–50 صفحة تفصيلية مع روابط لكل مصدر:
- [`01_architecture.md`](./01_architecture.md) — اختيار الإطار والـ rendering pattern
- [`02_backend_stack.md`](./02_backend_stack.md) — مقارنة 8 backends
- [`03_auth.md`](./03_auth.md) — Auth strategy للكويت  
- [`04_facebook_extraction.md`](./04_facebook_extraction.md) — الخيارات القانونية والتقنية لـ FB
- [`05_reviews_community.md`](./05_reviews_community.md) — تصميم نظام المراجعات + Moderation
- [`06_seo.md`](./06_seo.md) — استراتيجية SEO عند إضافة UGC
