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
import Article11, { meta as Article11Meta } from "./asaar-tasleeh-qair-kuwait-2026";
import Article12, { meta as Article12Meta } from "./siyanat-mukayyif-sayara-shamil";
import Article13, { meta as Article13Meta } from "./asaar-batariyat-sayara-kuwait";
import Article14, { meta as Article14Meta } from "./dalil-shiraa-sayara-mustamal-kuwait";
import Article15, { meta as Article15Meta } from "./dalil-taameen-sayara-kuwait-2026";
import Article16, { meta as Article16Meta } from "./karaj-mutanaqil-kuwait-24-saa";
import Article17, { meta as Article17Meta } from "./bansher-mutanaqil-kuwait-dalil";
import Article18, { meta as Article18Meta } from "./karaj-shuwaikh-sinaiya-shamil";
import Article19, { meta as Article19Meta } from "./karaj-jahra-dalil-shamil";
import Article20, { meta as Article20Meta } from "./karaj-fahaheel-dalil";
import Article21, { meta as Article21Meta } from "./karaj-salmiya-hawalli-dalil";
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
  { ...Article11Meta, content: <Article11 /> },
  { ...Article12Meta, content: <Article12 /> },
  { ...Article13Meta, content: <Article13 /> },
  { ...Article14Meta, content: <Article14 /> },
  { ...Article15Meta, content: <Article15 /> },
  { ...Article16Meta, content: <Article16 /> },
  { ...Article17Meta, content: <Article17 /> },
  { ...Article18Meta, content: <Article18 /> },
  { ...Article19Meta, content: <Article19 /> },
  { ...Article20Meta, content: <Article20 /> },
  { ...Article21Meta, content: <Article21 /> },
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
