import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Code2,
  Database,
  Download,
  Eye,
  FileText,
  Globe2,
  Layers,
  Lock,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { CopyButton, Faq, PricingCards, CheckList } from "./marketing-ui";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const SNIPPET = `<script defer src="${siteConfig.url}/t.js"
  data-site="sl_your_site_key"></script>`;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main>
        <Announcement />
        <Hero />
        <SourceStrip />
        <ProblemSection />
        <FeatureBento />
        <HowItWorks />
        <AiSpotlight />
        <ProofBand />
        <Comparison />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------ announcement */

function Announcement() {
  return (
    <div className="border-b border-border bg-panel-2/60">
      <div className="mx-auto flex max-w-360 items-center justify-center gap-2 px-4 py-2.5 text-center text-[11.5px] text-muted sm:text-[12px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.04em] text-accent-ink uppercase">
          New
        </span>
        <span>AI crawler intelligence is live — see which bots read you before they cite you.</span>
        <Link href="/changelog" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
          Read the changelog <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="mk-section relative overflow-hidden border-b border-border">
      <div className="mk-grid-bg pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_25%,transparent_80%)]" />
      <div className="mk-glow pointer-events-none absolute inset-x-0 -top-40 h-[620px]" />

      <div className="relative mx-auto max-w-360 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-26">
        <div className="mk-reveal mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border-2 bg-panel/80 px-3 py-1.5 text-[11.5px] text-muted shadow-[var(--shadow-1)] backdrop-blur">
          <span className="live-dot size-1.5 rounded-full bg-accent" />
          Traffic-source intelligence for the AI era
          <ChevronRight className="size-3 text-faint" />
        </div>

        <h1 className="mk-reveal mk-d1 mx-auto max-w-4xl text-[42px] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
          Every visit has an origin.
          <br />
          <span className="mk-text-gradient">See all of them.</span>
        </h1>

        <p className="mk-reveal mk-d2 mx-auto mt-6 max-w-2xl text-[15px] leading-[1.7] text-muted sm:text-[17px]">
          Know exactly where your traffic comes from — Google, ChatGPT, Perplexity, Reddit or a newsletter — and turn that signal into growth. Self-hosted, cookieless, built for SEO, AEO and GEO.
        </p>

        <div className="mk-reveal mk-d3 mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[13.5px] font-semibold text-accent-ink shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-[background,transform] hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--ink))] active:translate-y-px"
          >
            Get started free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/overview"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border-2 bg-panel px-5 text-[13.5px] font-medium text-ink transition-colors hover:border-border-2 hover:bg-panel-2"
          >
            <Play className="size-3.5 fill-current" /> View live demo
          </Link>
        </div>

        <div className="mk-reveal mk-d4 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
          {["No credit card", "Self-host in 2 minutes", "Your data stays yours"].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check className="size-3 text-accent stroke-[2.6]" /> {item}
            </span>
          ))}
        </div>

        <div className="mk-reveal mk-d5 relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-x-10 -top-10 bottom-0 rounded-full bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_13%,transparent),transparent_65%)] blur-2xl" />
          <div className="mk-window relative overflow-hidden rounded-[14px] border border-border-2 bg-panel">
            <div className="flex h-9.5 items-center gap-2 border-b border-border bg-panel-2 px-3.5">
              <span className="flex gap-1.5">
                <i className="size-2 rounded-full bg-[#ff5f57]" />
                <i className="size-2 rounded-full bg-[#febc2e]" />
                <i className="size-2 rounded-full bg-[#28c840]" />
              </span>
              <div className="mx-auto flex h-5.5 w-64 items-center justify-center rounded-md border border-border bg-bg-soft font-mono text-[10px] text-faint">
                {siteConfig.domain}/overview
              </div>
              <span className="w-12" />
            </div>
            <img
              src="/dashboard-preview.png"
              alt="SourceLens dashboard showing traffic sources, pageviews and AI assistant referrals"
              className="block w-full object-cover object-top"
            />
          </div>

          <div className="mk-float absolute -right-3 top-24 hidden items-center gap-2.5 rounded-[10px] border border-border-2 bg-panel-3 px-3 py-2.5 text-left shadow-[var(--shadow-2)] sm:flex">
            <span className="grid size-8 place-items-center rounded-md bg-[color-mix(in_srgb,var(--channel-ai)_16%,transparent)] text-ch-ai">
              <Sparkles className="size-4" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-mono text-[16px] font-semibold text-ink">+38.2%</span>
              <span className="text-[10.5px] text-faint">AI referrals / 7d</span>
            </span>
          </div>

          <div className="mk-float-slow absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-[10px] border border-border-2 bg-panel-3 px-3 py-2.5 text-left shadow-[var(--shadow-2)] sm:flex">
            <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-ink">
              <Waypoints className="size-4" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11.5px] font-medium text-ink">ChatGPT → /pricing</span>
              <span className="font-mono text-[10px] text-faint">493 visits this week</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ source strip */

const SOURCES = ["Google", "ChatGPT", "Perplexity", "Claude", "Bing", "Reddit", "LinkedIn", "Gemini", "Newsletter", "GitHub"];

function SourceStrip() {
  return (
    <section className="border-b border-border py-9">
      <p className="mb-6 text-center font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
        One dashboard for every source that matters
      </p>
      <div className="mk-marquee-wrap overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="mk-marquee flex w-max items-center gap-12">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-12">
              {SOURCES.map((source) => (
                <span key={source} className="flex items-center gap-2.5 whitespace-nowrap text-[16px] font-medium tracking-[-0.01em] text-faint/80">
                  <span className="grid size-6 place-items-center rounded-md border border-border bg-panel font-mono text-[10px] text-muted">
                    {source[0]}
                  </span>
                  {source}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- problem cards */

const PROBLEMS = [
  {
    icon: Layers,
    title: "“Internal” is your biggest source",
    body: "Most tools count your own navigation as a new visit from your own domain. The real origins disappear inside a bucket that tells you nothing.",
    fix: "Session-level attribution",
  },
  {
    icon: Bot,
    title: "AI traffic is invisible",
    body: "Referrals from ChatGPT and Perplexity get folded into “direct” or “other”. You cannot grow a channel you cannot see.",
    fix: "16 engines, classified at the edge",
  },
  {
    icon: CircleAlert,
    title: "Audits stop at the page",
    body: "Plenty of tools check your title tag. Almost none tell you whether a language model can extract, quote and cite your answer.",
    fix: "SEO, AEO and GEO, scored together",
  },
];

function ProblemSection() {
  return (
    <section className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="max-w-4xl">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">The problem</span>
          <h2 className="mt-4 text-[28px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[40px]">
            Your analytics know <em className="text-muted not-italic">that</em> people arrived.
            <br />Not <span className="text-accent">why</span>.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            Traffic data gets less useful every year — more surfaces, more assistants, fewer referrers passed through. SourceLens is built around the question legacy analytics never answered well.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem, i) => (
            <div
              key={problem.title}
              className={`mk-reveal mk-d${i + 1} flex flex-col gap-4 rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow-1)]`}
            >
              <span className="grid size-9 place-items-center rounded-md border border-[color-mix(in_srgb,var(--warn)_26%,transparent)] bg-[color-mix(in_srgb,var(--warn)_9%,transparent)] text-warn">
                <problem.icon className="size-4 stroke-[1.8]" />
              </span>
              <h3 className="text-[14.5px] leading-snug font-semibold tracking-[-0.015em]">{problem.title}</h3>
              <p className="flex-1 text-[12.5px] leading-[1.7] text-muted">{problem.body}</p>
              <div className="flex items-center gap-1.5 border-t border-border pt-3 font-mono text-[10.5px] text-accent">
                <Check className="size-3 stroke-[2.6]" /> {problem.fix}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ feature grid */

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  return (
    <div className="mk-bars flex h-14 items-end gap-1.5">
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-[2px]"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.55 + (i / values.length) * 0.45 }}
        />
      ))}
    </div>
  );
}

function FeatureBento() {
  return (
    <section id="product" className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-5xl">
            <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">The product</span>
            <h2 className="mt-4 text-[28px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[40px]">
              Built for the way discovery actually works now.
            </h2>
          </div>
          <Link href="/features" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
            All features <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="mk-card-lift flex flex-col justify-between rounded-[14px] border border-border bg-panel p-6 lg:col-span-2">
            <div>
              <div className="mb-4 flex items-center gap-2 text-accent">
                <Waypoints className="size-4 stroke-[1.8]" />
                <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">01 · Attribution</span>
              </div>
              <h3 className="text-[20px] font-semibold tracking-[-0.025em]">The true origin of every visit</h3>
              <p className="mt-2 max-w-lg text-[13px] leading-[1.7] text-muted">
                Every pageview inherits its session&apos;s entry channel. Referrers, UTMs, landing pages and internal navigation are reconciled into one honest source of truth.
              </p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="flex flex-col gap-3">
                {[
                  { label: "Organic search", value: 38.5, color: "var(--channel-search)" },
                  { label: "Direct", value: 19.7, color: "var(--channel-direct)" },
                  { label: "AI assistants", value: 16.1, color: "var(--channel-ai)" },
                  { label: "Social", value: 10.1, color: "var(--channel-social)" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 text-[12px]">
                    <span className="w-28 shrink-0 text-muted">{row.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-3">
                      <span className="block h-full rounded-full" style={{ width: `${row.value * 2}%`, background: row.color }} />
                    </span>
                    <span className="w-12 text-right font-mono text-[11px] text-ink">{row.value}%</span>
                  </div>
                ))}
              </div>
              <div className="hidden w-36 shrink-0 sm:block">
                <MiniBars values={[32, 48, 41, 63, 55, 72, 68, 84, 79, 96]} color="var(--accent)" />
                <div className="mt-2 text-right font-mono text-[10px] text-faint">last 10 days</div>
              </div>
            </div>
          </div>

          <div className="mk-card-lift flex flex-col rounded-[14px] border border-border bg-panel p-6">
            <div className="mb-4 flex items-center gap-2 text-ch-ai">
              <Sparkles className="size-4 stroke-[1.8]" />
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">02 · AI visibility</span>
            </div>
            <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Know which models send you people</h3>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-muted">
              Sixteen assistants detected from the referrer — and crawler hits tracked separately so you can see the whole funnel.
            </p>
            <div className="mt-auto space-y-2 pt-6">
              {[
                ["ChatGPT", "430", "var(--channel-ai)"],
                ["Perplexity", "284", "var(--channel-search)"],
                ["Claude", "167", "var(--channel-referral)"],
                ["Gemini", "94", "var(--channel-email)"],
              ].map(([name, count, color]) => (
                <div key={name} className="flex items-center gap-2.5 text-[12px]">
                  <i className="size-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-muted">{name}</span>
                  <span className="ml-auto font-mono text-[11px] text-ink">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mk-card-lift rounded-[14px] border border-border bg-panel p-6">
            <div className="mb-4 flex items-center gap-2 text-ch-referral">
              <Search className="size-4 stroke-[1.8]" />
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">03 · Audits</span>
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em]">SEO, AEO & GEO scores</h3>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-muted">34 weighted checks, each with the exact fix.</p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                ["SEO", 92, "var(--accent)"],
                ["AEO", 68, "var(--channel-ai)"],
                ["GEO", 54, "var(--channel-referral)"],
                ["TECH", 96, "var(--channel-email)"],
              ].map(([label, score, color]) => (
                <div key={label as string} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-panel-2 py-2.5">
                  <div
                    className="grid size-9 place-items-center rounded-full font-mono text-[11px] font-semibold"
                    style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color: color as string }}
                  >
                    {score}
                  </div>
                  <span className="font-mono text-[9px] text-faint">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mk-card-lift rounded-[14px] border border-border bg-panel p-6">
            <div className="mb-4 flex items-center gap-2 text-ch-social">
              <Bot className="size-4 stroke-[1.8]" />
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">04 · Crawlers</span>
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em]">See who reads before they cite</h3>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-muted">GPTBot, ClaudeBot, PerplexityBot — hits and pages, per bot.</p>
            <div className="mt-5">
              <MiniBars values={[22, 38, 31, 54, 47, 68, 61, 79, 72, 88]} color="var(--channel-social)" />
            </div>
          </div>

          <div className="mk-card-lift rounded-[14px] border border-border bg-panel p-6">
            <div className="mb-4 flex items-center gap-2 text-ch-email">
              <ShieldCheck className="size-4 stroke-[1.8]" />
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">05 · Privacy</span>
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em]">Cookieless by design</h3>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-muted">Daily salted hashes instead of cookies. No IP storage. Do Not Track respected.</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["No cookies", "No IP", "DNT", "GDPR-friendly"].map((tag) => (
                <span key={tag} className="rounded border border-border bg-panel-2 px-2 py-1 font-mono text-[9.5px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mk-card-lift rounded-[14px] border border-border bg-panel p-6 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-md">
                <div className="mb-4 flex items-center gap-2 text-accent">
                  <Code2 className="size-4 stroke-[1.8]" />
                  <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase">06 · Install</span>
                </div>
                <h3 className="text-[20px] font-semibold tracking-[-0.025em]">One line. Any stack.</h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-muted">
                  Drop the snippet into any site, CMS or framework. SPA route changes, scroll depth, downloads and outbound clicks are tracked automatically.
                </p>
                <Link href="/#install" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
                  Read the install guide <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative overflow-hidden rounded-lg border border-border bg-bg-soft">
                  <div className="mk-scan pointer-events-none absolute inset-y-0 w-1/3" />
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-[10px] text-faint">
                    <span>index.html</span>
                    <CopyButton text={SNIPPET} label="Copy snippet" />
                  </div>
                  <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-[1.8] text-muted">
                    <code>
                      <span className="text-ch-social">&lt;script</span> <span className="text-ch-email">defer</span>{" "}
                      <span className="text-ch-email">src</span>=<span className="text-accent">&quot;{siteConfig.url}/t.js&quot;</span>
                      {"\n"}  <span className="text-ch-email">data-site</span>=<span className="text-accent">&quot;sl_your_site_key&quot;</span>
                      <span className="text-ch-social">&gt;&lt;/script&gt;</span>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- how it works */

const STEPS = [
  {
    n: "01",
    title: "Install the snippet",
    body: "Add one script tag. The collector is tiny, cacheable and works on any site — static, React, WordPress, anywhere.",
    icon: Code2,
  },
  {
    n: "02",
    title: "We classify at the edge",
    body: "Referrer, UTMs, user agent and entry page become a clean channel + source + engine record written to your own database.",
    icon: Database,
  },
  {
    n: "03",
    title: "Watch sources compound",
    body: "Dashboards, deltas, audits and crawler intelligence turn raw events into the next thing to write, fix or promote.",
    icon: TrendingUp,
  },
];

function HowItWorks() {
  return (
    <section id="install" className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="text-center">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">How it works</span>
          <h2 className="mt-4 text-[32px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[44px]">
            From script tag to signal in minutes.
          </h2>
        </div>
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-border-2 to-transparent md:block" />
          {STEPS.map((step, i) => (
            <div key={step.n} className={`mk-reveal mk-d${i + 1} relative flex flex-col items-center text-center`}>
              <div className="relative z-2 grid size-14 place-items-center rounded-[14px] border border-border-2 bg-panel text-accent shadow-[var(--shadow-1)]">
                <step.icon className="size-5 stroke-[1.6]" />
              </div>
              <span className="mt-5 font-mono text-[10.5px] tracking-[0.12em] text-faint">{step.n}</span>
              <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 max-w-72 text-[12.5px] leading-[1.7] text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- AI spotlight */

function AiSpotlight() {
  return (
    <section className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[20px] border border-border-2 bg-panel">
          <div className="pointer-events-none absolute -top-40 -right-32 size-130 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--channel-ai)_18%,transparent),transparent_68%)] blur-3xl" />
          <div className="mk-grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(90deg,#000,transparent_70%)]" />
          <div className="relative p-8 sm:p-12">
            <div className="max-w-6xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--channel-ai)_30%,transparent)] bg-[color-mix(in_srgb,var(--channel-ai)_10%,transparent)] px-3 py-1.5 font-mono text-[10.5px] tracking-[0.08em] text-ch-ai uppercase">
                <Sparkles className="size-3" /> AEO + GEO
              </span>
              <h2 className="mt-5 text-[28px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[36px] lg:text-[38px]">
                The new search is a conversation. Make sure you&apos;re in it.
              </h2>
              <p className="mt-4 max-w-3xl text-[14px] leading-[1.75] text-muted">
                Ranking is no longer the whole game. Models read your pages, extract an answer and decide who to cite. SourceLens scores that entire chain — then gives you the artifact that moves it fastest.
              </p>
            </div>
            <div className="mt-9 grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Eye, title: "Answer extraction", body: "Clear headings, short paragraphs and citable facts." },
                  { icon: FileText, title: "llms.txt generator", body: "A canonical map of your best pages, built from real traffic." },
                  { icon: Bot, title: "Crawler visibility", body: "Which bots visited, which pages they read and how often." },
                  { icon: BarChart3, title: "Crawl → referral funnel", body: "See where being read stops turning into being cited." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-panel-2/70 p-3.5">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-ch-ai stroke-[1.7]" />
                    <div>
                      <div className="text-[12.5px] font-medium">{item.title}</div>
                      <div className="mt-0.5 text-[11.5px] leading-relaxed text-faint">{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[14px] border border-border bg-bg-soft p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint uppercase">Crawl → referral funnel</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-warn">
                    <CircleAlert className="size-3" /> gap detected
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Crawler hits", value: "1,003", pct: 100, color: "var(--accent)" },
                    { label: "AI referrals", value: "430", pct: 43, color: "var(--channel-ai)" },
                    { label: "Cited answers", value: "—", pct: 8, color: "var(--channel-referral)" },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-col gap-1.5">
                      <div className="flex items-center text-[12px]">
                        <span className="text-muted">{row.label}</span>
                        <span className="ml-auto font-mono text-[11.5px] text-ink">{row.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
                        <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-border bg-bg-soft">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="font-mono text-[10.5px] text-faint">/llms.txt</span>
                  <CopyButton text="# SourceLens\n\nSelf-hosted traffic-source intelligence for SEO, AEO and GEO." label="Copy" />
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[11px] leading-[1.9] text-muted">
                  <code>
                    <span className="text-ch-social"># SourceLens</span>
                    {"\n\n"}&gt; Self-hosted traffic-source intelligence.
                    {"\n\n"}<span className="text-ch-email">## Key facts</span>
                    {"\n"}- 16 AI engines detected
                    {"\n"}- Cookieless, privacy-first
                    {"\n"}- MIT licensed
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- proof band */

const PROOF = [
  ["16", "AI engines classified"],
  ["34", "weighted audit checks"],
  ["0", "cookies stored"],
  ["100%", "data you own"],
];

function ProofBand() {
  return (
    <section className="border-b border-border bg-panel-2/50 py-14">
      <div className="mx-auto grid max-w-360 grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4">
        {PROOF.map(([big, label]) => (
          <div key={label} className="text-center">
            <div className="text-[34px] leading-none font-semibold tracking-[-0.04em] text-accent sm:text-[40px]">{big}</div>
            <div className="mt-2 text-[11.5px] tracking-[0.02em] text-faint">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- comparison */

const COMPARISON = [
  ["True source attribution", true, false, false],
  ["AI assistant referrals", true, false, false],
  ["SEO / AEO / GEO audits", true, false, false],
  ["AI crawler visibility", true, false, false],
  ["llms.txt generator", true, false, false],
  ["Cookieless by design", true, false, true],
  ["Self-hosted on your DB", true, false, true],
  ["Full data ownership", true, false, true],
];

function Comparison() {
  return (
    <section className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="mb-10 max-w-4xl">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">Why switch</span>
          <h2 className="mt-4 text-[28px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[38px]">
            Built for the questions the others don&apos;t ask.
          </h2>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-panel-2">
                  <th className="px-5 py-3.5 font-medium text-muted">Capability</th>
                  <th className="px-5 py-3.5 font-semibold text-accent">SourceLens</th>
                  <th className="px-5 py-3.5 font-medium text-muted">Google Analytics</th>
                  <th className="px-5 py-3.5 font-medium text-muted">Plausible</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, ...values]) => (
                  <tr key={label as string} className="border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)] last:border-0">
                    <td className="px-5 py-3 text-ink">{label}</td>
                    {values.map((value, i) => (
                      <td key={i} className="px-5 py-3">
                        {value ? (
                          <Check className={`size-4 ${i === 0 ? "text-accent stroke-[2.6]" : "text-ok"}`} />
                        ) : (
                          <X className="size-3.5 text-faint" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-faint">Comparison reflects default, out-of-the-box capability. Both alternatives can be extended with custom tooling.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ pricing */

function PricingSection() {
  return (
    <section id="pricing" className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">Pricing</span>
          <h2 className="mt-4 text-[32px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[44px]">Own it, or let us run it.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-muted">
            The whole product is free and open source to self-host. If you&apos;d rather not operate it, we&apos;ll do that for you.
          </p>
        </div>
        <PricingCards />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- FAQ */

export const FAQS = [
  {
    q: "How is this different from Google Analytics?",
    a: "Google Analytics reports sessions and channels, but attributes internal navigation to your own domain and folds most AI referrals into direct or other. SourceLens attributes every pageview to the session's true entry source, detects 16 AI assistants explicitly, and adds SEO, AEO and GEO audits that GA does not do at all.",
  },
  {
    q: "Does it use cookies?",
    a: "No. Visitors are counted with a salted daily hash, so repeat visits are visible for one day and never beyond. No cookies are set, no IP addresses are stored, and Do Not Track is respected. A single session id lives in sessionStorage for attribution within one visit.",
  },
  {
    q: "Which AI assistants do you detect?",
    a: "Sixteen engines including ChatGPT, Perplexity, Claude, Gemini, Microsoft Copilot, Grok, You.com, DeepSeek, Mistral and others. Detection uses the referrer plus engine-specific patterns, and unknown engines still get grouped under AI rather than disappearing into direct.",
  },
  {
    q: "Do I need a Supabase account?",
    a: "Not to try it. With no Supabase environment variables the API runs on local SQLite with auth disabled, so you can explore the whole dashboard immediately. For production, set SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY — the schema is one SQL file and the app switches over automatically.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes, that's the default. The API is a zero-dependency Node 22 server with a Dockerfile, render.yaml and fly.toml included. The Next.js dashboard deploys anywhere Next.js runs. Both talk to your own Supabase project, so your event data never leaves it.",
  },
  {
    q: "Does it work with single-page apps?",
    a: "Yes. The tracker patches pushState and replaceState, so client-side route changes are recorded as new pageviews with the correct path and title. It also captures engagement time, scroll depth, outbound clicks and downloads automatically.",
  },
  {
    q: "What exactly is AEO and GEO?",
    a: "AEO (answer-engine optimization) is the practice of making your content easy for an assistant to extract and quote as a direct answer. GEO (generative-engine optimization) is about being selected as a source in a generated response. SourceLens scores both with concrete checks — schema markup, entity clarity, citable facts, llms.txt, freshness and crawler access — and tells you how to fix each failure.",
  },
  {
    q: "Is the tracking snippet heavy?",
    a: "It's a few kilobytes of vanilla JavaScript with no dependencies, served from your own domain. It batches events and uses sendBeacon where available, so it doesn't block navigation or hurt Core Web Vitals.",
  },
];

function FaqSection() {
  return (
    <section className="mk-section border-b border-border py-24 sm:py-30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">FAQ</span>
          <h2 className="mt-4 text-[32px] leading-[1.15] font-semibold tracking-[-0.035em] sm:text-[44px]">Questions, answered.</h2>
        </div>
        <Faq items={FAQS} />
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- final CTA */

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-30">
      <div className="mk-glow pointer-events-none absolute inset-x-0 -top-40 h-[600px]" />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="mx-auto grid size-12 place-items-center rounded-[12px] bg-accent text-accent-ink shadow-[0_12px_40px_-14px_color-mix(in_srgb,var(--accent)_70%,transparent)]">
          <Zap className="size-5 fill-current" />
        </div>
        <h2 className="mt-7 text-[28px] leading-[1.12] font-semibold tracking-[-0.04em] sm:text-[46px]">
          Stop guessing where your traffic came from.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-muted">
          One script tag. One dashboard. Every origin — including the ones the other tools can&apos;t see.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[13.5px] font-semibold text-accent-ink transition-transform hover:translate-y-px"
          >
            Get started free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/overview"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border-2 bg-panel px-5 text-[13.5px] font-medium transition-colors hover:bg-panel-2"
          >
            <Play className="size-3.5 fill-current" /> View live demo
          </Link>
        </div>
        <p className="mt-5 font-mono text-[11px] text-faint">MIT licensed · No credit card · Self-host in 2 minutes</p>
      </div>
    </section>
  );
}
