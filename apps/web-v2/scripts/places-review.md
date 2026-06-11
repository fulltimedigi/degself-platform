# ملف مراجعة إثراء Google Places — قرارات معلّقة

**المصدر:** `scripts/places-enrichment.json` (تشغيل 2026-06-11 · 1798 كراج · 1771 OK · 27 not-found · 0 errors)
**الحالة:** مراجعة فقط — **لم يُطبَّق أي تغيير على الـ DB**. `apply-places.ts` لسه متوقّف لحد الموافقة.

دليل الأحكام:
- 🟢 **KEEP** — يفضل في قاعدة الكراجات.
- 🔴 **REMOVE** — مرشّح للحذف (مش automotive / مقفول دائم).
- 🟡 **NEEDS_REVIEW** — محتاج قرار بشري (بيانات ناقصة / place_id متعطّب / خدمة متنقلة).

---

## 1) الـ 27 not-found (24 NOT_FOUND + 3 INVALID_REQUEST)

> الـ `place_id` لهؤلاء راجع كـ مش-متلاقي أو غير صالح، فالإثراء لم يقدر يجيب بياناتهم. غالبيتهم خدمات **متنقلة** (ونش / بنشر متنقل / كراج متنقل) ملهاش موقع ثابت على Google، أو pins قديمة اتشالت.

### 1-أ) NOT_FOUND (24)

| # | الاسم | place_id | الحكم | السبب |
|---|---|---|---|---|
| 1 | بنشر متنقل كراج الاطار المتنقل تبديل بطاريات | `ChIJu6wL7ZCxHiMRb89sERpvXm8` | 🟡 NEEDS_REVIEW | بنشر/بطاريات متنقل — automotive بس بلا موقع ثابت؛ تأكد إنه شغّال (تليفون) |
| 2 | كراج كويت اونلاين تبديل بطاريات وتواير بنشر متنقل | `ChIJj_UtlJc4DwkRvwTwvIsk2dw` | 🟡 NEEDS_REVIEW | خدمة متنقلة، pin ميت |
| 3 | تبديل زجاج السيارات امام المنزل | `ChIJ11WW9GCczz8RJAP1OwwkqN4` | 🟡 NEEDS_REVIEW | زجاج سيارات متنقل — automotive، بلا موقع |
| 4 | بنشر متنقل | `ChIJdzV4vsh1zz8RDm7vhpShA8Y` | 🟡 NEEDS_REVIEW | اسم عام جداً، متنقل |
| 5 | YPG Motorsport | `ChIJL56Vx3abzz8RYTTZ76UhBVA` | 🟡 NEEDS_REVIEW | براند automotive حقيقي؛ الـ pin اتشال → دوّر على المكان الصحيح |
| 6 | فني تكييف هندي بالكويت | `ChIJizc5lmebzz8RoskRh-ZIwnY` | 🔴 REMOVE | تكييف (مباني) — مش سيارات |
| 7 | كراج متنقل تبديل بطاريات تبديل إطارات بنشر متنقل فكس اوتو كار | `ChIJc_3f8qoF-k0RONkF4LpQGLg` | 🟡 NEEDS_REVIEW | متنقل automotive، pin ميت |
| 8 | شركة كويت كار لتصليح كهرباء السيارات المتنقلة | `ChIJmSeZB5Y_HU8RHUEBC2EaRFI` | 🟡 NEEDS_REVIEW | كهرباء سيارات متنقلة — automotive، بلا موقع |
| 9 | غيار | `ChIJG7VJ0EMunIMR80o6IQFpcZI` | 🟡 NEEDS_REVIEW | اسم غامض (كلمة واحدة) — محتاج تأكيد |
| 10 | ونش وسطحة الكويت ٢٤ ساعة | `ChIJjT27SMKFzz8R3RVZM9vV0AQ` | 🟡 NEEDS_REVIEW | ونش/سطحة — خدمة طريق automotive بلا كراج ثابت |
| 11 | Indian crane roadside assistance service 24 hour | `ChIJO6_XzaqOhKsRdJ6HV3xCu00` | 🟡 NEEDS_REVIEW | مساعدة طريق متنقلة |
| 12 | ونش المطلاع | `ChIJ-w7hF3NTlQsROUbxVm1XPIA` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 13 | ونش سطحه الفروانية | `ChIJjQhKKQCZzz8R6wkPEyiZgEk` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 14 | Kwtwinch | `ChIJP_wdj_nid0URgWW4w9iuA3M` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 15 | أسرع ونش فى الكويت الشركة الكويتية | `ChIJQbCjBNhr5SMR6QAHLOgxTpQ` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 16 | ونش سطحه هيدروليك 90933131 | `ChIJWcza4zRDaC4RMAOH7-ifZEY` | 🟡 NEEDS_REVIEW | ونش متنقل (اسمه رقم تليفون) |
| 17 | ونش الاندلس السريع | `ChIJcQ4bK_uRzz8RrIB3CPRlyy4` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 18 | ونش 66600410 | `ChIJwWs5RU6Zzz8R6TueIxg2k6U` | 🟡 NEEDS_REVIEW | ونش متنقل (اسمه رقم تليفون) |
| 19 | ونش سطحه الجهراء | `ChIJzzmjKgD1zz8RKfq59yL9KU8` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 20 | ونش الصبية | `ChIJnbi3B3D1TWQR7aTrqniPbL4` | 🟡 NEEDS_REVIEW | ونش متنقل |
| 21 | تصليح تكييف | `ChIJA4kMPZmFzz8R4HKsBiVkySY` | 🔴 REMOVE | تكييف (مباني) — مش سيارات |
| 22 | فني تكييف الكويت 24 ساعة _ازهلها للتكييف والتبريد | `ChIJqROh7m_ht2kRMvBvzxkJDAg` | 🔴 REMOVE | تكييف وتبريد (مباني) — مش سيارات |
| 23 | نشتري سيارات نشتري السيارات | `ChIJW4N6t-Wbzz8RwbBpEeWHuXY` | 🟡 NEEDS_REVIEW | شراء سيارات — automotive بس listing تليفون |
| 24 | كراج متنقل بنشر متنقل تبديل بطاريه | `ChIJs2ZLMlOdzz8RiFC90NnDr4g` | 🟡 NEEDS_REVIEW | متنقل automotive، pin ميت |

### 1-ب) INVALID_REQUEST (3) — place_id متعطّب، الشركة حقيقية

> ⚠️ دول **مش** مرشّحين للحذف. "أوتوماك" شركة سيارات كبيرة ومعروفة في الكويت — المشكلة إن الـ `place_id` المخزّن **متعطّب/مقطوع** (لاحظ التنسيق غير المعتاد فيهم). الإجراء الصح: إعادة جلب الـ place_id الصحيح، مش الحذف.

| # | الاسم | place_id (متعطّب) | الحكم | السبب |
|---|---|---|---|---|
| 25 | Automak Automotive Headoffice - شركة أوتوماك للسيارات | `ChIJbbF1I1Kbzz-XCbWBGHWWEw` | 🟡 NEEDS_REVIEW | شركة سيارات حقيقية؛ place_id تالف → re-fetch |
| 26 | Automak Automotive Co - Shuwaikh 2 - شركة أوتوماك الشويخ 2 | `ChIJI5cK3wSbzz8sJ_16L6-fCQ` | 🟡 NEEDS_REVIEW | فرع حقيقي؛ place_id تالف → re-fetch |
| 27 | Automak Showroom - معرض أوتوماك | `ChIJt0p1RgCFzz_ku95AdGLKBw` | 🟡 NEEDS_REVIEW | معرض حقيقي؛ place_id تالف → re-fetch |

**ملخص القسم:** 3 🔴 REMOVE (تكييف) · 21 🟡 NEEDS_REVIEW (18 متنقل/غامض + 3 أوتوماك تالف).

---

## 2) الـ 3 المتفرقين من الـ mismatch (locksmith / parts / contractor)

| الاسم | place_id | types من Google | الحي | الحكم | السبب |
|---|---|---|---|---|---|
| شركة القفل الكويتي فتح سيارات الكويت صب مفاتيح الكويت فتح ابواب | `ChIJGy6fs4qczz8RZmYzDE8g8T0` | hardware_store, store | خيطان | 🟢 **KEEP** | ⚠️ الاسم بيقول صراحة **"فتح سيارات" + "صب مفاتيح"** = خدمة أقفال/مفاتيح **سيارات** = automotive. تصنيف Google (hardware_store) مضلّل — **mismatch كاذب، متشلهاش** |
| معرض الحساوي لقطع غيار التبريد والتكييف | `ChIJHxo56Yubzz8R6_d9q9J1IQU` | home_goods_store, store | الري | 🔴 REMOVE | "قطع غيار التبريد والتكييف" = قطع HVAC مش قطع سيارات |
| KAEFER Kuwait General Trading & Contracting Company WLL | `ChIJLRbKgfsHzz8REwYi1WM6HLo` | general_contractor | المنقف | 🔴 REMOVE | شركة عزل/مقاولات صناعية عالمية — مش automotive |

---

## 3) المقفولين (1 دائم + 9 مؤقت)

### 3-أ) CLOSED_PERMANENTLY (1)

| الاسم | place_id | الحي | الحكم | السبب |
|---|---|---|---|---|
| LLumar Kuwait - Al-Rai - لومار الري | `ChIJ0V6n7S2bzz8RXsRw6Q0RREk` | الري | 🔴 REMOVE | Google يؤكّد مقفول **دائم** → set `permanently_closed=true` / حذف |

### 3-ب) CLOSED_TEMPORARILY (9)

> مقفول **مؤقت** ≠ حذف. التوصية العامة: **KEEP** السجل + علّم status مؤقت + إعادة فحص لاحقاً. اتنين أسماؤهم عامة → review.

| الاسم | place_id | الحي | الحكم | السبب |
|---|---|---|---|---|
| New Hyundai & Genesis showrooms & Service center | `ChIJ5dq1WSKFzz8RusDHK9Cucfk` | شويخ الصناعية 1 | 🟢 KEEP | وكيل + مركز خدمة معروف؛ مؤقت — راقب |
| مؤسسة فل اتوماتيك لغسيل و تشحيم السيارات | `ChIJb1TrQj-bzz8RxUenIIcbYic` | شويخ الصناعية 3 | 🟢 KEEP | غسيل وتشحيم سيارات — automotive |
| National Fajir Company | `ChIJu1Duswebzz8R0UIy0sgsJGI` | الشويخ الصناعية | 🟡 NEEDS_REVIEW | اسم عام — تأكد النشاط automotive |
| KEVLAR PPF | `ChIJWxqxQ9mbzz8RSFgrfzueXjw` | الري | 🟢 KEEP | حماية طلاء سيارات (PPF) — automotive |
| Quality Care | `ChIJ_1curdObzz8RrcsreZU0jhk` | شويخ الصناعية 1 | 🟡 NEEDS_REVIEW | اسم عام — تأكد النشاط |
| شركة الضمان للفحص الفنى اسواق القرين | `ChIJAZzSAWShzz8RUzvDKH35br4` | غرب ابو فطيرة الحرفية | 🟢 KEEP | فحص فني سيارات — automotive |
| مقبرة الاطارات | `ChIJKfznWsfxzz8Ry5Egh-YQsbY` | الجهراء | 🟢 KEEP | تشليح/إطارات — automotive |
| مركز مقدم موتورز لبيع وشراء السيارات | `ChIJx8R51Fugzz8REE1Edi2wG0I` | غرب ابو فطيرة الحرفية | 🟢 KEEP | بيع وشراء سيارات — automotive |
| شركة فيلكا اوف رود لبيع زينة و اكسسوارات السيارات | `ChIJ0YQqT6abzz8RGRwf6oWz0B8` | الشويخ الصناعية | 🟢 KEEP | إكسسوارات سيارات off-road — automotive |

---

## 4) الـ 13 الواضحين (9 HVAC + 4 تنجيد) — بحكم REMOVE للمراجعة المشتركة

> حسب طلبك: متروكين هنا بحكم 🔴 **REMOVE** عشان نراجعهم سوا — **لن يُطبَّق الآن**.
> ⚠️ **تحفّظ على الـ 4 تنجيد:** أسماؤهم بتقول "تنجيد/تلبيس **مقاعد السيارات**" = automotive فعلاً (Google بيصنّفهم furniture_store لإنهم بيشتغلوا قماش/جلد). رأيي إنهم **KEEP** mismatch كاذب — محتاجين تأكيد في المراجعة المشتركة قبل أي حذف.

### 4-أ) 9 HVAC (تكييف مباني — REMOVE واضح)

| الاسم | place_id | types | الحي |
|---|---|---|---|
| Al-Maimoon Al-Kuawaitiyyah Air Conditioning & Refrigeration Co. W.L.L | `ChIJ76-Yb-mazz8Rv1Pj3VVtGr8` | general_contractor | الشويخ |
| شارع اللغمات 🏻‍ ️ | `ChIJy1bAgHmbzz8R_VKUOQqjMlE` | general_contractor | شويخ الصناعية 3 |
| Faris Al-Asmar for Air Conditioning Supplies and Contracting Est. | `ChIJWYvdkuN3zz8RY2di43JoQig` | general_contractor | السالمية |
| Al-Masayel Al-Arabia Air-conditioning co.Kuwait | `ChIJjSi0oJyZzz8RBBxVx1k5vow` | general_contractor | جليب الشيوخ |
| Fajar Al Eman Air Conditioning & HVAC Services | `ChIJG-kbyp-dzz8RmL6Pj3LJnzw` | general_contractor, store | حولي |
| Kuwait Air Conditioning Service | `ChIJD4PYW8ubzz8ROo7NOD7xNNk` | general_contractor | الرقعي |
| Ac Repair kuwait | `ChIJkWf9KUMJzz8RuhWOejikr-0` | general_contractor | المهبولة |
| Nesmat Al khaleej Co for maintenance of HVAC | `ChIJNYl95AwHzz8RdwruHE5hc24` | general_contractor, home_goods_store, storage, store | الفحيحيل |
| Sahara Air Conditioning Company | `ChIJHZbCzfAHzz8RWR14eWfRUA0` | general_contractor | شرق الأحمدي |

> ملاحظة: «شارع اللغمات» اسمه غريب (يشبه اسم شارع) — لو محتاج بصّة فردية اعتبره 🟡 NEEDS_REVIEW بدل REMOVE.

### 4-ب) 4 تنجيد (⚠️ غالباً KEEP — تنجيد مقاعد سيارات)

| الاسم | place_id | types | الحي | تحفّظ |
|---|---|---|---|---|
| مشتاق لتنجيد مقاعد السيارات | `ChIJl0zmlbqEzz8RtJPektyt9S0` | furniture_store, home_goods_store, store | المرقاب | ⚠️ "مقاعد **السيارات**" → automotive، رأيي KEEP |
| الخرينج للتنجيد | `ChIJC-iszgQHzz8RnVt6TPpYI78` | furniture_store, home_goods_store, store | الفحيحيل | ⚠️ تنجيد عام — تأكد سيارات/أثاث |
| مركز لاهور للتنجيد وتلبيس السيارات | `ChIJefdAqZCEzz8R52lmRYIwgeY` | furniture_store, home_goods_store, store | شرق | ⚠️ "تلبيس **السيارات**" → automotive، رأيي KEEP |
| Faylika upholstery shop | `ChIJMWrJOceazz8RECCokUpsA0s` | furniture_store, home_goods_store, store | الشويخ الصناعية | ⚠️ تنجيد — محتمل سيارات، تأكد |

---

## ملخص الأحكام

| الحكم | العدد | البنود |
|---|---|---|
| 🔴 REMOVE | **15** | 3 تكييف (not-found) + 2 متفرق (الحساوي + KAEFER) + 1 مقفول دائم + 9 HVAC |
| 🟢 KEEP | **8** | القفل الكويتي + 7 من المقفول مؤقت |
| 🟡 NEEDS_REVIEW | **23** | 18 متنقل/غامض + 3 أوتوماك (place_id تالف) + 2 مقفول مؤقت عام |
| ⚠️ متحفّظ عليه (مدرج REMOVE بطلبك، رأيي KEEP) | **4** | التنجيد الأربعة |

**الخطوة التالية:** مراجعة مشتركة لهذا الملف → موافقة → ساعتها فقط نشغّل `apply-places.ts`.
