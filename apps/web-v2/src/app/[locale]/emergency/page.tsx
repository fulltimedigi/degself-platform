import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { Truck, Wrench } from "lucide-react";
import { searchWorkshops } from "@/lib/workshops";
import { WorkshopCard } from "@/components/WorkshopCard";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "emergency" });
  const url =
    locale === DEFAULT_LOCALE
      ? "https://degself.com/emergency"
      : `https://degself.com/${locale}/emergency`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };
}

const TYPES = [
  { value: "tow", key: "tow", Icon: Truck },
  { value: "mobile", key: "mobile", Icon: Wrench },
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "emergency" });
  const sp = await searchParams;
  const type = sp.type === "tow" || sp.type === "mobile" ? sp.type : null;
  const shown = type ? TYPES.filter((item) => item.value === type) : TYPES;

  const sections = await Promise.all(
    shown.map(async (item) => {
      const { workshops } = await searchWorkshops({ service_mode: item.value, limit: 12 });
      return { ...item, workshops };
    })
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: "https://degself.com/" },
          { name: t("breadcrumbSelf"), url: "https://degself.com/emergency" },
        ]}
      />
      <h1 className="text-2xl font-extrabold">{t("h1")}</h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      {/* type toggle */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/emergency" className={pill(!type)}>
          {t("all")}
        </Link>
        {TYPES.map((item) => (
          <Link key={item.value} href={`/emergency?type=${item.value}`} className={pill(type === item.value)}>
            {t(item.key)}
          </Link>
        ))}
      </div>

      {sections.map(({ value, key, Icon, workshops }) => (
        <section key={value} className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Icon size={20} className="text-primary" aria-hidden />
              {t(key)}
            </h2>
            <Link
              href={`/search?service_mode=${value}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          {workshops.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workshops.map((w) => (
                <WorkshopCard key={w.place_id} workshop={w} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noResults")}</p>
          )}
        </section>
      ))}
    </div>
  );
}
