# دليل Google Search Console — degself.com

ملخّص تشغيلي للخطوات بعد اكتمال البنية التقنية للسيو (PRs #37–#45: schema شامل،
عناوين/أوصاف، ساعات عمل، ربط داخلي، صور OG ديناميكية، ترتيب عادل).

> روابط ثابتة:
> - Search Console: https://search.google.com/search-console
> - الـsitemap: https://degself.com/sitemap.xml  (≈ 2072 رابط: 1860 كراج + 105 صفحة هبوط + 56 مقال)
> - اختبار النتائج الغنية: https://search.google.com/test/rich-results
> - معاينة بطاقة المشاركة: https://www.opengraph.xyz

---

## المرحلة 1 — الإعداد (مرة واحدة)

1. أضف الموقع كـ **Domain property** (وليس URL-prefix): اختر «Domain» وأدخل `degself.com`.
   - Google يعطيك سجل **TXT**؛ أضفه في DNS عند مزوّد النطاق (أو Vercel → Domains → DNS).
   - يغطّي www و non-www و http/https وكل النطاقات الفرعية دفعة واحدة.
2. اضغط **Verify** (قد يأخذ دقائق إلى ساعات بعد إضافة السجل).

## المرحلة 2 — الـsitemap والفهرسة الأولية

3. **Sitemaps** → أدخل `sitemap.xml` → **Submit**.
   - بعد أيام الحالة المتوقّعة "Success" وعدد URLs المكتشفة ≈ **2072**.
4. **URL Inspection** (الخانة العلوية) → الصق الرابط → **Request Indexing** للصفحات الأهم فقط:
   - `https://degself.com/`  (الرئيسية — مهمّة لكيان العلامة «دق سلف»)
   - `https://degself.com/mukhtarat`
   - `https://degself.com/best`
   - 3–5 من أقوى صفحات الهبوط، مثل `https://degself.com/كراج/صيانة/الشويخ`
   - الطلب اليدوي محدود يومياً — خصّصه للأهم؛ البقية يفهرسها Google عبر الـsitemap.

## المرحلة 3 — التحقّق من البيانات المنظَّمة

5. بـ **Rich Results Test** افحص عيّنة من كل نوع وتأكّد من خلوّها من الأخطاء:
   - الرئيسية → Organization + WebSite + LocalBusiness + FAQ
   - صفحة كراج (مثل `…/workshop/degself-mech-fanjari-shuwaikh-mercedes`) → AutoRepair + **ساعات العمل** + BreadcrumbList
   - `/best/{تخصص}` و `/كراج/{تخصص}/{منطقة}` → ItemList + Breadcrumb
   - مقال مدوّنة → Article
6. في GSC تابع **Enhancements / التحسينات** (Breadcrumbs، FAQ، Local) وراقب "Invalid items".

## المرحلة 4 — المراقبة الدورية (أول شهر: أسبوعياً)

7. **Pages (الفهرسة)**: راقب Indexed مقابل Not indexed وأسبابها. (Crawled/Discovered-not-indexed طبيعية لموقع كبير جديد وتتحسّن تدريجياً.)
8. **Performance**: تابع خصوصاً استعلام العلامة **«دق سلف»** (انطباعات/نقرات) — مقياس نجاح هدف البراند — واستعلامات مثل «كراج {منطقة}» و«صيانة سيارات الكويت».
9. **Core Web Vitals** + **Mobile Usability**: تأكّد أن الصفحات في نطاق "Good".
10. **Sitemaps**: آخر قراءة ناجحة، والعدد لم ينخفض فجأة.

## المرحلة 5 — تأكيد صور المشاركة (بعد نشر #44/#45)

11. خارج GSC لكنه تشغيلي مهم: شارك رابط كراج في واتساب/إكس أو افحصه على opengraph.xyz / Rich Results.
    - لو ظهرت الصورة الثابتة بدل البطاقة المخصّصة بعد اكتمال النشر → بلّغ الفريق (تعديل تتبّع الخط).

---

## ملاحظات مهمّة

- **الصبر**: الفهرسة وتحديث النتائج تأخذ **أيام إلى أسابيع**؛ لا تتوقّع تغيّراً فورياً.
- **Indexing API** (سكربت `submit-urls-indexing-api.ts`): رسمياً مدعوم فقط لأنواع `JobPosting`/`BroadcastEvent`، وقد يتجاهل الصفحات العادية. الاعتماد الصحيح لدليل كراجات = **sitemap + URL Inspection** لا الـAPI.
- **لا ترسل طلب فهرسة جماعي** لكل الـ1860 صفحة — مضيعة وقد يُعدّ إساءة؛ الـsitemap يكفي.

---

## قائمة تحقّق سريعة

- [ ] Domain property مُتحقَّق منه (TXT في DNS)
- [ ] sitemap.xml مُرسَل، الحالة Success
- [ ] طلب فهرسة: الرئيسية + /mukhtarat + /best + صفحات هبوط مختارة
- [ ] Rich Results Test نظيف لكل نوع schema
- [ ] متابعة أسبوعية: Pages + Performance(«دق سلف») + Core Web Vitals
- [ ] تأكيد بطاقة المشاركة الديناميكية على رابط كراج حيّ
