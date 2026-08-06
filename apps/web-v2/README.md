# degself web-v2

التطبيق النشط لـ [degself.com](https://degself.com) (Next.js على Vercel).

انظر مستندات المستودع:
- [`../../README.md`](../../README.md) — نظرة عامة
- [`../../docs/SOURCE_OF_TRUTH.md`](../../docs/SOURCE_OF_TRUTH.md) — مصدر الحقيقة

**Stack:** Next.js 16.3.0 (App Router) · React 19.2 · TypeScript · Supabase · next-intl (ar/en/hi/ur) · Anthropic Claude models. **حالة المنتج:** Stable operational beta.

```bash
cp .env.example .env.local   # عبّئ القيم محليًا — لا تُودِعها في Git
npm ci                       # تثبيت مطابق للقفل (أو npm install للتطوير)
npm run dev                  # خادم التطوير
npm run typecheck            # tsc --noEmit
npm test                     # اختبارات الوحدة
npm run build                # بناء الإنتاج
npm run load-smoke           # فحص حِمل بسيط (يستهدف خادمًا يعمل)
```

المتغيّرات البيئية (الأسماء + التصنيف public/server-only) وتفاصيل CI/النشر/قاعدة البيانات موثّقة في [`../../README.md`](../../README.md). معرّفات نماذج Claude الفعلية تعيش في الكود، لا في التوثيق العام.
