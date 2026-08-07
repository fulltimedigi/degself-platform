# degself — منصة كراجات الكويت

> دق سلف — منصة تربط أصحاب السيارات بكراجات الصيانة في الكويت

**الإنتاج الحي:** [degself.com](https://degself.com) ← تطبيق `apps/web-v2` على **Vercel** + **Supabase**

**حالة المنتج:** Stable operational beta with production deployment, automated release checks, and active security hardening.

---

## مصدر الحقيقة (مهم)

| الطبقة | المصدر |
|---|---|
| التطبيق الحي | `apps/web-v2/` |
| كتالوج الكراجات | جدول Supabase `workshops` |
| طبقات إثراء (smart_score وغيرها) | `apps/web-v2/src/data/*.json` |
| أرشيف / بذرة قديمة | `data/` و `webapp/` — **ليست** مصدر التشغيل |

التفاصيل: [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md)

---

## هيكل المشروع

```
degself-platform/
├── apps/web-v2/          # ★ التطبيق النشط (Next.js → Vercel)
├── webapp/               # إرث v1 (Vite + Netlify) — مجمّد للتاريخ/البذرة
├── data/                 # أرشيف بيانات قديم (لا يقرأه التطبيق الحي)
├── data-collection/      # سكربتات Python للتنظيف والتدقيق
├── scripts/              # سكربتات دمج/تخصيص قديمة
├── docs/                 # توثيق + بحث v2
├── brand/                # الهوية البصرية
└── netlify.toml          # إعداد نشر v1 القديم (غير مصدر الإنتاج الحالي)
```

---

## التطبيق النشط (`apps/web-v2`)

**Stack:** Next.js 16.3.0 (App Router) · React 19.2 · TypeScript · Supabase (PostgreSQL) · next-intl (ar/en/hi/ur) · Anthropic Claude models · Vercel

> ملاحظة: نستخدم نماذج Claude من Anthropic (عبر `@anthropic-ai/sdk`) لميزتَي «اسأل دق سلف» و«الترجمة». لا نثبّت اسم إصدار نموذج في التوثيق العام لأنه سريع التغيّر؛ معرّفات النماذج الفعلية تعيش في الكود (`src/lib/asaali-cost-guard.ts` والمسارات).

### ميزات شغّالة الآن
- بحث وفلاتر + صفحات كراج + خريطة
- صفحات تخصص/منطقة وماركات سيارات
- طوارئ (كراج متنقل / سطحة)
- اسأل دق سلف (AI باللهجة)
- طلب عرض سعر + لوحة عروض للإدارة
- مدونة، أسعار، محفوظات، بلاغ عن كراج
- تقييمات (إرسال + موافقة يدوية من الأدمن)
- SEO / ISR / sitemap / OG

### غير مكتمل بعد
- تسجيل دخول للمستخدم النهائي (WhatsApp OTP / Google) — معطّل حاليًا
- إرسال واتساب الآلي للكراجات — مربوط بعلم تشغيل (feature flag)

---

## التشغيل المحلي والأوامر الفعلية

كل الأوامر تُنفَّذ من داخل `apps/web-v2` (الأسماء مطابقة لـ`package.json`):

```bash
cd apps/web-v2
cp .env.example .env.local   # عبّئ القيم محليًا — لا تُودِعها في Git
npm ci                       # تثبيت مطابق للقفل (reproducible)؛ للتطوير السريع: npm install
npm run dev                  # خادم التطوير
npm run typecheck            # tsc --noEmit
npm test                     # اختبارات الوحدة (tsx --test src/lib/__tests__/*.test.ts)
npm run build                # بناء الإنتاج (next build)
npm run start                # تشغيل خادم الإنتاج بعد build
npm run load-smoke           # فحص حِمل بسيط (scripts/load-smoke.mjs) — يستهدف خادمًا يعمل
```

> فحوص المسارات الحرجة (critical route smoke) تُشغَّل داخل CI مقابل خادم إنتاج مبنيّ (انظر قسم CI)، لا كأمر npm منفصل.

---

## متغيّرات البيئة

توثيق **الأسماء فقط** — لا قيم. القائمة الكاملة القابلة للنسخ في `apps/web-v2/.env.example`.
قاعدة صارمة: مفاتيح `service_role` وAnthropic وأي أسرار أخرى **لا** تُوضع أبدًا في متغيّر يبدأ بـ`NEXT_PUBLIC_`.

**عامة (browser-exposed — ليست أسرارًا، بادئة `NEXT_PUBLIC_`):**

| المتغيّر | الغرض |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | الرابط العام للموقع |
| `NEXT_PUBLIC_SUPABASE_URL` | نقطة Supabase العامة |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | مفتاح المتصفّح (المُفضَّل) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | بديل قديم مقبول للمفتاح العام |

**خادم فقط (أسرار — لا تُكشف للمتصفّح):**

| المتغيّر | الغرض |
|---|---|
| `SUPABASE_SECRET_KEY` (أو `SUPABASE_SERVICE_ROLE_KEY`) | مفتاح service-role للخادم فقط |
| `ANTHROPIC_API_KEY` | نماذج Claude (اسأل دق سلف / الترجمة) |
| `ADMIN_SESSION_SECRET` | مفتاح HMAC لجلسة الأدمن |
| `MODERATION_PASSWORD` | كلمة إقلاع دخول الأدمن |
| `IP_HASH_SALT` | تمليح تجزئة IP في حارس التكلفة |
| `CRON_SECRET` | حماية مسار الـcron |
| `WHATSAPP_ENABLED`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_TEMPLATE_OFFERS`, `WHATSAPP_TEMPLATE_LANG` | واتساب Cloud API (اختياري، مُقيَّد بعلم `WHATSAPP_ENABLED`) |
| `GSC_SERVICE_ACCOUNT_KEY` | فهرسة Google Search Console (cron) |
| `GOOGLE_MAPS_API_KEY` | خدمات خرائط جانب الخادم (سكربتات) |
| `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` | تنبيهات المؤسِّس (اختياري) |
| `IG_APP_ID`, `IG_APP_SECRET`, `IG_USER_ID`, `IG_USER_TOKEN`, `IG_LONG_TOKEN`, `IG_TOKEN_EXPIRES` | سكربتات النشر على إنستغرام (خارج تطبيق الويب) |

> تسجيل دخول Google يُضبط في لوحة Supabase (Authentication → Providers)، لا عبر متغيّرات بيئة هنا.

---

## CI

- **Workflow:** `web-v2 CI` (`.github/workflows/web-v2-ci.yml`) — يعمل على push إلى `master` وعلى الـPRs التي تمسّ `apps/web-v2/**`.
- **الوظيفة/الفحص المطلوب:** `check` (Node 24) بالخطوات بالترتيب:
  1. `npm ci`
  2. `npm audit --omit=dev --audit-level=high`
  3. `npm run typecheck`
  4. `npm test`
  5. `npm run build`
  6. Critical route smoke — يشغّل خادم الإنتاج ويتحقق من مسارات: `/`, `/about`, `/login`, `/quote/new`, `/isal-degself`, `/admin/login`, `/search?q=قير`.
- متغيّرات CI العامة (site/supabase url + publishable key) عامة قصدًا وليست أسرارًا.

---

## النشر (Deployment)

- **المضيف:** **Vercel** (framework: `nextjs`، انظر `apps/web-v2/vercel.json`).
- **الإنتاج:** [https://degself.com](https://degself.com) — يُنشَر تلقائيًا عند دمج التغييرات إلى `master`.
- **Cron:** مهمة يومية `/api/cron/gsc-indexing` (`0 18 * * *`) معرّفة في `vercel.json`.
- ملاحظة: قد تظهر على الـPRs فحوص تكامل Netlify قديمة (`luminous-sunburst-002b08`) — **إعلامية فقط وليست مضيف الإنتاج**؛ الإنتاج على Vercel حصرًا.

---

## قاعدة البيانات (Supabase)

- مشروع Supabase الحيّ: ref `xqmwhrimxnvqlpvfzcac`.
- **Migrations المطبّقة على الإنتاج حتى: `028_rls_policy_and_fk_index_hardening`** (المصدر: `apps/web-v2/supabase/migrations/`).
- **`029_move_search_extensions_to_extensions_schema` غير مطبّقة وليست على `master`** — توجد فقط داخل PR #106 (Draft) وتنتظر تنفيذًا بصلاحية مالك الامتدادات (`supabase_admin`). لا تعتبرها جزءًا من الإنتاج أو من `master`.

---

## الأمان

- فرع `master` محمي بـ**Repository Ruleset** يفرض المرور عبر Pull Request ونجاح فحص `check` (مع منع الحذف وال‑force‑push وحلّ المحادثات).
- **حماية كلمات المرور المسرَّبة (leaked-password protection) مفعّلة** على Supabase Auth.
- **ممنوع وضع أي أسرار في Git.** ملف `.env.example` يذكر أسماء المتغيّرات فقط بلا قيم.
- مفاتيح `service_role` وAnthropic خادمية فقط ولا تُوضع في `NEXT_PUBLIC_`.

---

## قيود معروفة (Known limitations)

- المشروع في مرحلة **Operational Beta** — مستقر وحيّ على الإنتاج مع فحوص إصدار آلية، لكنه ليس production-mature بالكامل.
- اختبارات E2E التي تتطلّب OAuth حقيقيًا أو استدعاءات Anthropic مدفوعة **ليست** ضمن المجموعة الآلية؛ التغطية الآلية = وحدة + أنواع + بناء + فحص مسارات حرجة.
- تسجيل دخول المستخدم النهائي (OTP/Google) وإرسال واتساب الآلي مربوطان بأعلام تشغيل وقد لا يكونان مفعّلَين في الإنتاج.
- PR #106 (نقل `pg_trgm`/`unaccent` خارج `public`) ينتظر ردّ Supabase بسبب ملكية الامتدادات لدور `supabase_admin`.
- ليست كل مسارات الإنتاج أو الـworkflows مُختبَرة يدويًا؛ CI هو البوابة النهائية.

---

## الهوية البصرية

- **الاسم:** degself (دق سلف)
- **الأساسي:** أسود `#0A0A0A`
- **المميز:** أصفر `#FFD60A`
- **الشعار:** مفتاح كونتاكت سيارة — انظر `brand/BRAND_GUIDE.md`
- **الدومين:** degself.com

---

## ملاحظات للإرث (v1)

- `webapp/` + `netlify.toml` يبقيان في المستودع كمرجع وبذرة استيراد أولية إلى Supabase.
- لا تطوّر ميزات جديدة على v1.
- مستندات `docs/v2/CLAUDE_CODE_BRIEF.md` وخطط المرحلة قديمة جزئيًا بخصوص Netlify كإنتاج — اعتمد هذا الـ README و`SOURCE_OF_TRUTH.md`.

---

## المالك

أحمد عبدالحليم — [@fulltimedigi](https://github.com/fulltimedigi)

الكويت
