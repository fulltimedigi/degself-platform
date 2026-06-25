import type { Metadata } from "next";
import { getCuratedMechanics } from "@/lib/workshops";
import { getEnrichment } from "@/lib/enrichment";
import { WorkshopCard } from "@/components/WorkshopCard";
import { JsonLd } from "@/components/JsonLd";
import type { Workshop } from "@/lib/types";

const SITE = "https://degself.com";
const OTHER_AREA = "كراجات بخدمة متنقّلة أو غير محدّدة المنطقة";

export const revalidate = 3600; // hourly

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "كراجات مختارة في الكويت | دق سلف",
    description:
      "مجموعة كراجات وميكانيكيي سيارات مختارة في الكويت، مرتّبة حسب المنطقة — صيانة عامة وبودي وصبغ وقير وكهرباء سيارات. العنوان والهاتف وتحليل التقييمات لكل كراج.",
    alternates: { canonical: `${SITE}/mukhtarat` },
  };
}

/** Group rows by area in their (already area-sorted) order; null area last. */
function groupByArea(rows: Workshop[]): { area: string; rows: Workshop[] }[] {
  const groups: { area: string; rows: Workshop[] }[] = [];
  const index = new Map<string, number>();
  for (const w of rows) {
    const key = w.area || OTHER_AREA;
    let at = index.get(key);
    if (at == null) {
      at = groups.length;
      index.set(key, at);
      groups.push({ area: key, rows: [] });
    }
    groups[at].rows.push(w);
  }
  // keep named areas first, the catch-all bucket last
  return groups.sort((a, b) => {
    if (a.area === OTHER_AREA) return 1;
    if (b.area === OTHER_AREA) return -1;
    return 0;
  });
}

export default async function MukhtaratPage() {
  const rows = await getCuratedMechanics();
  const groups = groupByArea(rows);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "كراجات مختارة في الكويت",
    numberOfItems: rows.length,
    itemListElement: rows.map((w, i) => ({
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
      { "@type": "ListItem", position: 2, name: "كراجات مختارة", item: `${SITE}/mukhtarat` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">
        كراجات مختارة في الكويت ({rows.length} كراج)
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        مجموعة من الكراجات وميكانيكيي السيارات في الكويت اخترناها وراجعنا بياناتها،
        مرتّبة حسب المنطقة. تشمل الصيانة العامة والبودي والصبغ والقير والكهرباء.
        اختر كراجاً لتطّلع على العنوان والهاتف وتحليل التقييمات.
      </p>

      {groups.map((g) => (
        <section key={g.area} className="mt-10">
          <h2 className="mb-4 text-lg font-bold">
            {g.area}
            <span className="mr-2 text-sm font-normal text-muted-foreground">
              ({g.rows.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.rows.map((w) => (
              <WorkshopCard
                key={w.place_id}
                workshop={w}
                enrichment={getEnrichment(w.place_id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
