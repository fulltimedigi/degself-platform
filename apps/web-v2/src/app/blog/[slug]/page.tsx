import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Calendar, Search } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { getArticle, articleSlugs } from "../_articles";
import { formatArabicDate } from "@/lib/utils";

const SITE = "https://degself.com";

export function generateStaticParams() {
  return articleSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "المقال غير موجود | دق سلف" };

  const url = `${SITE}/blog/${article.slug}`;
  return {
    title: `${article.title} | دق سلف`,
    description: article.description,
    keywords: [article.category, "سيارات الكويت", "صيانة سيارات", "كراجات الكويت"],
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      type: "article",
      locale: "ar_KW",
      siteName: "دق سلف",
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
      images: ["/brand/logo-arabic.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: ["/brand/logo-arabic.png"],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const url = `${SITE}/blog/${article.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    articleSection: article.category,
    inLanguage: "ar",
    image: `${SITE}/brand/logo-arabic.png`,
    author: { "@type": "Organization", name: "دق سلف", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "دق سلف",
      logo: { "@type": "ImageObject", url: `${SITE}/brand/logo-arabic.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE },
      { "@type": "ListItem", position: 2, name: "المدونة", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />

      {/* breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="مسار التنقّل">
        <Link href="/blog" className="font-semibold text-primary hover:underline">
          المدونة
        </Link>
        <ChevronRight size={16} aria-hidden className="rotate-180" />
        <span className="truncate">{article.category}</span>
      </nav>

      <header className="mt-4 flex flex-col gap-3 border-b border-border pb-6">
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {article.category}
        </span>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          {article.title}
        </h1>
        <p className="leading-relaxed text-muted-foreground">{article.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={14} aria-hidden />
            {article.readingTime}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} aria-hidden />
            <time dateTime={article.datePublished}>
              {formatArabicDate(article.datePublished)}
            </time>
          </span>
        </div>
      </header>

      <div className="mt-8">{article.content}</div>

      {/* CTA */}
      <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">محتاج كراج موثوق في الكويت؟</p>
          <p className="text-sm text-muted-foreground">
            ابحث بالتخصص والمنطقة في أكثر من 1,750 كراج موثّق — مجاناً.
          </p>
        </div>
        <Link
          href="/search"
          className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          <Search size={18} aria-hidden />
          ابدأ البحث
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
          ← رجوع لكل المقالات
        </Link>
      </div>
    </article>
  );
}
