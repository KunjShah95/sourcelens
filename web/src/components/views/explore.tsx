"use client";

import { useState } from "react";
import { Globe2, Search, Sparkles, Target, Users, Waypoints } from "lucide-react";
import { useApp } from "@/app/providers";
import { useStats } from "@/lib/hooks";
import { channelColor, cn, fmt } from "@/lib/utils";
import { Sparkline } from "@/components/charts";
import { BarList, Card, CardHead, ChannelBadge, EmptyState, Table, Td, Th } from "@/components/ui";
import { PageHead } from "./overview";
import type { PageRow } from "@/lib/types";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

/* --------------------------------------------------------------- sources */

export function SourcesView() {
  const { data } = useStats();
  if (!data) return <Shell><div className="skeleton h-100 rounded-[14px]" /></Shell>;

  const total = data.sources.reduce((a, s) => a + s.pageviews, 0) || 1;
  return (
    <Shell>
      <PageHead title="Sources" sub={<>Where every visit came from · {data.range.label}</>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.channels.slice(0, 4).map((c) => (
          <Card key={c.channel} className="flex flex-col gap-2 overflow-hidden px-3.5 pt-3 pb-2.5">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <span className="size-1.75 rounded-full" style={{ background: channelColor(c.channel, c.color) }} />
              {c.label}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[27px] leading-none font-semibold tracking-[-0.035em] tabular">{fmt.num(c.pageviews)}</span>
              <span className="text-[13px] text-faint">{fmt.pct(c.share)}</span>
            </div>
            <div className="mx-[-4px] mb-[-2px] h-7.5">
              <Sparkline values={(data.series as unknown as Record<string, number>[]).map((s) => s[c.channel] || 0)} color={channelColor(c.channel, c.color)} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead title="All sources" hint="classified server-side" icon={<Waypoints />} />
        {data.sources.length ? (
          <Table head={<><Th>Source</Th><Th>Channel</Th><Th num>Visitors</Th><Th num>Pageviews</Th><Th num>Sessions</Th><Th num>Share</Th></>}>
            {data.sources.slice(0, 30).map((s) => (
              <tr key={s.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                <Td strong>{s.key}</Td>
                <Td><ChannelBadge channel={s.channel} /></Td>
                <Td num>{fmt.num(s.visitors)}</Td>
                <Td num>{fmt.num(s.pageviews)}</Td>
                <Td num>{fmt.num(s.sessions)}</Td>
                <Td num>
                  <div className="flex items-center justify-end gap-2">
                    <span>{fmt.pct(s.share)}</span>
                    <span className="h-0.75 w-11 overflow-hidden rounded-full bg-panel-3">
                      <i className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (s.pageviews / total) * 200)}%` }} />
                    </span>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No source data yet" />}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="AI assistants" hint="answer-engine referrals" icon={<Sparkles />} />
          {data.engines.length ? (
            <Table head={<><Th>Engine</Th><Th num>Visits</Th><Th num>Visitors</Th><Th>Top page</Th></>}>
              {data.engines.map((e) => (
                <tr key={e.engine} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{e.engine}</Td><Td num>{fmt.num(e.pageviews)}</Td><Td num>{fmt.num(e.visitors)}</Td>
                  <Td><span className="font-mono text-[11px] text-faint">{e.topPage}</span></Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No AI referrals yet" />}
        </Card>
        <Card>
          <CardHead title="Referrer domains" hint={`${data.referrers.length} domains`} icon={<Globe2 />} />
          {data.referrers.length ? (
            <Table head={<><Th>Domain</Th><Th>Channel</Th><Th num>Visits</Th><Th num>Share</Th></>}>
              {data.referrers.slice(0, 12).map((r) => (
                <tr key={r.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{r.key}</Td><Td><ChannelBadge channel={r.channel} /></Td>
                  <Td num>{fmt.num(r.pageviews)}</Td><Td num>{fmt.pct(r.share)}</Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No external referrers" />}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Search queries" hint="when the referrer exposes them" icon={<Search />} />
          {data.queries.length ? (
            <Table head={<><Th>Query</Th><Th>Engine</Th><Th num>Visits</Th><Th>Landing</Th></>}>
              {data.queries.slice(0, 12).map((q) => (
                <tr key={q.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{q.key}</Td><Td><span className="text-faint">{q.engine}</span></Td>
                  <Td num>{fmt.num(q.pageviews)}</Td>
                  <Td><span className="font-mono text-[11px] text-faint">{q.landing}</span></Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No search queries captured" sub="Google and Bing usually expose the phrase in the referrer." />}
        </Card>
        <Card>
          <CardHead title="Campaigns" hint="utm_campaign" icon={<Target />} />
          {data.campaigns.length ? (
            <Table head={<><Th>Campaign</Th><Th>Source</Th><Th>Channel</Th><Th num>Visits</Th></>}>
              {data.campaigns.slice(0, 12).map((c) => (
                <tr key={c.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td strong>{c.key}</Td><Td><span className="text-faint">{c.source}</span></Td>
                  <Td><ChannelBadge channel={c.channel} /></Td><Td num>{fmt.num(c.pageviews)}</Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No campaigns yet" sub="Build UTM links in SEO audit → UTM builder." />}
        </Card>
      </div>
    </Shell>
  );
}

/* ----------------------------------------------------------------- pages */

type SortKey = "path" | "pageviews" | "visitors" | "entries" | "bounceRate" | "avgDuration" | "avgScroll";

export function PagesView() {
  const { data } = useStats();
  const [sort, setSort] = useState<{ key: SortKey; dir: number }>({ key: "pageviews", dir: -1 });
  if (!data) return <Shell><div className="skeleton h-100 rounded-[14px]" /></Shell>;

  const pages = [...data.pages].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === "string") return sort.dir * String(av).localeCompare(String(bv));
    return sort.dir * ((av as number) - (bv as number));
  });

  const th = (label: string, key: SortKey, num?: boolean) => (
    <Th num={num}>
      <button onClick={() => setSort((s) => s.key === key ? { key, dir: -s.dir } : { key, dir: -1 })} className="inline-flex items-center gap-1 font-medium tracking-[0.06em] uppercase">
        {label}{sort.key === key ? <span className="text-accent">{sort.dir < 0 ? "↓" : "↑"}</span> : null}
      </button>
    </Th>
  );

  return (
    <Shell>
      <PageHead title="Pages" sub={<>Page-level performance and attribution · {data.range.label}</>} />
      <Card>
        <CardHead title="All pages" hint={`${pages.length} pages · click a column to sort`} icon={<span className="font-mono">#</span>} />
        {pages.length ? (
          <Table head={<>
            {th("Page", "path")}{th("Views", "pageviews", true)}{th("Visitors", "visitors", true)}
            {th("Entries", "entries", true)}{th("Bounce", "bounceRate", true)}{th("Avg. time", "avgDuration", true)}
            {th("Scroll", "avgScroll", true)}<Th>Top source</Th>
          </>}>
            {pages.map((p: PageRow) => (
              <tr key={p.path} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                <Td>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: channelColor(p.topChannel, p.color) }} />
                    <div className="min-w-0"><div className="max-w-55 truncate font-mono text-[11.5px] text-ink">{p.path}</div><div className="max-w-55 truncate text-[10.5px] text-faint">{p.title}</div></div>
                  </div>
                </Td>
                <Td num>{fmt.num(p.pageviews)}</Td><Td num>{fmt.num(p.visitors)}</Td><Td num>{fmt.num(p.entries)}</Td>
                <Td num>{fmt.pct(p.bounceRate)}</Td><Td num>{fmt.dur(p.avgDuration)}</Td><Td num>{p.avgScroll}%</Td>
                <Td><ChannelBadge channel={p.topChannel} /></Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No pages tracked yet" />}
      </Card>
    </Shell>
  );
}

/* -------------------------------------------------------------- audience */

export function AudienceView() {
  const { data } = useStats();
  if (!data) return <Shell><div className="skeleton h-100 rounded-[14px]" /></Shell>;
  const a = data.audience;
  const deviceColors = ["var(--accent)", "var(--channel-ai)", "var(--channel-social)"];

  return (
    <Shell>
      <PageHead title="Audience" sub={<>Who is visiting · {data.range.label}</>} />
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHead title="Countries" hint={`${a.countries.length} regions`} icon={<Globe2 />} />
          {a.countries.length ? (
            <Table head={<><Th>Country</Th><Th num>Visitors</Th><Th num>Views</Th><Th num>Share</Th></>}>
              {a.countries.map((c) => (
                <tr key={c.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                  <Td><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted">{c.key}</span></Td>
                  <Td num>{fmt.num(c.visitors)}</Td><Td num>{fmt.num(c.pageviews)}</Td><Td num>{fmt.pct(c.share)}</Td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState title="No geo data" sub="Country comes from your CDN header or the visitor timezone." />}
        </Card>

        <Card>
          <CardHead title="Devices" icon={<Users />} />
          <div className="p-4">
            {a.devices.length ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative size-34 shrink-0">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--panel-3)" strokeWidth="11" />
                    {(() => {
                      const c = 2 * Math.PI * 42;
                      let offset = 0;
                      const total = a.devices.reduce((x, y) => x + y.pageviews, 0) || 1;
                      return a.devices.map((d, i) => {
                        const len = (d.pageviews / total) * c;
                        const el = <circle key={d.key} cx="50" cy="50" r="42" fill="none" stroke={deviceColors[i % 3]} strokeWidth="11" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />;
                        offset += len;
                        return el;
                      });
                    })()}
                  </svg>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1.75">
                  {a.devices.map((d, i) => (
                    <div key={d.key} className="flex items-center gap-1.75 text-[12px] text-muted">
                      <i className="size-1.75 rounded-[2px]" style={{ background: deviceColors[i % 3] }} />
                      <span className="truncate">{d.key}</span>
                      <span className="ml-auto font-mono text-[11px] text-ink">{fmt.num(d.pageviews)}</span>
                      <span className="w-9 text-right font-mono text-[10.5px] text-faint">{fmt.pct(d.share)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState title="No device data" />}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card><CardHead title="Browsers" />{a.browsers.length ? <div className="p-4"><BarList rows={a.browsers} color="var(--channel-email)" /></div> : <EmptyState title="No data" />}</Card>
        <Card><CardHead title="Operating systems" />{a.os.length ? <div className="p-4"><BarList rows={a.os} color="var(--channel-ai)" /></div> : <EmptyState title="No data" />}</Card>
        <Card><CardHead title="Languages" />{a.languages.length ? <div className="p-4"><BarList rows={a.languages} color="var(--channel-referral)" /></div> : <EmptyState title="No data" />}</Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Cities" hint="top 12" />
          {a.cities.length ? (
            <Table head={<><Th>City</Th><Th num>Visitors</Th><Th num>Views</Th></>}>
              {a.cities.map((c) => <tr key={c.key} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]"><Td strong>{c.key}</Td><Td num>{fmt.num(c.visitors)}</Td><Td num>{fmt.num(c.pageviews)}</Td></tr>)}
            </Table>
          ) : <EmptyState title="No city data" sub="Provided by Vercel, Cloudflare or your own geo header." />}
        </Card>
        <Card>
          <CardHead title="Screen sizes" hint="viewport" />
          {a.screens.length ? <div className="p-4"><BarList rows={a.screens} color="var(--channel-social)" /></div> : <EmptyState title="No data" />}
        </Card>
      </div>
    </Shell>
  );
}
