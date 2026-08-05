# مصدر الحقيقة — degself

آخر تحديث: 2026-08-05

هذا الملف يحسم التضارب بين الوثائق القديمة والكود الحي.

## الإنتاج

| السؤال | الجواب |
|---|---|
| الموقع الحي | https://degself.com |
| التطبيق | `apps/web-v2` |
| الاستضافة | Vercel |
| قاعدة البيانات | Supabase (Postgres + RLS) |

`webapp/` + `netlify.toml` = **إرث v1**. لا تُعامل كإنتاج إلا إذا أُثبت نشر نشط بخلاف ما سبق.

## البيانات

| الاستخدام | المصدر |
|---|---|
| قائمة الكراجات في الموقع | جدول Supabase `workshops` عبر `apps/web-v2/src/lib/workshops.ts` |
| أنواع TypeScript للكراج | `apps/web-v2/src/lib/types.ts` ↔ `supabase/schema.sql` + migrations |
| إثراء التقييمات / smart_score | `apps/web-v2/src/data/workshops_enriched_lookup.json` |
| بذرة الاستيراد التاريخية | `webapp/client/public/data/workshops.json` (سكربت import فقط) |
| أرشيف قديم | `data/workshops_master.json` — **لا يقرأه التطبيق الحي** |

لا يوجد في v2 مسار runtime يرجع لملف JSON ككتالوج بديل عن Supabase.

## المسارات الحساسة

- لوحة الأدمن: `/admin/*` (جلسة كوكي موقعة — انظر `src/lib/admin-session.ts`)
- APIs الإدارية: `/api/admin/*` + `/api/reviews/moderate`
- أسرار التشغيل: متغيرات البيئة في Vercel (انظر `apps/web-v2/.env.example`)

## وثائق قديمة (لا تعتمد عليها للإنتاج)

- جذر `README.md` قبل تحديث آب 2026 (كان يصف منصة بيانات فقط)
- `docs/v2/CLAUDE_CODE_BRIEF.md` — ما زال يقول Netlify = production
- `docs/v2/PHASE_1_PLAN.md` — checkpoints قديمة
- تعليقات في `apps/web-v2/scripts/import-workshops.ts` عن JSON كـ SOT = صحيحة **وقت البذرة فقط**
