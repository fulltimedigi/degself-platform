import { getFeaturedWorkshops } from "@/lib/workshops";
import { GarageTranslator } from "@/components/GarageTranslator";
import { QuickFilterPills } from "@/components/QuickFilterPills";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { GovernorateGrid } from "@/components/GovernorateGrid";
import { TopRatedCarousel } from "@/components/TopRatedCarousel";

export const revalidate = 3600; // ISR: rebuild at most once per hour

export default async function Home() {
  const featured = await getFeaturedWorkshops(12);

  return (
    <>
      {/* Hero (unchanged) */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">لا تحاتي، بنصلحها</h1>
        <p className="text-muted-foreground">
          دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
        </p>

        <form action="/search" className="flex w-full max-w-md gap-2">
          <input
            type="search"
            name="q"
            placeholder="ابحث عن كراج، منطقة، أو خدمة..."
            autoComplete="off"
            className="flex-1 rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            ابحث
          </button>
        </form>
      </section>

      {/* اكتشف العطل — قسم بارز فوق */}
      <section className="px-6 pb-4">
        <GarageTranslator />
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16">
        {/* Quick filter pills */}
        <QuickFilterPills />

        {/* Emergency CTA */}
        <EmergencyBanner />

        {/* Browse by governorate */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">تصفّح حسب المحافظة</h2>
          <GovernorateGrid />
        </section>

        {/* Top rated carousel */}
        <TopRatedCarousel workshops={featured} />
      </div>
    </>
  );
}
