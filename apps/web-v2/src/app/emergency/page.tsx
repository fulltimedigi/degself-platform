import Link from "next/link";
import { Truck, Wrench } from "lucide-react";
import { searchWorkshops } from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "سطحة وكراج متنقل في الكويت | خدمة طوارئ السيارات | دق سلف",
  description:
    "تحتاج سطحة أو كراج متنقل الآن؟ دليل خدمات الطوارئ المتنقلة لسيارتك في جميع محافظات الكويت.",
  alternates: { canonical: "https://degself.com/emergency" },
  openGraph: {
    title: "سطحة وكراج متنقل في الكويت | خدمة طوارئ السيارات | دق سلف",
    description:
      "تحتاج سطحة أو كراج متنقل الآن؟ دليل خدمات الطوارئ المتنقلة لسيارتك في جميع محافظات الكويت.",
    url: "https://degself.com/emergency",
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "سطحة وكراج متنقل في الكويت | خدمة طوارئ السيارات | دق سلف",
    description: "دليل خدمات الطوارئ المتنقلة لسيارتك في جميع محافظات الكويت.",
    images: ["/og-image.jpg"],
  },
};

const TYPES = [
  { value: "tow", label: "سطحة", Icon: Truck },
  { value: "mobile", label: "كراج متنقل", Icon: Wrench },
] as const;

function pill(active: boolean) {
  return (
    "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
    (active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-foreground hover:bg-muted")
  );
}

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "tow" || sp.type === "mobile" ? sp.type : null;
  const shown = type ? TYPES.filter((t) => t.value === type) : TYPES;

  const sections = await Promise.all(
    shown.map(async (t) => {
      const { workshops } = await searchWorkshops({ service_mode: t.value, limit: 12 });
      return { ...t, workshops };
    })
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-extrabold">طوارئ — سطحة وكراج متنقل</h1>
      <p className="mt-1 text-muted-foreground">سيارتك عطلانة؟ دي خدمات بتيجي عندك.</p>

      {/* type toggle */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/emergency" className={pill(!type)}>
          الكل
        </Link>
        {TYPES.map((t) => (
          <Link key={t.value} href={`/emergency?type=${t.value}`} className={pill(type === t.value)}>
            {t.label}
          </Link>
        ))}
      </div>

      {sections.map(({ value, label, Icon, workshops }) => (
        <section key={value} className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Icon size={20} className="text-primary" aria-hidden />
              {label}
            </h2>
            <Link
              href={`/search?service_mode=${value}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              عرض الكل
            </Link>
          </div>

          {workshops.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workshops.map((w) => (
                <WorkshopCard key={w.place_id} workshop={w} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد نتائج حالياً.</p>
          )}
        </section>
      ))}
    </div>
  );
}
