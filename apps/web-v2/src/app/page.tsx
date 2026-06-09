import Link from "next/link";
import { getFeaturedWorkshops } from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";

export const revalidate = 3600; // ISR: rebuild at most once per hour

const QUICK_SPECIALTIES = [
  { label: "ميكانيكا", q: "ميكانيكا" },
  { label: "كهرباء", q: "كهرباء" },
  { label: "تكييف", q: "تكييف" },
];

export default async function Home() {
  const featured = await getFeaturedWorkshops(12);

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">لا تحاتي، بنصلحها</h1>
        <p className="text-muted-foreground">
          دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت
        </p>

        {/* Search bar — native GET form → /search?q=... (works without JS, stays static) */}
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

        {/* Quick specialty links */}
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_SPECIALTIES.map((s) => (
            <Link
              key={s.q}
              href={`/search?q=${encodeURIComponent(s.q)}`}
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured workshops */}
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <h2 className="mb-4 text-xl font-bold">منشآت مختارة</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((w) => (
            <WorkshopCard key={w.place_id} workshop={w} />
          ))}
        </div>
      </section>
    </>
  );
}
