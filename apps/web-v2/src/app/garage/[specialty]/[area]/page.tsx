import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLandingCombos, getLandingWorkshops } from "@/lib/landing";
import { WorkshopCard } from "@/components/WorkshopCard";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const revalidate = 86400; // daily
export const dynamicParams = false; // only pre-generated (≥3) combos exist — no thin pages

export async function generateStaticParams() {
  const combos = await getLandingCombos();
  return combos.map((c) => ({ specialty: c.specialty, area: c.area }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ specialty: string; area: string }>;
}): Promise<Metadata> {
  const { specialty: rs, area: ra } = await params;
  const specialty = decodeURIComponent(rs); // Next 16 passes params percent-encoded
  const area = decodeURIComponent(ra);
  const res = await getLandingWorkshops(specialty, area, 1);
  if (!res) return { title: "غير موجود — دق سلف" };
  return {
    title: `كراجات ${res.label} في ${area} | دق سلف`,
    description: `دليل كراجات ${res.label} في ${area} بالكويت — العناوين، الهواتف، المواعيد. اكتشف عطل سيارتك الآن واختر الكراج المناسب.`,
    alternates: { canonical: `/كراج/${specialty}/${area}` },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ specialty: string; area: string }>;
}) {
  const { specialty: rs, area: ra } = await params;
  const specialty = decodeURIComponent(rs); // Next 16 passes params percent-encoded
  const area = decodeURIComponent(ra);
  const res = await getLandingWorkshops(specialty, area);
  if (!res || res.total === 0) notFound();

  // other areas that have a VALID landing page for this specialty (no dead links)
  const combos = await getLandingCombos();
  const otherAreas = combos
    .filter((c) => c.specialty === specialty && c.area !== area)
    .map((c) => c.area);

  // Public Arabic URL for this page (matches the /كراج rewrite).
  const pageUrl = `${SITE}/كراج/${specialty}/${area}`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `كراجات ${res.label} في ${area}`,
    description: `دليل كراجات ${res.label} في ${area} بالكويت — العناوين، الهواتف، المواعيد.`,
    url: pageUrl,
    inLanguage: "ar",
    isPartOf: { "@id": `${SITE}/#website` },
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: res.workshops.slice(0, 10).map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/workshop/${w.place_id}`,
      name: w.name,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: `كراجات ${res.label}`, item: `${SITE}/كراج/${specialty}` },
      { "@type": "ListItem", position: 3, name: area, item: pageUrl },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={collectionLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />
      <h1 className="text-2xl font-extrabold">
        كراجات {res.label} في {area}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        دليلك لأفضل كراجات ومراكز {res.label} في منطقة {area} بالكويت — لاقِ العنوان
        والهاتف والمواعيد بسهولة. اكتشف عطل سيارتك الآن واختر الكراج المناسب.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {res.workshops.map((w) => (
          <WorkshopCard key={w.place_id} workshop={w} />
        ))}
      </div>

      {/* internal links — same specialty in other VALID areas (SEO + navigation) */}
      {otherAreas.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">{res.label} في مناطق أخرى</h2>
          <div className="flex flex-wrap gap-2">
            {otherAreas.map((a) => (
              <Link
                key={a}
                href={`/كراج/${specialty}/${a}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {res.label} {a}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
