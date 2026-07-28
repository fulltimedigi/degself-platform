import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { getLandingCombos, LANDING_SPECIALTIES } from "@/lib/landing";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const revalidate = 86400; // daily
export const dynamicParams = false; // only known specialties with valid area pages

function findSpecialty(slug: string) {
  return LANDING_SPECIALTIES.find((s) => s.slug === slug);
}

export async function generateStaticParams() {
  const combos = await getLandingCombos();
  const slugs = [...new Set(combos.map((c) => c.specialty))];
  return slugs.map((specialty) => ({ specialty }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ specialty: string }>;
}): Promise<Metadata> {
  const { specialty: rs } = await params;
  const slug = decodeURIComponent(rs); // Next 16 passes params percent-encoded
  const sp = findSpecialty(slug);
  if (!sp) return { title: "غير موجود — دق سلف" };

  const title = `كراجات ${sp.label} في الكويت | دق سلف`;
  const description = `دليل كراجات ${sp.label} في الكويت — تصفّح حسب المنطقة واعثر على العنوان والهاتف والمواعيد.`;
  return {
    title,
    description,
    alternates: { canonical: `/كراج/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/كراج/${slug}`,
      type: "website",
      locale: "ar_KW",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg?v=2"],
    },
  };
}

export default async function SpecialtyIndexPage({
  params,
}: {
  params: Promise<{ specialty: string }>;
}) {
  const { specialty: rs } = await params;
  const slug = decodeURIComponent(rs);
  const sp = findSpecialty(slug);
  if (!sp) notFound();

  const combos = await getLandingCombos();
  const areas = combos.filter((c) => c.specialty === slug).map((c) => c.area);
  if (areas.length === 0) notFound();

  const pageUrl = `${SITE}/كراج/${slug}`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `كراجات ${sp.label} في الكويت`,
    description: `دليل كراجات ${sp.label} في الكويت — تصفّح حسب المنطقة.`,
    url: pageUrl,
    inLanguage: "ar",
    isPartOf: { "@id": `${SITE}/#website` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: `كراجات ${sp.label}`, item: pageUrl },
    ],
  };

  // The area sub-pages this index links to — exposed as a structured list so
  // search engines can discover every specialty×area landing page from here.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `كراجات ${sp.label} حسب المنطقة`,
    itemListElement: areas.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${sp.label} في ${a}`,
      url: `${SITE}/كراج/${slug}/${a}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <JsonLd data={collectionLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <h1 className="text-2xl font-extrabold">كراجات {sp.label} في الكويت</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        اختر منطقتك لتصفّح أفضل كراجات ومراكز {sp.label} القريبة منك بالكويت — مع
        العنوان والهاتف والمواعيد.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">تصفّح حسب المنطقة</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <Link
              key={a}
              href={`/كراج/${slug}/${a}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-semibold transition hover:border-primary hover:text-primary"
            >
              <MapPin size={18} className="shrink-0 text-primary" aria-hidden />
              {sp.label} في {a}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
          ← بحث متقدّم في كل الكراجات
        </Link>
      </div>
    </div>
  );
}
