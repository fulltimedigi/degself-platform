import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "شروط الاستخدام | دق سلف",
  description:
    "شروط استخدام موقع دق سلف — حقوق المستخدمين وواجباتهم، وحدود مسؤولية المنصة كدليل لكراجات الكويت.",
  alternates: { canonical: "https://degself.com/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10" dir="rtl">
      <BreadcrumbJsonLd
        items={[
          { name: "الرئيسية", url: "https://degself.com/" },
          { name: "شروط الاستخدام", url: "https://degself.com/terms" },
        ]}
      />
      <h1 className="mb-2 text-2xl font-extrabold">شروط الاستخدام</h1>
      <p className="mb-8 text-sm text-muted-foreground">آخر تحديث: يونيو 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <p>
            باستخدامك لموقع «دق سلف» (degself.com) فإنك توافق على الشروط التالية. إن لم
            توافق على أي بند منها يُرجى عدم استخدام الموقع.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">1. طبيعة الخدمة</h2>
          <p>
            «دق سلف» منصة مجانية لعرض كراجات وورش وخدمات صيانة السيارات في دولة الكويت.
            دورنا هو ربط المستخدم بمزوّد الخدمة. نحن لسنا طرفاً في الاتفاق بين المستخدم
            والكراج، ولا نقدّم خدمات إصلاح السيارات بأنفسنا.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">2. حدود المسؤولية</h2>
          <ul className="list-disc space-y-2 pr-5">
            <li>
              الأسعار المعروضة في حاسبة الأسعار وفي صفحات الكراجات هي أسعار تقديرية
              مستندة إلى بيانات السوق الكويتي 2026؛ السعر النهائي يتحدّد بين العميل والكراج بعد
              الفحص.
            </li>
            <li>
              لا نضمن جودة الخدمة التي يقدّمها أي كراج مدرَج. اطلب عرض السعر وتفاصيل
              الضمان قبل الاتفاق.
            </li>
            <li>
              لا نتحمّل أي خسارة مباشرة أو غير مباشرة ناتجة عن استخدامك للموقع أو
              تعاملك مع أي كراج وصلت إليه عبره.
            </li>
            <li>
              المعلومات المعروضة (ساعات العمل، الموقع، الخدمات) يتم تحديثها دورياً، لكن
              قد تتغيّر دون إشعار. تواصل مع الكراج للتأكد.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">3. ميزة «اسأل دق سلف» (الذكاء الاصطناعي)</h2>
          <p>
            ميزة المترجم الذكي (
            <Link href="/isal-degself" className="font-bold text-primary hover:underline">
              /isal-degself
            </Link>
            ) تستخدم نماذج ذكاء اصطناعي لتحويل وصف المشكلة بكلامك العادي إلى مصطلحات فنية.
            هذه التوصيات استرشادية وليست بديلاً عن فحص ميكانيكي محترف. لا تتخذ قراراً
            بإصلاح أو شراء قطع بناءً على ردّ المساعد فقط.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">4. استخدام مقبول</h2>
          <p>عند استخدامك للموقع، تلتزم بأن:</p>
          <ul className="mt-2 list-disc space-y-2 pr-5">
            <li>لا تُرسل بلاغات كاذبة أو تقييمات مزيّفة.</li>
            <li>لا تستخدم الموقع لأي نشاط غير قانوني في دولة الكويت.</li>
            <li>
              لا تقوم بنسخ أو سحب البيانات (scraping) إلا للأغراض الشخصية وغير
              التجارية. الاستخدام التجاري يتطلّب إذناً خطياً.
            </li>
            <li>
              لا تحاول اختراق الموقع أو تجاوز إجراءات الأمان أو إساءة استخدام واجهات
              برمجة التطبيقات (APIs).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">5. الملكية الفكرية</h2>
          <p>
            اسم «دق سلف» وشعاره والعناصر التصميمية للموقع محميّة كملكية فكرية للمالك.
            يحقّ لك مشاركة الروابط، لكن إعادة نشر المحتوى أو إعادة استخدامه تجارياً تستلزم
            إذناً مكتوباً.
          </p>
          <p className="mt-2">
            بيانات الكراجات معروضة لأغراض دليلية فقط؛ كل كراج يحتفظ بحقوق علامته
            التجارية ومعلوماته.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">6. التقييمات والمحتوى المُرسَل</h2>
          <p>
            عند إرسال تقييم أو بلاغ عن كراج ناقص، فإنك تمنح «دق سلف» الحقّ في عرض هذا
            المحتوى علناً، مع الاحتفاظ بحقّ تعديله أو حذفه إذا خالف هذه الشروط.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">7. الكراجات المُدرَجة</h2>
          <p>
            «دق سلف» لا يأخذ مقابلاً مالياً من الكراجات للظهور في نتائج البحث؛ الترتيب
            عادل وغير مدفوع. إذا كنت صاحب كراج وتريد تعديل بياناتك أو حذف كراجك من
            الدليل، تواصل معنا عبر الواتساب.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">8. التغييرات على الخدمة</h2>
          <p>
            نحتفظ بحقّ تعديل الميزات أو إيقافها أو إضافة جديدة في أي وقت دون إشعار
            مسبق. ما لم نُخطركم عبر الموقع، يُعتبر استمرارك في الاستخدام موافقة على أي
            تحديث.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">9. الخصوصية</h2>
          <p>
            راجع{" "}
            <Link href="/privacy" className="font-bold text-primary hover:underline">
              سياسة الخصوصية
            </Link>{" "}
            لمعرفة البيانات التي نجمعها وكيف نتعامل معها. نحن نلتزم بقرار CITRA الكويتي
            رقم 26/2024 لحماية البيانات الشخصية.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">10. القانون المُطبَّق</h2>
          <p>
            تخضع هذه الشروط لقوانين دولة الكويت، وأي نزاع ينشأ عنها يتمّ حلّه أمام
            المحاكم الكويتية المختصة.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">11. التواصل</h2>
          <p>
            لأي استفسار حول هذه الشروط، تواصل معنا على:{" "}
            <a
              href="mailto:info@degself.com"
              className="font-bold text-primary hover:underline"
            >
              info@degself.com
            </a>{" "}
            أو عبر الواتساب الرسمي المعروض في{" "}
            <Link href="/about" className="font-bold text-primary hover:underline">
              صفحة «عن دق سلف»
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
