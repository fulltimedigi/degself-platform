import Image from "next/image";
import { BrandedCover } from "@/components/BrandedCover";

// بيانات تجريبية لمنشأة واحدة فقط — لاختبار BrandedCover (Checkpoint 2)
const TEST_WORKSHOP = {
  name: "كراج النخبة لصيانة السيارات",
  entityType: "كراج",
  specialty: "صيانة عامة",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-12 px-6 py-16">
      {/* اللوجو */}
      <Image
        src="/brand/logo-wordmark.svg"
        alt="degself — دق سلف"
        width={260}
        height={82}
        priority
        unoptimized
      />

      {/* التاجلاين الرسمي */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">لا تحاتي، بنصلحها</h1>
        <p className="mt-3 text-muted-foreground">
          دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
        </p>
      </div>

      {/* أزرار — اللون الأساسي الأصفر */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
          تصفّح الكراجات
        </button>
        <button className="rounded-xl border border-border px-6 py-3 font-bold text-foreground hover:bg-muted">
          كراج متنقل وسطحة
        </button>
      </div>

      {/* معاينة بطاقة BrandedCover ببيانات تجريبية */}
      <section className="w-full max-w-sm">
        <p className="mb-2 text-sm text-muted-foreground">
          معاينة بطاقة منشأة (بيانات تجريبية):
        </p>
        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-border">
          <BrandedCover
            name={TEST_WORKSHOP.name}
            entityType={TEST_WORKSHOP.entityType}
            specialty={TEST_WORKSHOP.specialty}
          />
        </div>
      </section>
    </main>
  );
}
