# Legacy — webapp (v1)

هذا المجلد هو تطبيق **v1** القديم (React + Vite + Netlify).

## لا تستخدمه للإنتاج

- الإنتاج الحي: `apps/web-v2` على Vercel → https://degself.com
- مصدر البيانات الحي: Supabase (انظر `docs/SOURCE_OF_TRUTH.md`)
- هذا المجلد يبقى للأرشيف وبذرة الاستيراد التاريخية فقط

## ممنوع

- تطوير ميزات جديدة هنا
- اعتبار `netlify.toml` مصدر نشر حي بدون تحقق صريح
- تعديل `workshops.json` على أنه كتالوج الموقع الحالي

## أوقف Netlify

1. https://app.netlify.com → موقع `luminous-sunburst-002b08`
2. أوقف Auto publishing أو افصل المستودع من Continuous Deployment
3. تأكد أن `degself.com` على Vercel فقط

إذا احتجت تشغيله محلياً للرجوع فقط:

```bash
cd webapp
npm install
npm run dev
```
