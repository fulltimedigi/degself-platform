# Claude Code Brief — degself.com v2

> **اقرأ هذا الملف بالكامل قبل أي شيء.** هذا السياق الحرج من جلسات سابقة لا يمكن إعادة استكشافه.

---

## من أنت ومن المستخدم

**أنت:** Claude Code شغّال على MacBook Pro الخاص بـ Ahmed Abdelhalim
**المستخدم:** Ahmed Abdelhalim (احمد عبدالحليم) — رائد أعمال كويتي يمتلك degself.com
**اللغة:** Arabic (الأساسية) — رد دائماً بالعربية. مصطلحات تقنية بالإنجليزية OK.
**الموقع:** الكويت (Asia/Kuwait timezone)
**GitHub username:** `fulltimedigi`

**Ahmed ليس مبرمجاً.** لا تستخدم jargon. اشرح بكلام بسيط واطلب إذنه قبل أي قرار كبير.

---

## القواعد الذهبية (لا تُكسر)

1. ⛔ **"كراج" وليس "ورشة"** — الكويتيون يقولون "كراج". في الـ UI استخدم "كراج/كراجات" أو "ميكانيكي". كلمة "ورشة" مقبولة في الـ DB كحقل internal بس.
2. ⛔ **شعار degself = مفتاح كونتاكت سيارة** — وليس مفتاح باب. لا تغيّر الشعار.
3. ⛔ **دقة البيانات = حياة أو موت** — لا تضع بيانات ظنية. لا تخمن. لو غير متأكد، اسأل Ahmed.
4. ⛔ **لا تستخدم كلمة "موثقة"** في أي مكان في الـ UI.
5. ⛔ **لا أرقام في الـ UI الرئيسي** (مثلاً "1801 منشأة") — Ahmed لا يحب ذلك.
6. ⛔ **لا screenshots من Google Maps** للمنشآت — قد تحتوي محتوى غير مناسب. استخدم BrandedCover SVG (موجود في `webapp/client/src/components/BrandedCover.tsx`).
7. ⛔ **place_ids من Google Maps حساسة لحالة الأحرف** — لا تحوّلها إلى lowercase أبداً.
8. ⛔ **localStorage ممنوع** — قد تعمل في sandboxed iframe.
9. ⛔ **لا تحذف الموقع الحالي** — كل عمل v2 على branch جديد `v2-nextjs`. الموقع الحالي يبقى production لحد ما الجديد جاهز 100%.
10. ⛔ **لا تستخدم Apify scrapers على Facebook Groups** — مخالف قانون البيانات الكويتي. راجع `research/04_facebook_extraction.md`.

---

## المشروع الحالي (v1) — ما هو موجود

### الـ Stack الحالي
- **Frontend:** React + Vite (TypeScript) — Static SPA
- **Routing:** Hash routing داخل SPA، لكن HTML prerendered لكل صفحة لـ SEO
- **Data:** ملف static `webapp/client/public/data/workshops.json` (1801 منشأة)
- **Hosting:** Netlify (project: `luminous-sunburst-002b08`) — auto-deploy من branch `master`
- **Domain:** degself.com (GoDaddy)
- **Build:** `npm run build:static` (في فولدر `webapp/`) = `vite build && node scripts/build-seo.mjs`
- **TypeScript:** Vite **لا يشغّل tsc** — شغّل `npx tsc --noEmit` يدوياً بعد أي تعديل كبير

### بنية المجلدات
```
degself-platform/
├── brand/                    # شعار degself + SVG assets
├── data/                     # CSVs قديمة (لا تلمسها)
├── data-collection/          # سكريبتات Python للتنظيف
│   └── audit_and_clean.py    # سكريبت reclassification
├── docs/
│   └── v2/                   # ← المكان اللي بتقرأ منه دلوقتي
├── scripts/
└── webapp/
    ├── client/
    │   ├── public/data/workshops.json   # ⭐ المصدر الوحيد للبيانات
    │   └── src/
    │       ├── components/
    │       │   ├── BrandedCover.tsx     # ⭐ SVG branded cards (بديل صور Google)
    │       │   └── WorkshopCard.tsx
    │       ├── pages/                    # Home, Search, WorkshopDetail, Map, Emergency, About
    │       └── lib/
    │           ├── api.ts                # WorkshopFilters interface
    │           └── dataStore.ts          # data fetching logic
    ├── scripts/build-seo.mjs            # generates prerendered HTML
    ├── package.json
    └── vite.config.ts
```

### الـ Routes
- `/` — Home
- `/search` — Browse all (مش `/workshops`)
- `/workshop/:place_id` — تفاصيل منشأة واحدة
- `/map` — خريطة
- `/emergency` — كراج متنقل + سطحات (filter بـ `service_mode` مش `specialty`)
- `/about` — عن المنصة

### Schema بيانات workshops.json (حقول مهمة)
```typescript
{
  place_id: string;          // Google Place ID — case-sensitive!
  name: string;              // اسم المنشأة بالعربية
  specialty: string;         // كراج / ميكانيكي / وكلاء / إلخ
  entity_type: string;       // workshop / dealer / spare_parts / إلخ
  service_mode: string;      // fixed / mobile / tow (الأخير = سطحة)
  area: string;              // الشويخ / حولي / إلخ
  lat: number;
  lng: number;
  phone?: string;
  rating?: number;           // من Google
  reviews_count?: number;
}
```

---

## ما تم إنجازه في الجلسات السابقة (لا تكرّره)

1. ✅ **تنظيف الصور:** حذف 1485 صورة googleusercontent من workshops.json
2. ✅ **BrandedCover component:** SVG cards بـ logo degself + اسم + أيقونة specialty (بديل صور Google)
3. ✅ **Auto-classification:** 460 specialty corrections + 601 entity_type corrections + حذف 4 duplicates → 1801 record نهائي
4. ✅ **Mobile garages fix:** filter بـ `service_mode == "mobile"` بدل `specialty == "كراج متنقل"`. النتيجة: 39 mobile garage يظهروا (كانوا 4)، 114 سطحة (كانوا ~109)
5. ✅ **Arabic search normalization:** hamza/ya/ta-marbuta + جراج↔كراج
6. ✅ **SEO:** Google Search Console verified + sitemap submitted + homepage indexed
7. ✅ **Bing Webmaster Tools:** verified via meta tag `6F7E376651E6198EFF083EAB26E3F4BF` — لكن sitemap لسه ما اتقدّمش (TODO صغير)

---

## v2 — اللي هتبنيه

### الهدف
تحويل degself من directory ثابت لـ **منصة UGC كاملة** مع:
- تسجيل دخول للمستخدمين (WhatsApp OTP + Google)
- مراجعات وتقييمات للمنشآت
- استيراد توصيات من جروبات Facebook (شبه يدوي + AI matching)
- منتدى/community لاحقاً (Phase 4)

### الـ Stack الجديد (قرارات نهائية بعد بحث 245KB)
| الطبقة | التقنية | لماذا |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | يدعم ISR للـ reviews-in-HTML اللي SEO يحتاجه |
| Hosting | **Vercel** (Free → Pro $20/mo) | أفضل تكامل مع Next.js |
| Database + Auth | **Supabase Pro** (Mumbai region) | Postgres + auth جاهز + realtime |
| Auth method | **WhatsApp OTP via Twilio Verify** + Google Sign-In | 90% من الكويت عندهم واتساب، SMS مكلف |
| Search v1 | **Postgres pg_trgm** | كافي حتى 50k منشأة |
| Search v2 | Meilisearch | لو احتجنا fuzzy + filters متقدمة |
| Moderation | **OpenAI Moderation API** + Arabic wordlist | Perspective API يتوقف ديسمبر 2026 |
| Anti-abuse | **Cloudflare Turnstile** قبل OTP | يمنع SMS pumping |

### القرارات الـ UX الكبيرة
- **التقييم:** 1-5 نجوم + 3 أبعاد فرعية اختيارية (جودة/سعر/سرعة)
- **حد أدنى للنص:** 30 حرف عربي
- **الصور:** حتى 5 لكل review، compressed server-side
- **التصويت:** Upvote فقط (لا downvote — يحمي من sabotage)
- **رد المالك:** ✅ مفعّل في v1
- **Verified Visit:** v1 بالـ signals (phone OTP + account age)، v2 بـ QR
- **FB Groups:** فقط "موصى به × مرات" — لا أسماء أبداً (قانون البيانات الكويتي)

---

## التكلفة المتوقعة

| المرحلة | شهرياً |
|---|---|
| 10k MAU (السنة الأولى) | ~$65 |
| 100k MAU (السنة الثانية) | ~$220 |

---

## كيف تتواصل مع Ahmed أثناء العمل

1. **اشرح كل قرار قبل ما تنفّذ** — حتى لو يبدو واضح
2. **اطلب موافقة قبل:** أي `git push`, تعديل DB schema, شراء أي خدمة, ربط أي حساب جديد
3. **لا تخمّن** — لو محتاج معلومة من Ahmed، اسأله
4. **بعد كل خطوة كبيرة:** اعمل commit بـ message وصفي بالعربي/إنجليزي + اعرض الـ diff
5. **لو واجهت قرار معقد:** Ahmed عنده agent ثاني (Perplexity Computer) ممكن يبحثله. قوله "اسأل Perplexity عن كذا" وانتظر الجواب

---

## الخطوة التالية

اقرأ الآن `PHASE_1_PLAN.md` وابدأ من الـ checkpoint الأول. **لا تتجاوز checkpoint بدون موافقة Ahmed صريحة.**

---

## مراجع تفصيلية (لو احتجت تتعمق)

كل ملف 30-50 صفحة:
- `research/01_architecture.md` — اختيار Next.js + ISR
- `research/02_backend_stack.md` — مقارنة 8 backends
- `research/03_auth.md` — Auth strategy للكويت
- `research/04_facebook_extraction.md` — ⚠️ اقرأه قبل أي شغل على FB
- `research/05_reviews_community.md` — تصميم نظام Reviews
- `research/06_seo.md` — SEO عند إضافة UGC
