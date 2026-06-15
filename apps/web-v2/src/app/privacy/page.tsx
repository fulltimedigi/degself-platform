import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | دق سلف",
  description:
    "سياسة الخصوصية لموقع دق سلف — أي بيانات نجمعها، كيف نستخدمها، وكيف تطلب حذف بياناتك.",
  alternates: { canonical: "https://degself.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10" dir="rtl">
      <h1 className="mb-2 text-2xl font-extrabold">سياسة الخصوصية</h1>
      <p className="mb-8 text-sm text-muted-foreground">آخر تحديث: يونيو 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <p>
            «دق سلف» (degself.com) هو دليل مجاني لكراجات وورش وخدمات السيارات في الكويت.
            نحترم خصوصيتك، ونجمع أقل قدر ممكن من البيانات. هذه الصفحة توضّح ما نجمعه وكيف
            نستخدمه وكيف تطلب حذفه.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">البيانات التي نجمعها</h2>
          <ul className="list-disc space-y-1 pr-5">
            <li>
              <strong>الموقع لا يتطلب تسجيل حساب</strong> — لا نطلب اسمك أو بريدك أو رقمك
              لاستخدام الموقع.
            </li>
            <li>
              <strong>إحصاءات الاستخدام:</strong> نستخدم Google Analytics لقياس عدد الزيارات
              وكلمات البحث الشائعة بشكل مجمّع ومجهول، لتحسين الخدمة.
            </li>
            <li>
              <strong>التقييمات:</strong> عند إضافة تقييم لكراج، نحفظ نص التقييم والتقييم
              بالنجوم والاسم (إن كتبته اختيارياً). لا حاجة لتسجيل دخول.
            </li>
            <li>
              <strong>المفضّلة:</strong> الكراجات التي تحفظها تُخزَّن على جهازك (localStorage)
              فقط — لا تصل إلى خوادمنا.
            </li>
            <li>
              <strong>الموقع الجغرافي:</strong> إذا استخدمت «الأقرب لي»، يطلب المتصفح إذنك
              لتحديد موقعك لمرة واحدة لترتيب النتائج — ولا نخزّن موقعك.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">خدمات الطرف الثالث</h2>
          <p>
            نعتمد على خدمات موثوقة لتشغيل الموقع: خرائط Google، وGoogle Analytics،
            وVercel (الاستضافة)، وSupabase (قاعدة البيانات). تخضع هذه الخدمات لسياسات
            الخصوصية الخاصة بها.
          </p>
        </section>

        <section id="data-deletion">
          <h2 className="mb-2 text-lg font-bold">حذف بياناتك</h2>
          <p>
            بما أن الموقع لا يتطلب حساباً، فالبيانات الوحيدة المرتبطة بك قد تكون تقييماً
            أضفته. لطلب حذف أي تقييم أو بيانات تخصّك، راسلنا على:
          </p>
          <p className="mt-2 font-bold">
            <a href="mailto:fulltimedigi@gmail.com" className="text-primary hover:underline">
              fulltimedigi@gmail.com
            </a>
          </p>
          <p className="mt-2">
            اذكر في رسالتك ما تريد حذفه (مثلاً نص التقييم واسم الكراج)، وسننفّذ الطلب خلال
            مدة معقولة. ولحذف الكراجات المحفوظة على جهازك، امسح بيانات الموقع من إعدادات
            متصفحك.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">تواصل معنا</h2>
          <p>
            لأي استفسار بخصوص الخصوصية، راسلنا على{" "}
            <a href="mailto:fulltimedigi@gmail.com" className="text-primary hover:underline">
              fulltimedigi@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
