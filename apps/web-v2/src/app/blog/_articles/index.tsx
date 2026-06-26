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
import Article22, { meta as Article22Meta } from "./muqaranat-asaar-karajat-kuwait-2026";
import Article23, { meta as Article23Meta } from "./afdal-karaj-toyota-kuwait-2026";
import Article24, { meta as Article24Meta } from "./afdal-karaj-nissan-kuwait-2026";
import Article25, { meta as Article25Meta } from "./karaj-farwaniya-khaitan-dalil";
import Article26, { meta as Article26Meta } from "./afdal-karaj-lexus-kuwait-2026";
import Article27, { meta as Article27Meta } from "./afdal-karaj-gmc-kuwait-2026";
import Article28, { meta as Article28Meta } from "./afdal-karaj-mercedes-kuwait-2026";
import Article29, { meta as Article29Meta } from "./karaj-amghara-dalil";
import Article30, { meta as Article30Meta } from "./tazleel-sayara-kuwait-2026";
import Article31, { meta as Article31Meta } from "./mizan-tarsees-sayara-kuwait";
import Article32, { meta as Article32Meta } from "./asaar-zayt-mahrek-kuwait-castrol-mobil";
import Article33, { meta as Article33Meta } from "./karaj-jabriya-surra-dalil";
import Article34, { meta as Article34Meta } from "./asaar-taameen-sayara-kuwait-muqarana";
import Article35, { meta as Article35Meta } from "./sat-ha-sayara-kuwait-asaar";
import Article36, { meta as Article36Meta } from "./afdal-karaj-ford-kuwait-2026";
import Article37, { meta as Article37Meta } from "./afdal-karaj-chevrolet-kuwait-2026";
import Article38, { meta as Article38Meta } from "./afdal-karaj-range-rover-kuwait-2026";
import Article39, { meta as Article39Meta } from "./karaj-subhan-sinaiya-dalil";
import Article40, { meta as Article40Meta } from "./karaj-asima-madinat-kuwait-dalil";
import Article41, { meta as Article41Meta } from "./fahs-fanni-tajdeed-daftar-sayara-kuwait";
import Choose, { meta as chooseMeta } from "./kayf-takhtar-karaj-mawthoq";
import Tires, { meta as tiresMeta } from "./asaar-altawayer-alkuwait-2026";
import Lights, { meta as lightsMeta } from "./lumbat-tahdheer-altabloon";
import Oil, { meta as oilMeta } from "./mata-taghyer-zayt-alsayyara";
import Body, { meta as bodyMeta } from "./alfarq-bayn-alsabgh-walhaya";
import ArticleNew1, { meta as ArticleNew1Meta } from "./limaza-sayarati-tukhrij-dukhan";
import ArticleNew2, { meta as ArticleNew2Meta } from "./lumbat-loohat-alqiyadat-dalil-kamil";
import ArticleNew3, { meta as ArticleNew3Meta } from "./taklifat-islah-mukayyif-sayara-kuwait-2026";
import ArticleNew4, { meta as ArticleNew4Meta } from "./alamat-tilf-batariyat-sayara";
import ArticleNew5, { meta as ArticleNew5Meta } from "./aswat-sayara-ghariba";
import ArticleNew6, { meta as ArticleNew6Meta } from "./mata-taghyeer-zayt-naqil-haraka";
import ArticleNew7, { meta as ArticleNew7Meta } from "./farq-bayn-sabgh-walitlmee";
import ArticleNew8, { meta as ArticleNew8Meta } from "./kayf-takhtar-afdal-karaj";
import ArticleNew9, { meta as ArticleNew9Meta } from "./alamat-tilf-fahmat-faramil";
import ArticleNew10, { meta as ArticleNew10Meta } from "./afdal-waqt-taghyeer-itarat-kuwait";
import Overheating, { meta as OverheatingMeta } from "./irtifaa-hararat-muharrik-sayara-kuwait";

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
  { ...OverheatingMeta, content: <Overheating /> },
  { ...ArticleNew1Meta, content: <ArticleNew1 /> },
  { ...ArticleNew2Meta, content: <ArticleNew2 /> },
  { ...ArticleNew3Meta, content: <ArticleNew3 /> },
  { ...ArticleNew4Meta, content: <ArticleNew4 /> },
  { ...ArticleNew5Meta, content: <ArticleNew5 /> },
  { ...ArticleNew6Meta, content: <ArticleNew6 /> },
  { ...ArticleNew7Meta, content: <ArticleNew7 /> },
  { ...ArticleNew8Meta, content: <ArticleNew8 /> },
  { ...ArticleNew9Meta, content: <ArticleNew9 /> },
  { ...ArticleNew10Meta, content: <ArticleNew10 /> },
  { ...Article32Meta, content: <Article32 /> },
  { ...Article33Meta, content: <Article33 /> },
  { ...Article34Meta, content: <Article34 /> },
  { ...Article35Meta, content: <Article35 /> },
  { ...Article36Meta, content: <Article36 /> },
  { ...Article37Meta, content: <Article37 /> },
  { ...Article38Meta, content: <Article38 /> },
  { ...Article39Meta, content: <Article39 /> },
  { ...Article40Meta, content: <Article40 /> },
  { ...Article41Meta, content: <Article41 /> },
  { ...Article27Meta, content: <Article27 /> },
  { ...Article28Meta, content: <Article28 /> },
  { ...Article29Meta, content: <Article29 /> },
  { ...Article30Meta, content: <Article30 /> },
  { ...Article31Meta, content: <Article31 /> },
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
  { ...Article22Meta, content: <Article22 /> },
  { ...Article23Meta, content: <Article23 /> },
  { ...Article24Meta, content: <Article24 /> },
  { ...Article25Meta, content: <Article25 /> },
  { ...Article26Meta, content: <Article26 /> },
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
