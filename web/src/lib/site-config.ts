/**
 * Single source of truth for every public-facing URL, title and description.
 * The SEO files (metadata, robots, sitemap, llms.txt, JSON-LD) all read from
 * this object, so a domain change never leaves stale canonical tags behind.
 */
export const siteConfig = {
  name: "SourceLens",
  domain: "sourcelens.app",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://sourcelens.app").replace(/\/$/, ""),
  title: "SourceLens — Traffic Source Intelligence for SEO, AEO & GEO",
  shortTitle: "SourceLens",
  description:
    "See exactly where every visit comes from — Google, ChatGPT, Perplexity, Reddit or email. Self-hosted, cookieless traffic-source analytics with built-in SEO, AEO and GEO audits.",
  tagline: "Every visit has an origin. See all of them.",
  ogImage: "/opengraph-image",
  locale: "en_US",
  keywords: [
    "traffic source analytics",
    "SEO analytics",
    "AEO audit",
    "GEO audit",
    "answer engine optimization",
    "generative engine optimization",
    "llms.txt generator",
    "AI referral tracking",
    "ChatGPT referral analytics",
    "Perplexity referral tracking",
    "cookieless analytics",
    "self-hosted analytics",
    "Supabase analytics",
    "referrer classification",
    "UTM tracking",
    "crawler analytics",
    "privacy-first analytics",
  ],
  nav: [
    { label: "Product", href: "/#product" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Docs", href: "/#install" },
  ],
  footer: {
    product: [
      { label: "Overview", href: "/#product" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Live demo", href: "/overview" },
    ],
    resources: [
      { label: "Installation", href: "/#install" },
      { label: "SEO audit", href: "/features#seo" },
      { label: "AEO & GEO", href: "/features#aeo" },
      { label: "llms.txt", href: "/llms.txt" },
      { label: "Sitemap", href: "/sitemap.xml" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Get started", href: "/signup" },
      { label: "Sign in", href: "/login" },
    ],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  /** Public pages that should be indexed and appear in the sitemap. */
  publicRoutes: [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/changelog", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ],
};
