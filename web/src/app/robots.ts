import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * Search engines see the marketing site; the authenticated app and API stay
 * out of the index. AI crawlers get an explicit, unconditional Allow — the
 * product is about being discoverable to answer engines, so the site itself
 * should practice what it preaches.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/overview",
    "/sources",
    "/pages",
    "/audience",
    "/ai",
    "/seo",
    "/settings",
    "/api/",
    "/embed",
    "/t.js",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "Amazonbot",
          "CCBot",
          "Bytespider",
          "cohere-ai",
          "YouBot",
        ],
        allow: "/",
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
