import type { ReactNode } from "react";
import Choose, { meta as chooseMeta } from "./kayf-takhtar-karaj-mawthoq";
import Tires, { meta as tiresMeta } from "./asaar-altawayer-alkuwait-2026";
import Lights, { meta as lightsMeta } from "./lumbat-tahdheer-altabloon";
import Oil, { meta as oilMeta } from "./mata-taghyer-zayt-alsayyara";
import Body, { meta as bodyMeta } from "./alfarq-bayn-alsabgh-walhaya";

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  readingTime: string;
  category: string;
};

export type Article = ArticleMeta & { content: ReactNode };

// Ordered newest-first for the blog index.
export const articles: Article[] = [
  { ...chooseMeta, content: <Choose /> },
  { ...tiresMeta, content: <Tires /> },
  { ...lightsMeta, content: <Lights /> },
  { ...oilMeta, content: <Oil /> },
  { ...bodyMeta, content: <Body /> },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export const articleSlugs = articles.map((a) => a.slug);
