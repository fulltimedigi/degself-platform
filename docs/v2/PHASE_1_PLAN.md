# Phase 1 — الأساسات (Next.js + Supabase + Auth)

> **المدة المتوقعة:** أسبوع شغل فعلي (موزع على 10 أيام بسبب انتظار موافقات Meta على WhatsApp template)
>
> **الهدف:** موقع Next.js شغّال على Vercel بنفس بيانات الـ v1 + auth جاهز، **بدون reviews لسه**.
>
> **القاعدة الحاكمة:** كل checkpoint لازم Ahmed يوافق صراحةً قبل الانتقال للي بعده.

---

## Checkpoint 0 — التحضير (مهام Ahmed)

قبل ما Claude Code يبدأ، Ahmed لازم يعمل:

- [ ] **إنشاء حساب Supabase** على https://supabase.com (مجاني للبداية)
- [ ] **إنشاء حساب Vercel** على https://vercel.com (مجاني)
- [ ] **إنشاء حساب Twilio** على https://twilio.com (محتاج بطاقة دفع — سنُنفق ~$5 شهرياً للاختبار)
- [ ] **شراء رقم واتساب أعمال** من Twilio Console (~$1/شهر)
- [ ] **طلب template approval من Meta** لرسالة OTP (يستغرق 3-7 أيام — نبدأها مبكراً)

**ملاحظة:** Claude Code يقدر يرشد Ahmed خطوة بخطوة في كل واحد منها.

---

## Checkpoint 1 — إنشاء branch + Next.js scaffold

**الوقت المتوقع:** ساعة واحدة

```bash
# في degself-platform/
git checkout -b v2-nextjs
mkdir -p apps/web-v2
cd apps/web-v2
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint
```

**التحقق:**
- [ ] الـ branch `v2-nextjs` ظاهر في `git branch`
- [ ] `apps/web-v2/` فيه Next.js project
- [ ] `npm run dev` يشغّل على http://localhost:3000

**⏸ STOP — اعرض Ahmed:** screenshot من Next.js default page + `git status` ثم انتظر "موافق".

---

## Checkpoint 2 — نقل design system من v1

**الوقت المتوقع:** 2-3 ساعات

### المهام
1. انسخ Tailwind config من `webapp/tailwind.config.ts` لـ `apps/web-v2/tailwind.config.ts`
2. انسخ ألوان degself + fonts من `webapp/client/src/index.css`
3. انسخ `BrandedCover.tsx` كما هو
4. انسخ logo SVG من `brand/` لـ `apps/web-v2/public/brand/`
5. اضبط `<html lang="ar" dir="rtl">` في `apps/web-v2/src/app/layout.tsx`
6. أضف Arabic webfont (Cairo أو IBM Plex Sans Arabic)

**التحقق:**
- [ ] الصفحة الرئيسية تظهر بالـ RTL
- [ ] ألوان degself ظاهرة
- [ ] Logo يظهر بشكل صحيح
- [ ] `BrandedCover` يعمل بـ test data

**⏸ STOP — اعرض Ahmed:** screenshot + انتظر "موافق".

---

## Checkpoint 3 — Supabase setup + استيراد البيانات

**الوقت المتوقع:** 2-3 ساعات

### المهام
1. Ahmed ينشئ Supabase project (region: **Mumbai ap-south-1**)
2. Ahmed يعطيك `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
3. خزّنها في `apps/web-v2/.env.local` (لا تعمل commit لها — أضفها لـ `.gitignore`)
4. شغّل SQL schema من `SUPABASE_SETUP.md` في Supabase SQL Editor
5. اكتب سكريبت Node.js لاستيراد `workshops.json` لجدول `workshops`:
   ```typescript
   // apps/web-v2/scripts/import-workshops.ts
   ```
6. شغّله: `npx tsx scripts/import-workshops.ts`
7. تحقق في Supabase Dashboard إن 1801 record موجودين

**⚠️ تنبيه:** `place_id` case-sensitive — استخدم `text` مش `citext`.

**التحقق:**
- [ ] جدول `workshops` فيه 1801 صف
- [ ] استعلام تجريبي يرجع البيانات: `select count(*) from workshops where area = 'الشويخ';`
- [ ] الحقل `service_mode` متعبأ بـ `fixed`/`mobile`/`tow` صحيح

**⏸ STOP — اعرض Ahmed:** count من Supabase Dashboard + انتظر "موافق".

---

## Checkpoint 4 — صفحة Home + Search مع ISR

**الوقت المتوقع:** 3-4 ساعات

### المهام
1. أنشئ `apps/web-v2/src/app/page.tsx` — Home (نسخة من v1 لكن fetch من Supabase)
2. أنشئ `apps/web-v2/src/app/search/page.tsx` — Search مع filters
3. أنشئ `apps/web-v2/src/app/workshop/[place_id]/page.tsx` — تفاصيل
4. كل صفحة workshop تستخدم:
   ```typescript
   export const revalidate = 3600; // ISR: rebuild every hour
   export async function generateStaticParams() { ... } // pre-render top 100
   ```
5. أضف JSON-LD `AutoRepair` schema (بدون reviews لسه)
6. اضبط `next-sitemap` لـ sitemap.xml

**التحقق:**
- [ ] `view-source` على workshop page يظهر البيانات في HTML (مش بعد JS load)
- [ ] Lighthouse score ≥ 90 للـ SEO
- [ ] Build time معقول (< 5 دقايق لـ 1801 صفحة)

**⏸ STOP — اعرض Ahmed:** 3 screenshots (Home/Search/Workshop) + sample view-source + انتظر "موافق".

---

## Checkpoint 5 — WhatsApp OTP Auth

**الوقت المتوقع:** 3-4 ساعات + انتظار Meta approval

### المهام
1. تأكد إن Twilio template تمت الموافقة عليه
2. ركّب `@supabase/ssr` + اكتب middleware للـ auth
3. اكتب API route `/api/auth/send-otp` يستدعي Twilio Verify
4. اكتب API route `/api/auth/verify-otp` يتحقق + ينشئ user في Supabase
5. أضف **Cloudflare Turnstile** قبل send-otp (إجباري!)
6. اضبط rate limit: 3 OTP/IP/hour
7. أضف Google Sign-In كـ fallback عبر Supabase Auth UI
8. صفحة `/profile` بسيطة تظهر "أهلاً [اسم]" + زر logout

**⚠️ حماية إجبارية:**
- Country whitelist: أرقام `+965` فقط
- Turnstile token verification في الـ backend
- خزّن `hashed_ip` لكل OTP request

**التحقق:**
- [ ] Ahmed يستخدم رقمه ويستلم OTP على WhatsApp
- [ ] OTP خطأ يفشل بدون كشف معلومات
- [ ] محاولة من رقم غير كويتي تُرفض
- [ ] Rate limit يعمل (4th attempt يفشل)

**⏸ STOP — اعرض Ahmed:** فيديو 30 ثانية لـ flow كامل + انتظر "موافق".

---

## Checkpoint 6 — Deploy على Vercel + Domain testing

**الوقت المتوقع:** 1-2 ساعة

### المهام
1. اربط GitHub repo بـ Vercel
2. اضبط environment variables في Vercel Dashboard
3. Deploy preview على subdomain مؤقت مثل `v2.degself.vercel.app`
4. **لا تغيّر DNS بعد!** الـ production لسه على Netlify
5. اختبر كل الـ flows على الـ preview URL

**التحقق:**
- [ ] الموقع شغّال على Vercel preview
- [ ] Auth يعمل في production environment
- [ ] Supabase queries سريعة (< 200ms من الكويت)

**⏸ STOP — اعرض Ahmed:** الـ preview URL + انتظر "موافق نخلص Phase 1".

---

## Checkpoint 7 — Phase 1 Sign-off

عند هذه النقطة:
- ✅ موقع Next.js كامل بنفس بيانات v1
- ✅ Auth بالواتساب يعمل
- ✅ ISR ready للـ reviews
- ❌ لسه مفيش reviews UI (هذا Phase 2)

**Ahmed يقرر:**
- (أ) ننتقل لـ Phase 2 (Reviews) فوراً
- (ب) نطلق v2 كـ replacement لـ v1 الآن (DNS switch) ثم نضيف Reviews
- (ج) نوقف لمراجعة

**التوصية:** الخيار (أ) — أكمل Reviews ثم اعمل DNS switch مرة واحدة.

---

## القائمة السريعة للموافقات المطلوبة من Ahmed

| Checkpoint | يحتاج موافقة Ahmed | يحتاج دفع/حساب |
|---|---|---|
| 0 | — | Supabase + Vercel + Twilio accounts |
| 1 | ✅ بعد branch creation | — |
| 2 | ✅ بعد design system | — |
| 3 | ✅ بعد import | Supabase keys |
| 4 | ✅ بعد 3 pages | — |
| 5 | ✅ بعد auth flow | Twilio number + Meta template |
| 6 | ✅ بعد Vercel deploy | Vercel project linking |

---

## لو حصل خطأ

1. **مشكلة build:** شغّل `npm run build` محلياً وأعرض الـ error على Ahmed
2. **مشكلة Supabase:** افتح Supabase Dashboard → Logs → اعرض الـ stack trace
3. **مشكلة Twilio:** افتح Twilio Console → Monitor → Errors
4. **قرار معقد يحتاج بحث:** قول لـ Ahmed "اسأل Perplexity عن [السؤال]" وانتظر الجواب
