import type { Metadata } from "next";
import Link from "next/link";
import { Car } from "lucide-react";
import { getMakeCounts } from "@/lib/makes";
import { JsonLd } from "@/components/JsonLd";

const SITE = "https://degself.com";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "تصفّح كراجات السيارات حسب الماركة في الكويت | دق سلف",
  description:
    "اعثر على كراجات ومراكز صيانة متخصصة حسب ماركة سيارتك في الكويت — تويوتا، لكزس، نيسان، مرسيدس، بي إم دبليو، هيونداي وغيرها.",
  keywords: ["كراج حسب الماركة", "صيانة سيارات الكويت", "متخصص تويوتا", "متخصص مرسيدس", "كراجات الكويت"],
  alternates: { canonical: "/ماركة" },
  openGraph: {
    title: "تصفّح كراجات السيارات حسب الماركة في الكويت | دق سلف",
    description: "اعثر على كراجات ومراكز صيانة متخصصة حسب ماركة سيارتك في الكويت.",
    url: `${SITE}/ماركة`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "تصفّح كراجات السيارات حسب الماركة في الكويت | دق سلف",
    description: "اعثر على كراجات ومراكز صيانة متخصصة حسب ماركة سيارتك في الكويت.",
    images: ["/og-image.jpg"],
  },
};

export default async function MakesIndexPage() {
  const makes = await getMakeCounts();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "تصفّح حسب الماركة", item: `${SITE}/ماركة` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <JsonLd data={breadcrumbLd} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">تصفّح حسب ماركة السيارة</h1>
        <p className="text-muted-foreground">
          اختر ماركة سيارتك لتجد الكراجات والمراكز المتخصصة في صيانتها بالكويت.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {makes.map((m) => (
          <Link
            key={m.slug}
            href={`/ماركة/${m.slug}`}
            className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-4 transition hover:border-primary"
          >
            <span className="flex items-center gap-2 font-bold transition group-hover:text-primary">
              <Car size={18} className="shrink-0 text-primary" aria-hidden />
              {m.label}
            </span>
            <span className="text-sm text-muted-foreground">{m.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
