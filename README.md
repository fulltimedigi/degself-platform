# degself — منصة كراجات الكويت

> دق سلف — منصة تربط أصحاب السيارات بكراجات الصيانة في الكويت

**الإنتاج الحي:** [degself.com](https://degself.com) ← تطبيق `apps/web-v2` على **Vercel** + **Supabase**

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

**Stack:** Next.js (App Router) · React 19 · Supabase · next-intl (ar/en/hi/ur) · Vercel

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

## التشغيل المحلي

```bash
cd apps/web-v2
cp .env.example .env.local   # عبّئ المفاتيح
npm install
npm run dev
```

انظر `.env.example` داخل `apps/web-v2` لقائمة المتغيرات.

```bash
npm test                     # اختبارات الوحدة
npx tsc --noEmit             # فحص الأنواع
```

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
