import { JsonLd } from "@/components/JsonLd";

// ─────────────────────────────────────────────────────────────────────────────
// BreadcrumbJsonLd — schema.org BreadcrumbList
// المرجع: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
//
// الاستخدام:
//   <BreadcrumbJsonLd items={[
//     { name: "الرئيسية", url: "https://degself.com/" },
//     { name: "البحث",   url: "https://degself.com/search" },
//     { name: "ميكانيكا", url: "https://degself.com/كراج/ميكانيكا" },
//   ]} />
// ─────────────────────────────────────────────────────────────────────────────

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
