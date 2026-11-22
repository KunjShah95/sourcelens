"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Bot, Code2, Download, FileText, Search, Sparkles, Target, Zap,
} from "lucide-react";
import { useApp } from "@/app/providers";
import { useLatestAudit, useStats } from "@/lib/hooks";
import { api, getLlmsTxt, runAudit } from "@/lib/api";
import { cn, fmt } from "@/lib/utils";
import {
  AuditCheckRow, Button, Card, CardHead, CodeBlock, Delta, EmptyState,
  Field, ScoreRing, Segmented, Table, Td, Th,
} from "@/components/ui";
import { PageHead } from "./overview";
import type { AuditPayload } from "@/lib/types";

/* ------------------------------------------------------------ audit panel */

function AuditPanel({ title, sub }: { title: string; sub: string }) {
  const { site, toast } = useApp();
  const queryClient = useQueryClient();
  const latest = useLatestAudit();
  const [url, setUrl] = useState(`https://${site?.domain || ""}`);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"issues" | "all" | "pass">("issues");
  const [error, setError] = useState("");

  const shown = audit || latest.data?.audit || null;

  const execute = async () => {
    if (!url) return;
    setBusy(true);
    setError("");
    try {
      const result = await runAudit(url, site?.id);
      setAudit(result);
      await queryClient.invalidateQueries({ queryKey: ["audit"] });
      toast(`Audit complete — SEO ${result.scores.seo}, AEO ${result.scores.aeo}, GEO ${result.scores.geo}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Audit failed";
      setError(message);
      toast(message, "err");
    } finally {
      setBusy(false);
    }
  };

  const checks = shown?.ok
    ? shown.checks.filter((c) => filter === "all" || (filter === "issues" ? c.status !== "pass" : c.status === "pass"))
    : [];

  const failing = shown?.ok ? [...shown.checks].filter((c) => c.status !== "pass").sort((a, b) => b.weight - a.weight) : [];

  const download = () => {
    if (!shown) return;
    const blob = new Blob([JSON.stringify(shown, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `sourcelens-audit-${site?.domain || "report"}.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  return (
    <Card>
      <CardHead title={title} hint={sub} icon={<Target />} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && execute()}
            placeholder="https://example.com"
            className="h-8.5 min-w-60 flex-1 rounded-md border border-border-2 bg-bg-soft px-3 font-mono text-[12px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <Button variant="primary" disabled={busy} onClick={execute}>
            <Zap className={cn("size-3.5", busy && "animate-pulse")} /> {busy ? "Auditing…" : "Run audit"}
          </Button>
          <span className="self-center text-[11.5px] text-faint">~5–15s</span>
        </div>

        {error ? <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,transparent)] bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] p-2.5 text-[12px] text-bad"><AlertTriangle className="mt-0.5 size-3.5" />{error}</div> : null}

        {busy ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-16 rounded-lg" /><div className="skeleton h-32 rounded-lg" />
          </div>
        ) : null}

        {shown && !busy ? (
          shown.ok ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <ScoreRing score={shown.scores.seo} label="SEO" sub="crawlability & on-page" color="var(--accent)" />
                <ScoreRing score={shown.scores.aeo} label="AEO" sub="answer extraction" color="var(--channel-ai)" />
                <ScoreRing score={shown.scores.geo} label="GEO" sub="generative citation" color="var(--channel-referral)" />
                <ScoreRing score={shown.scores.tech} label="Technical" sub="delivery & speed" color="var(--channel-email)" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{shown.url}</span>
                <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{shown.extracted.wordCount} words</span>
                <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{shown.extracted.schemaTypes.length} schema types</span>
                <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{shown.extracted.responseMs}ms</span>
                <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{shown.extracted.llmsTxt ? "llms.txt ✓" : "no llms.txt"}</span>
                <span className="ml-auto">
                  <Segmented
                    size="sm"
                    value={filter}
                    options={[
                      { value: "issues", label: `Issues (${shown.checks.filter((c) => c.status !== "pass").length})` },
                      { value: "all", label: "All" },
                      { value: "pass", label: "Passing" },
                    ]}
                    onChange={setFilter}
                  />
                </span>
              </div>
              {failing.length && filter !== "pass" ? (
                <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_7%,transparent)] p-2.5 text-[12px] text-muted">
                  <Zap className="mt-0.5 size-3.5 shrink-0 text-warn" />
                  <div><b className="text-ink">Fix first:</b> {failing.slice(0, 3).map((c) => c.label).join(" · ")}</div>
                </div>
              ) : null}
              <div className="overflow-hidden rounded-[14px] border border-border bg-panel-2">
                {(["seo", "aeo", "geo", "tech"] as const).map((group) => {
                  const groupChecks = checks.filter((c) => c.group === group);
                  if (!groupChecks.length) return null;
                  const label = { seo: "SEO", aeo: "AEO", geo: "GEO", tech: "Technical" }[group];
                  return (
                    <div key={group}>
                      <div className="px-4 pt-3 pb-1 text-[10.5px] font-medium tracking-[0.09em] text-faint uppercase">{label} · {shown.scores[group]}/100</div>
                      {groupChecks.map((check, i) => <AuditCheckRow key={`${check.id}-${i}`} check={check} />)}
                    </div>
                  );
                })}
                {!checks.length ? <EmptyState title="Nothing here" sub="Switch the filter to see other checks." /> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={download}><Download className="size-3.5" /> Download report</Button>
                <span className="text-[11.5px] text-faint">Audited {fmt.dateTime(shown.fetchedAt)} · {shown.checks.length} checks</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_7%,transparent)] p-3 text-[12px] text-muted">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <div><b className="text-ink">Could not fetch {shown.url}</b><br />{shown.error || "Unknown error"}</div>
            </div>
          )
        ) : null}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------- AI visibility */

export function AIView() {
  const { site, toast } = useApp();
  const { data } = useStats();
  const [llms, setLlms] = useState("");

  if (!data) return <div className="skeleton h-100 rounded-[14px]" />;

  const engines = data.engines || [];
  const bots = data.crawlers?.bots || [];
  const crawled = data.crawlers?.pages || [];
  const crawlTotal = data.crawlers?.total || 0;
  const aiVisits = engines.reduce((a, e) => a + e.pageviews, 0);
  const ratio = aiVisits ? Math.round((crawlTotal / aiVisits) * 10) / 10 : crawlTotal ? "∞" : "0";

  const generate = async () => {
    try {
      setLlms(await getLlmsTxt(site!.id));
      toast("llms.txt generated from your top pages");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not generate llms.txt", "err");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <PageHead title="AI visibility" sub="How language models discover, read and cite you — AEO & GEO" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MiniKpi label="AI referrals" value={fmt.num(aiVisits)} delta={data.overview.delta.aiShare} color="var(--channel-ai)" icon={<Sparkles className="size-3.5" />} />
        <MiniKpi label="Share of traffic" value={fmt.pct(data.overview.aiShare)} color="var(--channel-ai)" icon={<Target className="size-3.5" />} />
        <MiniKpi label="AI crawler hits" value={fmt.num(crawlTotal)} color="var(--accent)" icon={<Bot className="size-3.5" />} />
        <MiniKpi label="Pages crawled" value={fmt.num(crawled.length)} color="var(--channel-referral)" icon={<FileText className="size-3.5" />} />
        <MiniKpi label="Crawl : referral" value={String(ratio)} unit="ratio" color="var(--channel-email)" icon={<Target className="size-3.5" />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Answer engines sending traffic" hint={`${engines.length} engines`} icon={<Sparkles />} />
          {engines.length ? (
            <Table head={<><Th>Engine</Th><Th num>Visits</Th><Th num>Visitors</Th><Th>Top landing page</Th></>}>
              {engines.map((e) => <tr key={e.engine} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]"><Td strong>{e.engine}</Td><Td num>{fmt.num(e.pageviews)}</Td><Td num>{fmt.num(e.visitors)}</Td><Td><span className="font-mono text-[11px] text-faint">{e.topPage}</span></Td></tr>)}
            </Table>
          ) : <EmptyState title="No AI referrals yet" sub="ChatGPT, Perplexity, Claude, Gemini and Copilot are detected automatically." />}
        </Card>
        <Card>
          <CardHead title="Crawler activity" hint={`${fmt.num(crawlTotal)} hits`} icon={<Bot />} />
          {bots.length ? (
            <Table head={<><Th>Bot</Th><Th num>Hits</Th><Th num>Pages</Th><Th num>Last seen</Th></>}>
              {bots.map((b) => <tr key={b.bot} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]"><Td strong>{b.bot}</Td><Td num>{fmt.num(b.hits)}</Td><Td num>{fmt.num(b.pages)}</Td><Td num>{fmt.ago(b.lastSeen)} ago</Td></tr>)}
            </Table>
          ) : <EmptyState title="No AI crawler hits" sub="Add robots.txt rules that allow GPTBot, ClaudeBot and PerplexityBot." />}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHead title="Most crawled pages" hint="what models are reading" icon={<FileText />} />
          {crawled.length ? (
            <Table head={<><Th>Page</Th><Th num>Hits</Th></>}>
              {crawled.map((p) => <tr key={p.path} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]"><Td><span className="font-mono text-[11.5px] text-ink">{p.path}</span></Td><Td num>{fmt.num(p.hits)}</Td></tr>)}
            </Table>
          ) : <EmptyState title="No crawl data yet" />}
        </Card>
        <Card>
          <CardHead title="Crawl → referral funnel" icon={<Target />} />
          <div className="flex flex-col gap-3 p-4">
            {[
              { label: "Crawler hits", value: crawlTotal, color: "var(--accent)", pct: 100 },
              { label: "AI referrals", value: aiVisits, color: "var(--channel-ai)", pct: crawlTotal ? Math.max(2, (aiVisits / crawlTotal) * 100) : 2 },
            ].map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex items-center text-[12.5px]"><span className="text-muted">{row.label}</span><span className="ml-auto font-mono text-[11.5px] text-ink">{fmt.num(row.value)}</span></div>
                <div className="h-0.75 overflow-hidden rounded-full bg-panel-3"><div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} /></div>
              </div>
            ))}
            <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
              <AlertTriangle className="mt-0.5 size-3.75 shrink-0 text-warn" />
              <div>Heavy crawling with few referrals means models read you but do not cite you. Fix the GEO checks below — llms.txt, entity clarity and citable facts move this fastest.</div>
            </div>
          </div>
        </Card>
      </div>

      <AuditPanel title="GEO / AEO site audit" sub="Scan the live page for answer-engine and generative-engine readiness." />

      <Card>
        <CardHead title="llms.txt generator" hint="markdown map for LLM crawlers" icon={<Code2 />} />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
            <Sparkles className="mt-0.5 size-3.75 shrink-0 text-accent" />
            <div>Publish <code className="font-mono text-[11px]">/llms.txt</code> at your domain root. It gives retrieval pipelines a cheap, canonical index of your best pages — the highest-leverage GEO artifact.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={generate}><Code2 className="size-3.5" /> Generate llms.txt</Button>
            <span className="text-[11.5px] text-faint">Built from your 30-day top pages</span>
          </div>
          {llms ? (
            <div className="flex flex-col gap-2">
              <div className="max-h-65 overflow-auto"><CodeBlock text={llms} onCopy={() => { navigator.clipboard.writeText(llms); toast("Copied llms.txt"); }} /></div>
              <a className="inline-flex h-7 w-fit items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-[12px] hover:bg-panel-2" href={`/api/llms-txt?site=${site!.id}`} download="llms.txt"><Download className="size-3.5" /> Download</a>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function MiniKpi({ label, value, delta, unit, color, icon }: { label: string; value: string; delta?: number | null; unit?: string; color: string; icon: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 px-3.5 pt-3 pb-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted"><span style={{ color }}>{icon}</span>{label}</div>
      <div className="flex flex-wrap items-baseline gap-2"><span className="text-[27px] leading-none font-semibold tracking-[-0.035em] tabular">{value}</span>{unit ? <span className="text-[13px] text-faint">{unit}</span> : null}{delta !== undefined ? <Delta value={delta} /> : null}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------- SEO */

export function SEOView() {
  const { site, toast } = useApp();
  const { data } = useStats();
  const [fields, setFields] = useState({ url: `https://${site?.domain || ""}/`, source: "", medium: "", campaign: "", content: "" });
  const [built, setBuilt] = useState("");

  const buildUtm = () => {
    try {
      const url = new URL(fields.url);
      for (const [key, field] of [["utm_source", "source"], ["utm_medium", "medium"], ["utm_campaign", "campaign"], ["utm_content", "content"]] as const) {
        if (fields[field]) url.searchParams.set(key, fields[field]);
      }
      setBuilt(url.toString());
    } catch {
      toast("Enter a valid URL", "err");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <PageHead title="SEO audit" sub="Technical, on-page and answer-engine readiness — scored with the fixes that matter" />
      <AuditPanel title="Run a site audit" sub="Fetches the page exactly as a crawler sees it, then scores SEO, AEO, GEO and technical health." />
      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHead title="Queries driving traffic" hint={`${data?.queries.length || 0} phrases`} icon={<Search />} />
          {data?.queries.length ? (
            <Table head={<><Th>Query</Th><Th>Engine</Th><Th num>Visits</Th><Th>Landing</Th></>}>
              {data.queries.slice(0, 12).map((q) => <tr key={q.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]"><Td strong>{q.key}</Td><Td><span className="text-faint">{q.engine}</span></Td><Td num>{fmt.num(q.pageviews)}</Td><Td><span className="font-mono text-[11px] text-faint">{q.landing}</span></Td></tr>)}
            </Table>
          ) : <EmptyState title="No query data" sub="Search engines only expose the phrase for a share of visits." />}
        </Card>
        <Card>
          <CardHead title="UTM campaign builder" icon={<Target />} />
          <div className="flex flex-col gap-2.5 p-4">
            <Field label="Destination URL">
              <input className="h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 font-mono text-[12px] outline-none focus:border-accent" value={fields.url} onChange={(e) => setFields({ ...fields, url: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Source"><input className="h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 text-[12px] outline-none focus:border-accent" value={fields.source} onChange={(e) => setFields({ ...fields, source: e.target.value })} placeholder="linkedin" /></Field>
              <Field label="Medium"><input className="h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 text-[12px] outline-none focus:border-accent" value={fields.medium} onChange={(e) => setFields({ ...fields, medium: e.target.value })} placeholder="paid_social" /></Field>
              <Field label="Campaign"><input className="h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 text-[12px] outline-none focus:border-accent" value={fields.campaign} onChange={(e) => setFields({ ...fields, campaign: e.target.value })} placeholder="launch-q2" /></Field>
              <Field label="Content"><input className="h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 text-[12px] outline-none focus:border-accent" value={fields.content} onChange={(e) => setFields({ ...fields, content: e.target.value })} placeholder="hero-cta" /></Field>
            </div>
            <Button onClick={buildUtm} className="w-fit"><Zap className="size-3.5" /> Build link</Button>
            {built ? <CodeBlock text={built} onCopy={() => { navigator.clipboard.writeText(built); toast("Link copied"); }} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
