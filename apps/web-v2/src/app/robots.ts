import type { MetadataRoute } from "next";

// Geo-targeting strategy: we only serve Kuwait. Block crawlers from search
// engines with negligible Kuwait traffic share to reduce out-of-region indexing
// and conserve crawl budget for Google/Bing (the only meaningful sources in KW).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
      // Block search engines with no meaningful Kuwait audience
      { userAgent: "Baiduspider", disallow: "/" }, // China
      { userAgent: "Sogou web spider", disallow: "/" }, // China
      { userAgent: "Yeti", disallow: "/" }, // Naver (Korea)
      // Block AI/SEO scrapers that don't drive Kuwait traffic
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "PerplexityBot", allow: "/" }, // Keep — useful for KW users
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" }, // TikTok
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
      { userAgent: "BLEXBot", disallow: "/" },
    ],
    sitemap: [
      "https://degself.com/sitemap.xml",
    ],
    host: "https://degself.com",
  };
}
