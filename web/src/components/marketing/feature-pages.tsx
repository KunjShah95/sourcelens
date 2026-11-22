import Link from "next/link";
import {
  BarChart3,
  Bot,
  Check,
  CircleCheck,
  Code2,
  Database,
  Download,
  Eye,
  FileText,
  Globe2,
  Layers,
  Lock,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { CheckList, CopyButton, Faq, PricingCards } from "./marketing-ui";
import { MarketingPage, ProseSection } from "./marketing-page";

/* ---------------------------------------------------------------- features */

const CHANNELS = [
  ["Organic search", "Google, Bing, DuckDuckGo, Brave, Yahoo and other search referrers, with query text when exposed.", "var(--channel-search)"],
  ["AI assistants", "ChatGPT, Perplexity, Claude, Gemini, Copilot and 11 more — never folded into direct.", "var(--channel-ai)"],
  ["Direct", "Typed URLs, bookmarks and unlabeled entrances with a clean first-party signal.", "var(--channel-direct)"],
  ["Social", "Reddit, X, LinkedIn, Hacker News, Instagram, YouTube and more.", "var(--channel-social)"],
  ["Referral", "Any external domain that is not a known search, social or AI source.", "var(--channel-referral)"],
  ["Paid", "Google Ads, Facebook Ads and tagged paid campaigns via UTM or referrer.", "var(--channel-paid)"],
  ["Email", "Newsletter and mail-client referrals, including UTM-tagged campaign links.", "var(--channel-email)"],
  ["Internal", "Kept separate for debugging and excluded from source share by default.", "var(--channel-internal)"],
];

const ENGINES = [
  "ChatGPT", "Perplexity", "Claude", "Gemini", "Microsoft Copilot", "Grok", "You.com",
  "DeepSeek", "Mistral", "Llama", "Phind", "Perplexity Pages", "Bing Chat", "Character.AI",
  "Poe", "AI Search",
];

const AUDIT_GROUPS = [
  {
    id: "seo",
    label: "SEO",
    color: "var(--accent)",
    icon: Search,
    desc: "Crawlability and on-page fundamentals that decide whether a search engine can index and rank you.",
    checks: ["Title present and within length", "Meta description present", "Single H1 with clear intent", "Canonical URL declared", "XML sitemap referenced", "Semantic heading hierarchy"],
  },
  {
    id: "aeo",
    label: "AEO",
    color: "var(--channel-ai)",
    icon: Sparkles,
    desc: "Answer-engine optimization: can an assistant extract a direct, self-contained answer from your page?",
    checks: ["Direct answer in first paragraph", "Question-shaped headings", "Short extractable paragraphs", "Structured data present", "Citable statistics and sources", "Entity clarity and consistency"],
  },
  {
    id: "geo",
    label: "GEO",
    color: "var(--channel-referral)",
    icon: Globe2,
    desc: "Generative-engine optimization: does a model have the signals, permissions and artifacts to cite you?",
    checks: ["llms.txt available", "FAQ / HowTo schema", "Fresh, dated content", "Author and organization entities", "Robots.txt allows AI crawlers", "Stable, quotable facts"],
  },
  {
    id: "tech",
    label: "Technical",
    color: "var(--channel-email)",
    icon: Server,
    desc: "Delivery, performance and security signals that affect every crawler, human or machine.",
    checks: ["HTTPS and HSTS", "Response time budget", "Compressed HTML", "Mobile viewport declared", "Security headers", "No blocking meta robots tag"],
  },
];

export function FeaturesPage() {
  return (
    <MarketingPage
      eyebrow="Features"
      title="Know where traffic comes from — and why."
      description="SourceLens combines attribution, AI visibility, crawler intelligence and answer-engine audits in one self-hosted product. No plugins, no data resale, no guesswork."
    >
      <ProseSection eyebrow="Attribution" title="Eight channels. One honest source of truth.">
        <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
          <div className="grid grid-cols-[160px_1fr] border-b border-border bg-panel-2 px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-faint uppercase sm:grid-cols-[190px_1fr]">
            <span>Channel</span><span>How it is detected</span>
          </div>
          {CHANNELS.map(([name, desc, color]) => (
            <div key={name} className="grid grid-cols-[160px_1fr] gap-4 border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)] px-4 py-3.5 text-[12.5px] last:border-0 sm:grid-cols-[190px_1fr]">
              <span className="inline-flex items-center gap-2 font-medium">
                <i className="size-1.5 shrink-0 rounded-full" style={{ background: color }} /> {name}
              </span>
              <span className="leading-relaxed text-muted">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-[12.5px] leading-relaxed text-muted">
          Classification happens in the collector before the event is stored. Session attribution then propagates the entry channel to every subsequent pageview, so a visitor who arrives from Google and browses five pages still counts as five organic pageviews — not one organic and four internal.
        </p>
      </ProseSection>

      <ProseSection eyebrow="AI visibility" title="Sixteen answer engines, tracked individually.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ENGINES.map((engine) => (
            <div key={engine} className="flex items-center gap-2.5 rounded-lg border border-border bg-panel px-3.5 py-3 text-[12.5px]">
              <Sparkles className="size-3.5 shrink-0 text-ch-ai" />
              <span>{engine}</span>
              <Check className="ml-auto size-3.5 text-accent" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[14px] border border-border bg-panel p-5">
            <div className="flex items-center gap-2 text-accent"><Bot className="size-4" /><h3 className="text-[14px] font-semibold text-ink">Human referrals</h3></div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">A click from an assistant answer with a referrer you can attribute. Counted as an AI visit, with the engine and landing page recorded.</p>
          </div>
          <div className="rounded-[14px] border border-border bg-panel p-5">
            <div className="flex items-center gap-2 text-ch-ai"><Eye className="size-4" /><h3 className="text-[14px] font-semibold text-ink">Crawler hits</h3></div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">Synthetic traffic from GPTBot, ClaudeBot, PerplexityBot and peers. Tracked separately so crawl volume never inflates your human numbers.</p>
          </div>
        </div>
      </ProseSection>

      <ProseSection eyebrow="Audits" title="SEO, AEO and GEO scored in one pass.">
        <div className="grid gap-4 md:grid-cols-2">
          {AUDIT_GROUPS.map((group) => (
            <div key={group.id} id={group.id} className="mk-section flex flex-col rounded-[14px] border border-border bg-panel p-5">
              <div className="flex items-center gap-2" style={{ color: group.color }}>
                <group.icon className="size-4" />
                <h3 className="text-[14px] font-semibold text-ink">{group.label}</h3>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{group.desc}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.checks.map((check) => (
                  <div key={check} className="flex items-start gap-2 text-[11.5px] text-muted">
                    <CircleCheck className="mt-px size-3.5 shrink-0" style={{ color: group.color }} /> {check}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ProseSection>

      <ProseSection eyebrow="GEO artifacts" title="Generate the file models look for first." id="install">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-[20px] font-semibold tracking-[-0.025em]">llms.txt, built from your real traffic</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              SourceLens takes your highest-performing pages from the last 30 days and produces a canonical markdown map — title, description and link — that retrieval pipelines can parse in one request. Publish it at your domain root and you give every model a cheap, authoritative index.
            </p>
            <div className="mt-5">
              <CheckList
                accent
                items={[
                  "Prioritises pages that actually earn visits",
                  "Plain markdown — no proprietary format",
                  "Regenerate whenever your content changes",
                  "Served from your own domain",
                ]}
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-border bg-bg-soft">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[10.5px] text-faint">
              <span>/llms.txt</span>
              <CopyButton text={`# ${siteConfig.name}\n\n> Traffic-source intelligence you own.`} />
            </div>
            <pre className="overflow-x-auto px-4 py-5 font-mono text-[11.5px] leading-[1.9] text-muted">
              <code>
                <span className="text-ch-social"># Your Company</span>
                {"\n\n"}&gt; What you do, in one plain sentence.
                {"\n\n"}<span className="text-ch-email">## Key facts</span>
                {"\n"}- Founded in 2024
                {"\n"}- 12,000 users across 40 countries
                {"\n\n"}<span className="text-ch-email">## Documentation</span>
                {"\n"}- [Getting started](https://example.com/docs)
                {"\n"}- [API reference](https://example.com/api)
              </code>
            </pre>
          </div>
        </div>
      </ProseSection>

      <ProseSection eyebrow="Privacy" title="Instrumentation that respects the visitor.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, title: "No cookies", body: "A daily salted hash counts repeat visits. Nothing is written to the visitor's cookie jar." },
            { icon: ShieldCheck, title: "No IP storage", body: "IP addresses are used for coarse geolocation at request time and never persisted." },
            { icon: Eye, title: "Do Not Track", body: "The tracker checks the DNT signal and an explicit opt-out before loading." },
            { icon: Database, title: "Your database", body: "Every event lands in your Supabase project. There is no SourceLens cloud store by default." },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border border-border bg-panel p-5">
              <item.icon className="size-4 text-accent" />
              <h3 className="mt-3 text-[13px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </ProseSection>
    </MarketingPage>
  );
}

/* ------------------------------------------------------------------ pricing */

const BILLING_FAQ = [
  { q: "Is the self-hosted version really free?", a: "Yes. SourceLens is MIT licensed. There are no seats, event caps or feature flags held back for the paid tier — the Cloud plan is only a convenience for people who don't want to operate the infrastructure." },
  { q: "What does the Cloud plan include?", a: "A managed Supabase database, the Node API, the Next.js dashboard, automatic backups and updates, a shared CDN for the tracker script, and email support. You keep full export rights at any time." },
  { q: "Can I move from Cloud to self-hosted later?", a: "Yes. Export your events as CSV from Settings, run the included schema.sql in your own Supabase project, and point the API at it. There is no proprietary data format." },
  { q: "Do you offer invoices or annual billing?", a: "Yes for Cloud and Enterprise. Annual billing is two months free. Contact us through the About page and we'll set it up." },
  { q: "What counts as an event?", a: "Any pageview, custom event or crawler hit stored by the collector. There are no artificial limits on the self-hosted or Cloud plans." },
];

export function PricingPage() {
  return (
    <MarketingPage
      eyebrow="Pricing"
      title="Own the product, or let us run it."
      description="Free and MIT licensed to self-host. Optional managed hosting when you want the signal without the servers. No event caps, no feature gates, no credit card to start."
    >
      <section className="py-18">
        <div className="mx-auto max-w-360 px-4 sm:px-6"><PricingCards /></div>
      </section>
      <ProseSection eyebrow="Billing" title="Pricing questions">
        <div className="max-w-3xl"><Faq items={BILLING_FAQ} /></div>
      </ProseSection>
      <ProseSection eyebrow="Self-hosting" title="What you need">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Server, title: "Node 22+", body: "The API is zero-dependency. A single Dockerfile or the included render.yaml / fly.toml is enough." },
            { icon: Database, title: "Supabase project", body: "One SQL file creates the tables, indexes, RPC and storage bucket. Free tier is plenty to start." },
            { icon: Globe2, title: "A domain", body: "Point the dashboard host at the API with one API_ORIGIN environment variable. HTTPS recommended." },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border border-border bg-panel p-5">
              <item.icon className="size-4 text-accent" />
              <h3 className="mt-3 text-[13px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </ProseSection>
    </MarketingPage>
  );
}

/* -------------------------------------------------------------------- about */

export function AboutPage() {
  return (
    <MarketingPage
      eyebrow="About"
      title="Analytics should tell you where you came from. All of it."
      description="SourceLens started as a frustration: every analytics tool could count a visit, but none could answer the interesting question — which assistant, which query, which sentence made someone show up."
    >
      <ProseSection eyebrow="Why" title="The discovery surface fragmented. Analytics didn't.">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: Waypoints, title: "More origins", body: "Search is no longer one blue link. A single question can surface in Google, ChatGPT, Perplexity, an AI overview and a Reddit thread — all in the same minute." },
            { icon: Bot, title: "Fewer signals", body: "Privacy changes and intelligent referrer trimming mean most AI clicks arrive as direct or nothing at all. The most interesting traffic became the least visible." },
            { icon: FileText, title: "New artifacts", body: "Being cited is partly a content problem and partly a machine-readability problem. llms.txt, schema and citable facts are now part of the growth stack." },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border border-border bg-panel p-5">
              <item.icon className="size-4 text-accent" />
              <h3 className="mt-3 text-[14px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </ProseSection>

      <ProseSection eyebrow="Principles" title="How we build">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Own your data", "Your events live in your Supabase project. No telemetry, no resale, no silent retention."],
            ["Privacy is a feature", "No cookies, no IP storage, Do Not Track respected. Measurement should not require surveillance."],
            ["Plain over clever", "Aggregation runs in readable JavaScript so both Supabase and SQLite share one query surface."],
            ["Open by default", "MIT licensed, one-line installs, and no feature held back for a paid tier."],
          ].map(([title, body]) => (
            <div key={title} className="flex gap-3 rounded-[14px] border border-border bg-panel p-5">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
              <div><h3 className="text-[13.5px] font-semibold">{title}</h3><p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{body}</p></div>
            </div>
          ))}
        </div>
      </ProseSection>

      <ProseSection eyebrow="Stack" title="Boring technology, carefully put together">
        <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
          {[
            ["API + collector", "Node 22, zero runtime dependencies, node:sqlite for local mode"],
            ["Database + auth + storage", "Supabase Postgres, Supabase Auth, Supabase Storage"],
            ["Dashboard", "Next.js 16 App Router, React 19, TypeScript, Tailwind v4"],
            ["Charts", "Hand-built SVG — no chart library, no layout shift"],
            ["Deployment", "Dockerfile, render.yaml, fly.toml, works on Vercel for the frontend"],
          ].map(([label, value], i) => (
            <div key={label} className={`grid gap-4 px-4 py-3.5 text-[12.5px] sm:grid-cols-[220px_1fr] ${i ? "border-t border-border" : ""}`}>
              <span className="font-medium text-ink">{label}</span>
              <span className="text-muted">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[12.5px] font-semibold text-accent-ink">Get started free <Check className="size-3.5" /></Link>
          <Link href="/features" className="inline-flex h-10 items-center rounded-md border border-border-2 bg-panel px-4 text-[12.5px] font-medium">Explore features</Link>
        </div>
      </ProseSection>
    </MarketingPage>
  );
}

/* ---------------------------------------------------------------- changelog */

const RELEASES = [
  {
    version: "1.4.0",
    date: "2026-11-18",
    title: "AI crawler intelligence",
    body: "Added per-bot crawler hits, most-crawled pages and a crawl-to-referral funnel. The SEO audit now checks robots.txt access for GPTBot, ClaudeBot and PerplexityBot.",
    tag: "Feature",
  },
  {
    version: "1.3.0",
    date: "2026-11-04",
    title: "Next.js dashboard",
    body: "Rebuilt the frontend on Next.js 16, React 19 and TypeScript with a typed API client, token-driven light/dark themes and a command palette. The old vanilla frontend remains available at the API host.",
    tag: "Frontend",
  },
  {
    version: "1.2.0",
    date: "2026-10-22",
    title: "Session-level attribution",
    body: "Every pageview now inherits the entry channel of its session. Internal navigation no longer dominates source breakdowns, producing a much more honest picture of real origins.",
    tag: "Fix",
  },
  {
    version: "1.1.0",
    date: "2026-10-09",
    title: "SEO / AEO / GEO audits",
    body: "Added 34 weighted checks across four groups, a JSON report download and an llms.txt generator built from the trailing 30 days of top pages.",
    tag: "Feature",
  },
  {
    version: "1.0.0",
    date: "2026-09-28",
    title: "First public release",
    body: "Cookieless collection, sixteen AI engine classifiers, Supabase and SQLite adapters, CSV export, live visitor badge and deploy configs for Render, Railway and Fly.io.",
    tag: "Release",
  },
];

export function ChangelogPage() {
  return (
    <MarketingPage
      eyebrow="Changelog"
      title="What shipped, and when."
      description="A short, honest log of changes. Breaking changes and attribution fixes are always called out explicitly."
    >
      <section className="py-18">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative flex flex-col gap-6 border-l border-border pl-8">
            {RELEASES.map((release) => (
              <article key={release.version} className="relative">
                <span className="absolute -left-10.5 top-1.5 size-4.5 rounded-full border-4 border-bg bg-accent" />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[12px] font-semibold text-accent">v{release.version}</span>
                  <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[9.5px] text-muted">{release.tag}</span>
                  <time className="ml-auto font-mono text-[10.5px] text-faint">{release.date}</time>
                </div>
                <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em]">{release.title}</h2>
                <p className="mt-2 text-[13px] leading-[1.75] text-muted">{release.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}

/* ------------------------------------------------------------------ privacy */

export function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Privacy policy"
      description="The short version: we don't collect your visitors' personal data, and your analytics data stays in your own database."
    >
      <ProseSection eyebrow="Summary" title="What this means in practice">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Lock, title: "No cookies", body: "The tracker sets no cookies. A session id is kept in sessionStorage for the length of one visit." },
            { icon: ShieldCheck, title: "No IP addresses", body: "IPs are used transiently for coarse geolocation at request time and are never written to storage." },
            { icon: Database, title: "Your database", body: "When self-hosted, all events live in your Supabase project under your control." },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border border-border bg-panel p-5">
              <item.icon className="size-4 text-accent" />
              <h3 className="mt-3 text-[13.5px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </ProseSection>
      <ProseSection eyebrow="Details" title="Data we process">
        <div className="max-w-3xl flex flex-col gap-5 text-[13px] leading-[1.8] text-muted">
          <p><b className="text-ink">Event data.</b> Page path, page title, referrer, UTM parameters, coarse device and browser information, viewport size, language, country derived from request headers or timezone, engagement time, scroll depth and interaction type. A daily salted hash is used to count repeat visitors.</p>
          <p><b className="text-ink">Account data.</b> If Supabase Auth is enabled, your email address and account metadata are stored by Supabase, not by SourceLens. Passwords are handled entirely by Supabase Auth; we never see them.</p>
          <p><b className="text-ink">Crawler data.</b> User agent strings of automated crawlers are recorded to produce bot and page statistics. No personal data is inferred from them.</p>
          <p><b className="text-ink">Retention.</b> There is no automatic deletion of events in the self-hosted product. You control retention and can purge data with the maintenance endpoint or directly in Supabase.</p>
          <p><b className="text-ink">Processors.</b> Self-hosted deployments use only the infrastructure you choose. The optional Cloud tier uses Supabase for database, auth and storage, and a hosting provider for the API and dashboard.</p>
          <p><b className="text-ink">Your choices.</b> Visitors can opt out with a global flag or via Do Not Track. Site owners can delete a site and all of its events at any time from Settings.</p>
        </div>
      </ProseSection>
      <ProseSection eyebrow="Contact" title="Questions">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">For privacy questions, open a public issue in the project repository so the answer benefits everyone. Do not post personal data in issues.</p>
      </ProseSection>
    </MarketingPage>
  );
}

/* -------------------------------------------------------------------- terms */

export function TermsPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Terms of use"
      description="Plain-language terms for using the SourceLens software and any optional hosted service."
    >
      <ProseSection eyebrow="1" title="License">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">SourceLens is released under the MIT License. You may use, copy, modify, merge, publish, distribute and sell copies of the software, provided the copyright notice and license text are included. The software is provided “as is”, without warranty of any kind.</p>
      </ProseSection>
      <ProseSection eyebrow="2" title="Acceptable use">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">Do not use the software or hosted service to violate applicable law, infringe others' rights, or send unsolicited tracking to sites you do not own. You are responsible for complying with privacy and cookie laws in your jurisdiction and for providing any required notices to your visitors.</p>
      </ProseSection>
      <ProseSection eyebrow="3" title="Hosted service">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">If you use the optional Cloud tier, you agree to pay the fees shown at signup. Fees are billed in advance and are non-refundable except where required by law. We may change pricing with 30 days' notice. You may cancel at any time and export your data before the end of the billing period.</p>
      </ProseSection>
      <ProseSection eyebrow="4" title="Availability">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">The self-hosted software has no uptime commitment — it runs on infrastructure you control. The Cloud tier targets 99.9% monthly availability, excluding scheduled maintenance and events outside our reasonable control.</p>
      </ProseSection>
      <ProseSection eyebrow="5" title="Changes">
        <p className="max-w-3xl text-[13px] leading-[1.8] text-muted">We may update these terms as the product evolves. Material changes will be reflected on this page with a new date. Continued use after a change constitutes acceptance.</p>
      </ProseSection>
    </MarketingPage>
  );
}
