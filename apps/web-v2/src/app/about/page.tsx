import Link from "next/link";

export const metadata = {
  title: "عن دق سلف | دليل كراجات وخدمات السيارات في الكويت",
  description: "دق سلف — لا تحاتي واكتشف عطل سيارتك الآن وحدد الكراج المناسب. دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-extrabold">عن دق سلف</h1>
      <p className="mt-2 text-xl font-bold text-primary">لا تحاتي واكتشف عطل سيارتك الآن وحدد الكراج المناسب</p>

      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-muted-foreground">
        <p>
          دق سلف دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت — من الصيانة العامة
          والتواير والبودي والبطاريات، لحد السطحة والكراج المتنقل وقت الطوارئ.
        </p>
        <p>
          بنخليك تلاقي الكراج المناسب بسرعة: بحث بالكويتي (تكتب «جراج» يلاقيلك «كراج»)،
          فلترة بالمنطقة والمحافظة والتخصص، ومواعيد العمل ومعلومات التواصل في مكان واحد.
        </p>
        <p>
          إحنا نخاطبك كصاحب سيارة، مش كعميل — نوريك الخدمة الصح، ونوصّلك لها. وقريباً
          هتقدر تشوف تجارب الناس وتقييماتهم وتشارك بتجربتك.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/search"
          className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          ابدأ البحث
        </Link>
        <Link
          href="/emergency"
          className="rounded-xl border border-border px-6 py-3 font-bold text-foreground hover:bg-muted"
        >
          طوارئ — سطحة وكراج متنقل
        </Link>
      </div>
    </div>
  );
}
