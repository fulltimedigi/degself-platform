import { Link } from "wouter";
import { MapPin, Phone, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { LogoEn, LogoAr, LogoHero, TAGLINE } from "@/components/Brand";

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
          <LogoHero className="mx-auto h-32 md:h-44" />
          <p className="mt-4 text-2xl font-extrabold text-primary md:text-3xl">{TAGLINE}</p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            <span className="font-en font-bold text-foreground">degself</span> (دق سلف) منصة كويتية
            تربط السائقين بالكراجات ومراكز الصيانة ومحلات قطع الغيار — بدون عناء البحث.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-xl font-extrabold md:text-2xl">قصتنا</h2>
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            كل سائق في الكويت مرّ بنفس التجربة: سيارة تحتاج صيانة، وحيرة في اختيار الكراج المناسب.
            من نسأل؟ هل الأسعار عادلة؟ هل الكراج موثوق؟
          </p>
          <p>
            <span className="font-en font-bold text-foreground">degself</span> وُلدت لتحل هذه المشكلة —
            دليل شامل يجمع كل الكراجات ومراكز الصيانة ومحلات قطع الغيار في الكويت في مكان واحد،
            مع المواقع والأرقام وساعات العمل والتقييمات.
          </p>
          <p>
            هدفنا بسيط: أن تجد المكان المناسب لسيارتك في ثوانٍ — <span className="font-bold text-primary">لا تحاتي، بنصلحها</span>.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-4xl px-4 py-14 md:px-6">
          <h2 className="mb-8 text-center text-xl font-extrabold md:text-2xl">كيف تعمل المنصة</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { i: Search, t: "ابحث", d: "ابحث بالتخصص أو المنطقة أو نوع المنشأة، أو تصفّح الخريطة." },
              { i: MapPin, t: "قارن", d: "اطّلع على التقييمات وساعات العمل والموقع لكل منشأة." },
              { i: Phone, t: "تواصل", d: "اتصل أو راسل عبر واتساب مباشرة، أو احصل على الاتجاهات." },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-card-border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <s.i size={20} />
                </div>
                <h3 className="mb-1 text-base font-bold">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status notice */}
      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-bold text-primary">ملاحظة:</span> المنصة في مرحلة التطوير والتحديث المستمر.
            البيانات قابلة للتعديل والإضافة. إذا لاحظت معلومة تحتاج تحديث، تواصل معنا.
          </p>
        </div>
      </section>

      {/* Brand assets + CTA */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-14 text-center md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-card-border bg-background p-6">
                <LogoEn className="h-10" />
              </div>
              <span className="text-xs text-muted-foreground">الشعار بالإنجليزية</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-card-border bg-background p-6">
                <LogoAr className="h-10" />
              </div>
              <span className="text-xs text-muted-foreground">الشعار بالعربية</span>
            </div>
          </div>

          <Link
            href="/search"
            className="mt-2 rounded-xl bg-primary px-8 py-3 text-base font-extrabold text-primary-foreground hover-elevate active-elevate-2"
            data-testid="link-cta-search"
          >
            ابدأ البحث الآن
          </Link>
        </div>
      </section>
    </Layout>
  );
}
