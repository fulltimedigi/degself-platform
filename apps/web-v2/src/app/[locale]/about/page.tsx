import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ShieldCheck,
  Bot,
  Map as MapIcon,
  Search,
  Siren,
  Languages,
  CheckCircle2,
  MapPin,
  Wrench,
  Phone,
  MessageCircle,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WA_URL,
} from "@/lib/constants";

const SITE = "https://degself.com";

// icons for the differentiators, in the same order as the translated array
const DIFF_ICONS = [ShieldCheck, Bot, MapIcon, Search, Siren, Languages];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const url = locale === DEFAULT_LOCALE ? "/about" : `/${locale}/about`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE}${url}`,
      type: "website",
      siteName: "دق سلف",
      images: ["/og-image.jpg?v=2"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twTitle"),
      description: t("twDescription"),
      images: ["/og-image.jpg?v=2"],
    },
  };
}

type Stat = { value: string; label: string };
type TitleBody = { title: string; body: string };
type Contact = { label: string; email: string };
type Phase = { period: string; items: string[] };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const bold = { b: (chunks: ReactNode) => <strong className="text-foreground">{chunks}</strong> };

  const stats = t.raw("stats") as Stat[];
  const whyList = t.raw("whyList") as string[];
  const methodology = t.raw("methodology") as TitleBody[];
  const differentiators = t.raw("differentiators") as TitleBody[];
  const contributors = t.raw("contributors") as string[];
  const transparency = t.raw("transparency") as string[];
  const roadmap = t.raw("roadmap") as Phase[];
  const contacts = t.raw("contacts") as Contact[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "دق سلف",
        alternateName: "Deg Self",
        url: SITE,
        logo: `${SITE}/brand/logo-arabic-badge.png?v=2`,
        description: t("orgDescription"),
        areaServed: { "@type": "Country", name: "الكويت" },
        founder: { "@type": "Person", name: t("founderName") },
        sameAs: ["https://x.com/degself", "https://www.instagram.com/degselfkw"],
      },
      {
        "@type": "AboutPage",
        "@id": `${SITE}/about#aboutpage`,
        url: `${SITE}/about`,
        name: t("breadcrumbSelf"),
        isPartOf: { "@id": `${SITE}/#website` },
        mainEntity: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t("breadcrumbHome"), item: SITE },
          { "@type": "ListItem", position: 2, name: t("breadcrumbSelf"), item: `${SITE}/about` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: t("breadcrumbHome"), url: "https://degself.com/" },
          { name: t("breadcrumbSelf"), url: "https://degself.com/about" },
        ]}
      />
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("h1")}</h1>
        <p className="text-xl font-bold text-primary">{t("tagline")}</p>
        <p className="leading-loose text-foreground/85">{t.rich("heroBody", bold)}</p>
      </header>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-4 py-5 text-center"
          >
            <span className="text-2xl font-extrabold text-primary">{s.value}</span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-12">
        {/* Why */}
        <Section title={t("whyHeading")}>
          <p className="leading-loose text-foreground/85">{t("whyP1")}</p>
          <p className="leading-loose text-foreground/85">{t("whyP2")}</p>
          <ul className="list-disc space-y-2 pe-6 leading-loose text-foreground/85 marker:text-primary">
            {whyList.map((_, i) => (
              <li key={i}>{t.rich(`whyList.${i}`, bold)}</li>
            ))}
          </ul>
        </Section>

        {/* Methodology */}
        <Section title={t("methodHeading")}>
          <p className="leading-loose text-foreground/85">{t("methodIntro")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {methodology.map((m, idx) => (
              <div
                key={m.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <h3 className="font-bold">{m.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
          <p className="leading-loose text-foreground/85">{t.rich("methodOutro", bold)}</p>
        </Section>

        {/* Differentiators */}
        <Section title={t("diffHeading")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {differentiators.map((d, idx) => {
              const Icon = DIFF_ICONS[idx] ?? ShieldCheck;
              return (
                <div
                  key={d.title}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
                >
                  <Icon size={24} className="text-primary" aria-hidden />
                  <h3 className="font-bold">{d.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Team */}
        <Section title={t("teamHeading")}>
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wrench size={22} aria-hidden />
              </span>
              <div>
                <p className="font-bold">{t("founderName")}</p>
                <p className="text-sm text-muted-foreground">{t("founderRole")}</p>
              </div>
            </div>
            <p className="leading-relaxed text-foreground/85">{t("founderBio")}</p>
            <div className="border-t border-border pt-4">
              <p className="font-bold">{t("contributorsTitle")}</p>
              <ul className="mt-2 list-disc space-y-1 pe-6 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                {contributors.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Transparency */}
        <Section title={t("transparencyHeading")}>
          <ul className="flex flex-col gap-3">
            {transparency.map((item) => (
              <li key={item} className="flex items-start gap-2 leading-loose text-foreground/85">
                <CheckCircle2 size={20} className="mt-1 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Roadmap */}
        <Section title={t("roadmapHeading")}>
          <div className="flex flex-col gap-4">
            {roadmap.map((phase) => (
              <div key={phase.period} className="rounded-xl border border-border bg-card p-5">
                <p className="font-bold text-primary">{phase.period}</p>
                <ul className="mt-2 list-disc space-y-1 pe-6 leading-relaxed text-foreground/85 marker:text-primary">
                  {phase.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title={t("contactHeading")}>
          <div className="flex flex-wrap gap-3">
            <a
              href={BUSINESS_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90"
            >
              <MessageCircle size={18} aria-hidden />
              {t("whatsappLabel")} — {BUSINESS_PHONE_DISPLAY}
            </a>
            <a
              href={`tel:${BUSINESS_PHONE_TEL}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-bold text-foreground hover:bg-muted"
            >
              <Phone size={18} className="text-primary" aria-hidden />
              {t("callLabel")} — {BUSINESS_PHONE_DISPLAY}
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {contacts.map((c) => (
              <div key={c.email} className="rounded-xl border border-border bg-card p-5">
                <p className="font-bold">{c.label}</p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  {c.email}
                </a>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={18} className="text-primary" aria-hidden />
            {t("madeIn")}
          </p>
        </Section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 border-t border-border pt-8">
          <Link
            href="/search"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            {t("ctaSearch")}
          </Link>
          <Link
            href="/emergency"
            className="rounded-xl border border-border px-6 py-3 font-bold text-foreground hover:bg-muted"
          >
            {t("ctaEmergency")}
          </Link>
        </div>
      </div>
    </div>
  );
}
