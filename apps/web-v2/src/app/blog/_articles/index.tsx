import type { ReactNode } from "react";
import Article1, { meta as Article1Meta } from "./asaar-taghyeer-zayt-sayara-2026";
import Article2, { meta as Article2Meta } from "./afdal-karajat-toyota-kuwait";
import Article3, { meta as Article3Meta } from "./taslih-mukayyif-sayara-kuwait";
import Article4, { meta as Article4Meta } from "./asaar-taghyeer-zayt-qair-kuwait";
import Article5, { meta as Article5Meta } from "./alamaat-sayartak-tahtaj-karaj-foran";
import Article6, { meta as Article6Meta } from "./afdal-karajat-shuwaikh-sinaiya";
import Article7, { meta as Article7Meta } from "./siyanat-sayara-sayf-kuwait";
import Article8, { meta as Article8Meta } from "./fahs-kombuter-sayara-kuwait";
import Article9, { meta as Article9Meta } from "./asaar-taghyeer-faramil-kuwait";
import Article10, { meta as Article10Meta } from "./dalil-siyana-dawriya-sayara";
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
  { ...Article1Meta, content: <Article1 /> },
  { ...Article2Meta, content: <Article2 /> },
  { ...Article3Meta, content: <Article3 /> },
  { ...Article4Meta, content: <Article4 /> },
  { ...Article5Meta, content: <Article5 /> },
  { ...Article6Meta, content: <Article6 /> },
  { ...Article7Meta, content: <Article7 /> },
  { ...Article8Meta, content: <Article8 /> },
  { ...Article9Meta, content: <Article9 /> },
  { ...Article10Meta, content: <Article10 /> },
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
