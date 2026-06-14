import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, Calendar } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { articles } from "./_articles";
import { formatArabicDate } from "@/lib/utils";

const SITE = "https://degself.com";

export const metadata: Metadata = {
  title: "المدونة | دق سلف — نصائح ودلائل صيانة السيارات في الكويت",
  description:
    "مقالات ودلائل عملية عن صيانة السيارات في الكويت: اختيار الكراج، أسعار التواير، لمبات التحذير، تغيير الزيت، والبودي والصبغ.",
  keywords: [
    "مدونة سيارات الكويت",
    "نصائح صيانة سيارات",
    "صيانة السيارة الكويت",
    "دلائل السيارات",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "المدونة | دق سلف",
    description: "نصائح ودلائل عملية عن صيانة السيارات في الكويت.",
    url: `${SITE}/blog`,
    type: "website",
    locale: "ar_KW",
    siteName: "دق سلف",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "المدونة | دق سلف",
    description: "نصائح ودلائل عملية عن صيانة السيارات في الكويت.",
    images: ["/og-image.jpg"],
  },
};

export default function BlogIndexPage() {
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE}/blog#blog`,
    name: "مدونة دق سلف",
    description: "نصائح ودلائل عملية عن صيانة السيارات في الكويت.",
    url: `${SITE}/blog`,
    publisher: { "@id": `${SITE}/#organization` },
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      url: `${SITE}/blog/${a.slug}`,
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      author: { "@type": "Organization", name: "دق سلف" },
    })),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <JsonLd data={blogLd} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">المدونة</h1>
        <p className="text-muted-foreground">
          نصائح ودلائل عملية لصيانة سيارتك واختيار الكراج المناسب في الكويت.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/blog/${a.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary"
          >
            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/15 to-muted">
              <BookOpen size={40} className="text-primary/70" aria-hidden />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {a.category}
              </span>
              <h2 className="text-lg font-bold leading-snug transition group-hover:text-primary">
                {a.title}
              </h2>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {a.description}
              </p>
              <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={14} aria-hidden />
                  {a.readingTime}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} aria-hidden />
                  <time dateTime={a.datePublished}>{formatArabicDate(a.datePublished)}</time>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
