import { articles } from "@/app/blog/_articles";

const SITE = "https://degself.com";

export async function GET() {
  const items = articles
    .map(
      (a) => `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE}/blog/${a.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${a.slug}</guid>
      <pubDate>${new Date(a.datePublished).toUTCString()}</pubDate>
      <description><![CDATA[${a.description}]]></description>
      <category>${a.category}</category>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>دق سلف - المدونة</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>دليلك لكراجات وميكانيكي وخدمات السيارات في الكويت</description>
    <language>ar-KW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
