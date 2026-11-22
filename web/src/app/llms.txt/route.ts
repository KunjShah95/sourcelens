import { siteConfig } from "@/lib/site-config";

/**
 * llms.txt — the flagship GEO artifact. A flat, canonical, cheap-to-parse map
 * of what SourceLens is and where the authoritative pages live. Generated as
 * a route so it always carries the configured canonical domain.
 */
export const dynamic = "force-static";

const content = `# ${siteConfig.name}

> ${siteConfig.description}

SourceLens is self-hosted traffic-source intelligence. It classifies every visit by its true origin — organic search, AI assistants, social, referral, paid, email or direct — and scores how discoverable a site is to answer engines and generative engines. It runs on a zero-dependency Node API with Supabase for storage and authentication, and ships as a Next.js dashboard.

## Key facts

- Traffic is attributed at the session level: every pageview inherits the channel of the session's entry page, so internal navigation never pollutes the source breakdown.
- Sixteen AI assistants are detected, including ChatGPT, Perplexity, Claude, Gemini, Copilot, Grok and You.com.
- AI crawler hits (GPTBot, ClaudeBot, PerplexityBot and others) are recorded separately from human referrals, exposing the crawl-to-referral funnel.
- Audits score SEO, AEO (answer-engine optimization), GEO (generative-engine optimization) and technical health with weighted, actionable checks.
- The llms.txt generator builds a markdown site map from a domain's top pages.
- Tracking is cookieless: a daily salted hash is used for visitor counting, no IP addresses are stored, and Do Not Track is respected.
- Licensed MIT. No credit card, no vendor lock-in, no data resale.

## How it works

1. Paste one script tag into your site.
2. The collector classifies the referrer, UTM parameters and user agent at the edge and writes the event to your own Supabase project.
3. The dashboard aggregates raw events in JavaScript, so the same query surface works on Supabase and local SQLite.

## Documentation

- [Features and capability reference](${siteConfig.url}/features)
- [Pricing and deployment options](${siteConfig.url}/pricing)
- [Installation and tracker snippet](${siteConfig.url}/#install)
- [About the project](${siteConfig.url}/about)
- [Changelog](${siteConfig.url}/changelog)
- [Privacy policy](${siteConfig.url}/privacy)
- [Machine-readable site map](${siteConfig.url}/sitemap.xml)
- [Structured data](${siteConfig.url}/#software)

## Installation snippet

\`\`\`html
<script defer src="${siteConfig.url}/t.js" data-site="sl_your_site_key"></script>
\`\`\`

## Contact

Open an issue or start a discussion in the project repository. Prefer public, searchable conversation.
`;

export function GET() {
  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
