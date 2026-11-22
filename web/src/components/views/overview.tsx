"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot, Clock, Download, Eye, FileText, Layers, RefreshCw,
  Search, Sparkles, TrendingUp, Users, Waypoints,
} from "lucide-react";
import { useApp, RANGES, type RangeKey } from "@/app/providers";
import { useRealtime, useStats } from "@/lib/hooks";
import { exportCsv } from "@/lib/api";
import { channelColor, cn, fmt } from "@/lib/utils";
import { AreaChart, Donut, Heatmap, Sparkline } from "@/components/charts";
import { Button, Card, CardHead, Delta, EmptyState, Segmented, Td, Th, Table } from "@/components/ui";
import type { SeriesPoint } from "@/lib/types";

type Metric = "pageviews" | "visitors";

export function OverviewView() {
  const { site, range, setRange, toast } = useApp();
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useStats();
  const { data: live } = useRealtime();
  const [metric, setMetric] = useState<Metric>("pageviews");
  const [refreshing, setRefreshing] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-14" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-[14px]" />)}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.72fr_1fr]">
          <div className="skeleton h-84 rounded-[14px]" />
          <div className="skeleton h-84 rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="grid place-items-center p-12 text-center">
        <EmptyState title="Could not load analytics" sub={error instanceof Error ? error.message : "Unknown error"} icon={<RefreshCw className="size-5" />} />
        <Button onClick={() => refetch()} className="mt-3"><RefreshCw className="size-3.5" /> Retry</Button>
      </Card>
    );
  }

  const o = data.overview;
  const series = data.series || [];
  const total = series.reduce((sum, p) => sum + p.pageviews, 0);
  const kpis = [
    { label: "Unique visitors", value: fmt.num(o.visitors), delta: o.delta.visitors, spark: series.map((s) => s.visitors), icon: Users },
    { label: "Pageviews", value: fmt.num(o.pageviews), delta: o.delta.pageviews, spark: series.map((s) => s.pageviews), icon: Eye },
    { label: "Sessions", value: fmt.num(o.sessions), delta: o.delta.sessions, spark: series.map((s) => s.sessions), icon: Layers },
    { label: "Bounce rate", value: fmt.pct(o.bounceRate), delta: o.delta.bounceRate, invert: true, spark: series.map((s) => Math.max(0, s.pageviews - s.sessions)), icon: TrendingUp },
    { label: "Avg. engagement", value: fmt.dur(o.avgDuration), delta: o.delta.avgDuration, spark: series.map((s) => s.pageviews), icon: Clock },
  ];

  const doRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["stats"] });
    setRefreshing(false);
    toast("Data refreshed");
  };

  return (
    <div className="flex flex-col gap-3">
      <PageHead
        title="Overview"
        sub={<>Traffic to <b>{site?.domain}</b> · {data.range.label}</>}
        actions={
          <>
            <div className="hidden sm:block">
              <Segmented value={range} options={RANGES.map((r) => ({ value: r, label: r }))} onChange={(v: RangeKey) => setRange(v)} />
            </div>
            <Button disabled={refreshing} onClick={doRefresh}><RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Refresh</Button>
            <Button onClick={() => exportCsv(site!.id, range).catch((e) => toast(e.message, "err"))}><Download className="size-3.5" /> Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="flex flex-col gap-2 overflow-hidden px-3.5 pt-3 pb-2.5">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted"><kpi.icon className="size-3.5 text-faint stroke-[1.8]" />{kpi.label}</div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[27px] leading-none font-semibold tracking-[-0.035em] tabular">{kpi.value}</span>
              <Delta value={kpi.delta} invert={kpi.invert} />
            </div>
            <div className="mx-[-4px] mb-[-2px] h-7.5"><Sparkline values={kpi.spark} /></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.72fr_1fr]">
        <Card>
          <CardHead
            title="Traffic over time"
            action={
              <Segmented
                size="sm"
                value={metric}
                options={[{ value: "pageviews", label: "Pageviews" }, { value: "visitors", label: "Visitors" }]}
                onChange={setMetric}
              />
            }
          />
          <div className="px-2.5 pt-2 pb-1">
            <AreaChart
              series={series}
              metric={metric}
              secondary={metric === "pageviews" ? "visitors" : "pageviews"}
              color={metric === "visitors" ? "var(--channel-ai)" : "var(--accent)"}
            />
          </div>
          <div className="flex flex-wrap gap-3.5 px-4 pb-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-1.75 rounded-[2px]" style={{ background: metric === "visitors" ? "var(--channel-ai)" : "var(--accent)" }} />{metric === "pageviews" ? "Pageviews" : "Visitors"}</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-1.75 rounded-[2px] bg-faint" />{metric === "pageviews" ? "Visitors" : "Pageviews"}</span>
            <span className="ml-auto text-faint">{fmt.exact(total)} total · {data.range.label.toLowerCase()}</span>
          </div>
        </Card>

        <Card>
          <CardHead title="Traffic sources" hint={`${data.channels.length} channels`} icon={<Waypoints />} />
          <div className="px-4 pt-3 pb-4">
            {data.channels.length ? (
              <>
                <div className="flex items-center gap-4">
                  <Donut
                    segments={data.channels.map((c) => ({ value: c.pageviews, color: channelColor(c.channel, c.color) }))}
                    total={data.channels.reduce((a, c) => a + c.pageviews, 0)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.75">
                    {data.channels.slice(0, 6).map((c) => (
                      <div key={c.channel} className="flex items-center gap-1.75 text-[12px] text-muted">
                        <i className="size-1.75 shrink-0 rounded-[2px]" style={{ background: channelColor(c.channel, c.color) }} />
                        <span className="truncate">{c.label}</span>
                        <span className="ml-auto tabular font-mono text-[11px] text-ink">{fmt.num(c.pageviews)}</span>
                        <span className="w-8 text-right font-mono text-[10.5px] text-faint">{fmt.pct(c.share)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2.25 rounded-md border border-border bg-panel-2 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
                  <Sparkles className="mt-0.5 size-3.75 shrink-0 text-accent" />
                  <div><b className="text-ink">{fmt.pct(o.aiShare)} from AI assistants.</b> {data.engines[0] ? <>{data.engines[0].engine} leads with {fmt.num(data.engines[0].pageviews)} visits.</> : null} Track and grow this in AI visibility.</div>
                </div>
              </>
            ) : <EmptyState title="No traffic yet" sub="Install the tracker to start collecting visits." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHead title="Top pages" hint={`${data.pages.length} pages`} icon={<FileText />} />
          {data.pages.length ? (
            <Table head={<><Th>Page</Th><Th num>Views</Th><Th num>Bounce</Th></>}>
              {data.pages.slice(0, 7).map((p) => (
                <tr key={p.path} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: channelColor(p.topChannel, p.color) }} />
                      <div className="min-w-0">
                        <div className="max-w-45 truncate font-mono text-[11.5px] text-ink">{p.path}</div>
                        <div className="max-w-45 truncate text-[10.5px] text-faint">{p.title}</div>
                      </div>
                    </div>
                  </Td>
                  <Td num>{fmt.num(p.pageviews)}</Td>
                  <Td num>{fmt.pct(p.bounceRate)}</Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No pageviews yet" />}
        </Card>

        <Card>
          <CardHead title={<span className="inline-flex items-center gap-2"><span className="live-dot size-1.5 rounded-full bg-ok" />Live now</span>} hint={`last ${live?.realtime.windowMinutes || 5} min`} />
          <div className="flex h-8.5 items-end gap-0.5 px-4 pb-2.5">
            {(live?.realtime.perMinute || []).map((v, i) => (
              <i key={i} className={cn("min-h-0.5 flex-1 rounded-[1.5px]", v ? "bg-accent" : "bg-[color-mix(in_srgb,var(--accent)_32%,transparent)]")} style={{ height: `${Math.max(2, Math.min(34, v * 9))}px` }} />
            ))}
          </div>
          <div className="flex flex-col">
            {(live?.realtime.feed || []).slice(0, 8).map((f, i) => (
              <div key={i} className="flex items-center gap-2.25 border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-4 py-1.75 text-[12px] last:border-0">
                <span className="w-5 shrink-0 font-mono text-[9px] text-faint">{f.country || "··"}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{f.path}</span>
                <span className="shrink-0 text-[10.5px] text-faint">{f.source}</span>
                <span className="w-7 shrink-0 text-right font-mono text-[9.5px] text-faint">{fmt.ago(f.ts)}</span>
              </div>
            ))}
            {!(live?.realtime.feed || []).length ? <EmptyState title="No active visitors" icon={<Eye className="size-5" />} /> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Top referrers" hint="external domains" icon={<Search />} />
          <div className="p-4">
            {data.referrers.length ? (
              <div className="flex flex-col gap-2.25">
                {data.referrers.slice(0, 7).map((r) => (
                  <div key={r.key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[12.5px]">
                      <span className="truncate font-medium text-ink">{r.key}</span>
                      <span className="rounded border border-border px-1 font-mono text-[9.5px] text-faint">{r.channel}</span>
                      <span className="ml-auto tabular font-mono text-[11.5px] text-muted">{fmt.num(r.pageviews)}</span>
                    </div>
                    <div className="h-0.75 overflow-hidden rounded-full bg-panel-3">
                      <div className="h-full rounded-full bg-ch-referral" style={{ width: `${Math.max(2, (r.pageviews / (data.referrers[0]?.pageviews || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No external referrers" />}
          </div>
        </Card>

        <Card>
          <CardHead title="Traffic by hour" hint="local time" icon={<Clock />} />
          <div className="p-4"><Heatmap grid={data.heatmap} /></div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="AI assistant referrals" hint={`${fmt.pct(o.aiShare)} of traffic`} icon={<Sparkles />} />
          {data.engines.length ? (
            <Table head={<><Th>Engine</Th><Th num>Visits</Th><Th num>Share</Th><Th>Top landing page</Th></>}>
              {data.engines.slice(0, 6).map((e) => (
                <tr key={e.engine} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{e.engine}</Td>
                  <Td num>{fmt.num(e.pageviews)}</Td>
                  <Td num>{fmt.pct(e.share)}</Td>
                  <Td><span className="font-mono text-[11px] text-faint">{e.topPage}</span></Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No AI referrals yet" sub="These appear when ChatGPT, Perplexity or Claude send visitors." />}
        </Card>

        <Card>
          <CardHead title="AI crawlers" hint={`${fmt.num(data.crawlers.total)} hits`} icon={<Bot />} />
          {data.crawlers.bots.length ? (
            <Table head={<><Th>Bot</Th><Th num>Hits</Th><Th num>Pages</Th><Th num>Last seen</Th></>}>
              {data.crawlers.bots.slice(0, 6).map((b) => (
                <tr key={b.bot} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{b.bot}</Td>
                  <Td num>{fmt.num(b.hits)}</Td>
                  <Td num>{fmt.num(b.pages)}</Td>
                  <Td num>{fmt.ago(b.lastSeen)} ago</Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No AI crawler hits" sub="Being crawled is the first step to being cited." />}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- page head */

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[21px] leading-tight font-semibold tracking-[-0.025em]">{title}</h1>
        {sub ? <p className="mt-1 text-[13px] text-muted">{sub}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
