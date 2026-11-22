'use strict';

/**
 * Aggregation layer. Everything the dashboard renders is derived here from the
 * raw event stream so numbers always agree with each other.
 */

const db = require('./db');

const RANGES = {
  '1h': { ms: 3600e3, label: 'Last hour', bucket: 'minute' },
  '24h': { ms: 86400e3, label: 'Last 24 hours', bucket: 'hour' },
  '7d': { ms: 7 * 86400e3, label: 'Last 7 days', bucket: 'day' },
  '30d': { ms: 30 * 86400e3, label: 'Last 30 days', bucket: 'day' },
  '90d': { ms: 90 * 86400e3, label: 'Last 90 days', bucket: 'day' },
};

const CHANNEL_META = {
  search: { label: 'Organic search', color: '#c8f751' },
  ai: { label: 'AI assistants', color: '#8b7cf6' },
  social: { label: 'Social', color: '#f472b6' },
  referral: { label: 'Referral', color: '#fbbf24' },
  paid: { label: 'Paid', color: '#fb7185' },
  email: { label: 'Email', color: '#38bdf8' },
  direct: { label: 'Direct', color: '#94a3b8' },
  internal: { label: 'Internal', color: '#475569' },
};

const CHANNEL_ORDER = ['search', 'ai', 'direct', 'social', 'referral', 'paid', 'email'];

function resolveRange(rangeKey, from, to) {
  const now = Date.now();
  if (from && to) return { from: Number(from), to: Number(to), label: 'Custom range', bucket: 'day', key: 'custom' };
  const def = RANGES[rangeKey] || RANGES['7d'];
  const end = now;
  const start = end - def.ms;
  return { from: start, to: end, label: def.label, bucket: def.bucket, key: rangeKey || '7d' };
}

/* ------------------------------------------------------------- primitives */

function uniqueCount(rows, key) {
  const set = new Set();
  for (const r of rows) if (r[key]) set.add(r[key]);
  return set.size;
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key === null || key === undefined || key === '') continue;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key, pageviews: 0, visitors: new Set(), sessions: new Set(), duration: 0, scroll: 0, scrollN: 0 };
      map.set(key, bucket);
    }
    if (row.type === 'pageview') bucket.pageviews += 1;
    if (row.visitor) bucket.visitors.add(row.visitor);
    if (row.session) bucket.sessions.add(row.session);
    if (row.type === 'engage') {
      bucket.duration += row.duration || 0;
      if (row.scroll) {
        bucket.scroll += row.scroll;
        bucket.scrollN += 1;
      }
    }
  }
  return [...map.values()].map((b) => ({
    key: b.key,
    pageviews: b.pageviews,
    visitors: b.visitors.size,
    sessions: b.sessions.size,
    avgDuration: b.sessions.size ? Math.round(b.duration / b.sessions.size) : 0,
    avgScroll: b.scrollN ? Math.round(b.scroll / b.scrollN) : 0,
  }));
}

function topN(list, n = 10, by = 'pageviews') {
  return [...list].sort((a, b) => (b[by] || 0) - (a[by] || 0)).slice(0, n);
}

/* --------------------------------------------------------------- sessions */

/**
 * Session attribution.
 *
 * A visitor who lands from Google and then opens /pricing produces an internal
 * pageview — the referrer is the site itself. Counting that as its own channel
 * drowns the real sources (it is usually the single biggest bucket). Instead,
 * every pageview in a session inherits the channel, source, engine, query and
 * campaign of the session's entry pageview. That is what "where did this visit
 * come from" actually means.
 */
function attributeSessions(rows) {
  const entry = new Map();
  for (const row of rows) {
    if (!row.session || row.type !== 'pageview') continue;
    const current = entry.get(row.session);
    if (!current || row.ts < current.ts) entry.set(row.session, row);
  }

  return rows.map((row) => {
    if (row.type !== 'pageview' || !row.session) return row;
    if (row.channel !== 'internal') return row;
    const first = entry.get(row.session);
    if (!first || first.channel === 'internal') {
      return { ...row, channel: 'direct', source: 'Direct', engine: null, query: null };
    }
    return {
      ...row,
      channel: first.channel,
      source: first.source,
      engine: first.engine,
      query: first.query,
      ref_domain: first.ref_domain,
      utm_source: first.utm_source,
      utm_medium: first.utm_medium,
      utm_campaign: first.utm_campaign,
    };
  });
}

function buildSessions(rows) {
  const bySession = new Map();
  for (const row of rows) {
    if (!row.session) continue;
    let s = bySession.get(row.session);
    if (!s) {
      s = {
        id: row.session,
        visitor: row.visitor,
        startedAt: row.ts,
        lastAt: row.ts,
        pageviews: 0,
        duration: 0,
        scrollMax: 0,
        entry: null,
        exit: null,
        channel: row.channel,
        source: row.source,
        engine: row.engine,
        country: row.country,
        device: row.device,
        query: row.query,
        campaign: row.utm_campaign,
      };
      bySession.set(row.session, s);
    }
    if (row.ts < s.startedAt) {
      s.startedAt = row.ts;
      s.entry = row.path;
      s.channel = row.channel;
      s.source = row.source;
      s.engine = row.engine;
      s.query = row.query;
      s.campaign = row.utm_campaign;
    }
    if (row.ts >= s.lastAt) {
      s.lastAt = row.ts;
      s.exit = row.path;
    }
    if (row.type === 'pageview') {
      s.pageviews += 1;
      if (!s.entry) s.entry = row.path;
      s.exit = row.path;
    }
    if (row.type === 'engage') {
      s.duration += row.duration || 0;
      s.scrollMax = Math.max(s.scrollMax, row.scroll || 0);
    }
  }
  for (const s of bySession.values()) {
    s.bounced = s.pageviews <= 1 && s.duration < 12000;
  }
  return [...bySession.values()];
}

/* ---------------------------------------------------------------- periods */

function bucketStart(ts, bucket) {
  const d = new Date(ts);
  if (bucket === 'minute') {
    d.setSeconds(0, 0);
    return d.getTime();
  }
  if (bucket === 'hour') {
    d.setMinutes(0, 0, 0);
    return d.getTime();
  }
  if (bucket === 'week') {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setHours(0, 0, 0, 0);
    return d.getTime() - diff * 86400e3;
  }
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketStep(bucket) {
  return { minute: 60e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3 }[bucket] || 86400e3;
}

function formatBucket(ts, bucket) {
  const d = new Date(ts);
  if (bucket === 'minute') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (bucket === 'hour') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (bucket === 'week') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ core */

async function loadRows(siteId, from, to) {
  return db.rangeEvents(siteId, from, to);
}

function summarize(rows) {
  const sessions = buildSessions(rows);
  const pageviews = rows.filter((r) => r.type === 'pageview');
  const engages = rows.filter((r) => r.type === 'engage');
  const visitors = uniqueCount(rows, 'visitor');
  const bounced = sessions.filter((s) => s.bounced).length;
  const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
  const aiPageviews = pageviews.filter((r) => r.channel === 'ai').length;
  const searchPageviews = pageviews.filter((r) => r.channel === 'search').length;

  return {
    visitors,
    sessions: sessions.length,
    pageviews: pageviews.length,
    events: rows.filter((r) => r.type === 'event').length,
    bounceRate: sessions.length ? Math.round((bounced / sessions.length) * 1000) / 10 : 0,
    avgDuration: sessions.length ? Math.round(totalDuration / sessions.length / 100) / 10 : 0,
    avgScroll: engages.length
      ? Math.round(engages.reduce((a, r) => a + (r.scroll || 0), 0) / engages.length)
      : 0,
    viewsPerSession: sessions.length ? Math.round((pageviews.length / sessions.length) * 100) / 100 : 0,
    aiShare: pageviews.length ? Math.round((aiPageviews / pageviews.length) * 1000) / 10 : 0,
    searchShare: pageviews.length ? Math.round((searchPageviews / pageviews.length) * 1000) / 10 : 0,
  };
}

function series(rows, from, to, bucket) {
  const step = bucketStep(bucket);
  const start = bucketStart(from, bucket);
  const end = bucketStart(to, bucket) + step;
  const buckets = new Map();
  for (let t = start; t < end; t += step) {
    buckets.set(t, { t, label: formatBucket(t, bucket), pageviews: 0, visitors: new Set(), sessions: new Set(), ai: 0, search: 0, direct: 0, social: 0, referral: 0, paid: 0, email: 0 });
  }
  for (const row of rows) {
    const b = buckets.get(bucketStart(row.ts, bucket));
    if (!b) continue;
    if (row.type === 'pageview') {
      b.pageviews += 1;
      if (row.channel in b) b[row.channel] += 1;
    }
    if (row.visitor) b.visitors.add(row.visitor);
    if (row.session) b.sessions.add(row.session);
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    visitors: b.visitors.size,
    sessions: b.sessions.size,
  }));
}

function channelBreakdown(rows) {
  const grouped = groupBy(rows.filter((r) => r.type === 'pageview'), (r) => r.channel || 'direct');
  const total = grouped.reduce((a, g) => a + g.pageviews, 0) || 1;
  const present = new Map(grouped.map((g) => [g.key, g]));
  return CHANNEL_ORDER.filter((c) => present.has(c)).map((c) => {
    const g = present.get(c);
    return {
      channel: c,
      label: CHANNEL_META[c]?.label || c,
      color: CHANNEL_META[c]?.color || '#94a3b8',
      pageviews: g.pageviews,
      visitors: g.visitors,
      sessions: g.sessions,
      share: Math.round((g.pageviews / total) * 1000) / 10,
    };
  });
}

function sourceBreakdown(rows) {
  const pageviews = rows.filter((r) => r.type === 'pageview');
  const total = pageviews.length || 1;
  return groupBy(pageviews, (r) => r.source)
    .map((g) => {
      const sample = pageviews.find((r) => r.source === g.key);
      return {
        ...g,
        channel: sample?.channel || 'referral',
        color: CHANNEL_META[sample?.channel]?.color || '#94a3b8',
        share: Math.round((g.pageviews / total) * 1000) / 10,
      };
    })
    .sort((a, b) => b.pageviews - a.pageviews);
}

function referrerBreakdown(rows) {
  const pageviews = rows.filter((r) => r.type === 'pageview' && r.ref_domain);
  const total = rows.filter((r) => r.type === 'pageview').length || 1;
  return groupBy(pageviews, (r) => r.ref_domain)
    .map((g) => {
      const sample = pageviews.find((r) => r.ref_domain === g.key);
      return {
        ...g,
        channel: sample?.channel || 'referral',
        source: sample?.source || g.key,
        share: Math.round((g.pageviews / total) * 1000) / 10,
      };
    })
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 25);
}

function engineBreakdown(rows) {
  const aiRows = rows.filter((r) => r.channel === 'ai');
  const grouped = groupBy(aiRows.filter((r) => r.type === 'pageview'), (r) => r.engine || r.source || 'AI Assistant');
  const total = grouped.reduce((a, g) => a + g.pageviews, 0) || 1;
  return grouped
    .map((g) => {
      const landing = topN(
        groupBy(aiRows.filter((r) => (r.engine || r.source) === g.key && r.type === 'pageview'), (r) => r.path),
        1
      )[0];
      return {
        engine: g.key,
        ...g,
        share: Math.round((g.pageviews / total) * 1000) / 10,
        topPage: landing?.key || '—',
      };
    })
    .sort((a, b) => b.pageviews - a.pageviews);
}

function queryBreakdown(rows) {
  const withQuery = rows.filter((r) => r.type === 'pageview' && r.query && r.channel === 'search');
  return groupBy(withQuery, (r) => r.query)
    .map((g) => {
      const sample = withQuery.find((r) => r.query === g.key);
      return { ...g, engine: sample?.source || 'Search', landing: sample?.path || '/' };
    })
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 30);
}

function campaignBreakdown(rows) {
  const withCampaign = rows.filter((r) => r.type === 'pageview' && r.utm_campaign);
  return groupBy(withCampaign, (r) => r.utm_campaign)
    .map((g) => {
      const sample = withCampaign.find((r) => r.utm_campaign === g.key);
      return {
        ...g,
        source: sample?.utm_source || '—',
        medium: sample?.utm_medium || '—',
        channel: sample?.channel || 'referral',
      };
    })
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 25);
}

function pageBreakdown(rows, sessions) {
  const pageviews = rows.filter((r) => r.type === 'pageview');
  const entryByPath = new Map();
  for (const s of sessions) {
    if (!s.entry) continue;
    const cur = entryByPath.get(s.entry) || { entries: 0, bounces: 0 };
    cur.entries += 1;
    if (s.bounced) cur.bounces += 1;
    entryByPath.set(s.entry, cur);
  }
  const grouped = groupBy(rows, (r) => r.path);
  return grouped
    .map((g) => {
      const sample = pageviews.find((r) => r.path === g.key);
      const entries = entryByPath.get(g.key) || { entries: 0, bounces: 0 };
      const sources = groupBy(pageviews.filter((r) => r.path === g.key), (r) => r.channel);
      const topSource = topN(sources, 1)[0];
      return {
        path: g.key,
        title: sample?.title || '',
        pageviews: g.pageviews,
        visitors: g.visitors,
        entries: entries.entries,
        bounceRate: entries.entries ? Math.round((entries.bounces / entries.entries) * 1000) / 10 : 0,
        avgDuration: g.avgDuration,
        avgScroll: g.avgScroll,
        topChannel: topSource?.key || 'direct',
        color: CHANNEL_META[topSource?.key]?.color || '#94a3b8',
      };
    })
    .filter((p) => p.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 50);
}

function audience(rows) {
  const pageviews = rows.filter((r) => r.type === 'pageview');
  const total = pageviews.length || 1;
  const mk = (keyFn, n = 12) =>
    groupBy(pageviews, keyFn)
      .map((g) => ({ ...g, share: Math.round((g.pageviews / total) * 1000) / 10 }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, n);
  return {
    countries: mk((r) => r.country || 'Unknown', 20),
    cities: mk((r) => r.city, 12),
    devices: mk((r) => r.device || 'Unknown', 6),
    browsers: mk((r) => r.browser || 'Unknown', 8),
    os: mk((r) => r.os || 'Unknown', 8),
    languages: mk((r) => r.lang, 8),
    screens: mk((r) => r.screen, 8),
  };
}

function heatmap(rows) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const row of rows) {
    if (row.type !== 'pageview') continue;
    const d = new Date(row.ts);
    grid[d.getDay()][d.getHours()] += 1;
  }
  return grid;
}

async function realtime(siteId, windowMs = 5 * 60e3) {
  const now = Date.now();
  const from = now - windowMs;
  const rows = await db.rangeEvents(siteId, from, now + 1);
  const sessions = new Set(rows.map((r) => r.session).filter(Boolean));
  const perMinute = [];
  for (let i = 29; i >= 0; i--) {
    const start = now - i * 60e3 - 60e3;
    const count = rows.filter((r) => r.ts >= start && r.ts < start + 60e3 && r.type === 'pageview').length;
    perMinute.push(count);
  }
  const feed = rows
    .filter((r) => r.type === 'pageview')
    .slice(0, 25)
    .map((r) => ({
      ts: r.ts,
      path: r.path,
      title: r.title,
      source: r.source,
      channel: r.channel,
      country: r.country,
      device: r.device,
      city: r.city,
    }));
  return { active: sessions.size, pageviews: rows.filter((r) => r.type === 'pageview').length, perMinute, feed, windowMinutes: windowMs / 60e3 };
}

async function crawlerStats(siteId, from, to) {
  const rows = (await db.rangeEvents(siteId, from, to, { includeBots: true })).filter((r) => r.type === 'crawl');
  const byBot = groupBy(rows, (r) => r.bot_name || 'Other bot')
    .map((g) => ({
      bot: g.key,
      hits: rows.filter((r) => (r.bot_name || 'Other bot') === g.key).length,
      pages: new Set(rows.filter((r) => (r.bot_name || 'Other bot') === g.key).map((r) => r.path)).size,
      lastSeen: Math.max(...rows.filter((r) => (r.bot_name || 'Other bot') === g.key).map((r) => r.ts)),
    }))
    .sort((a, b) => b.hits - a.hits);
  const byPage = groupBy(rows, (r) => r.path)
    .map((g) => ({ path: g.key, hits: rows.filter((r) => r.path === g.key).length }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 20);
  return { total: rows.length, bots: byBot, pages: byPage };
}

async function recent(siteId, limit = 30) {
  return (await db.recentEvents(siteId, limit)).map((r) => ({
    ...r,
    props: r.props ? safeJson(r.props) : null,
  }));
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- public */

async function dashboard(siteId, { range = '7d', from, to } = {}) {
  const r = resolveRange(range, from, to);
  const prevFrom = r.from - (r.to - r.from);
  const [rows, prevRows] = await Promise.all([
    loadRows(siteId, r.from, r.to),
    loadRows(siteId, prevFrom, r.from),
  ]);
  const sessions = buildSessions(rows);
  const attributed = attributeSessions(rows);
  const overview = summarize(attributed);
  const prevOverview = summarize(attributeSessions(prevRows));

  const delta = {};
  for (const key of ['visitors', 'sessions', 'pageviews', 'bounceRate', 'avgDuration', 'aiShare']) {
    const before = prevOverview[key] || 0;
    const now = overview[key] || 0;
    if (!prevOverview.pageviews) delta[key] = null;
    else if (before === 0) delta[key] = now > 0 ? 100 : 0;
    else delta[key] = Math.round(((now - before) / before) * 1000) / 10;
  }

  const bucket = r.bucket === 'hour' && r.to - r.from > 3 * 86400e3 ? 'day' : r.bucket;

  return {
    range: { key: r.key, label: r.label, from: r.from, to: r.to, bucket, prevFrom },
    overview: { ...overview, delta },
    series: series(attributed, r.from, r.to, bucket),
    channels: channelBreakdown(attributed),
    sources: sourceBreakdown(attributed),
    referrers: referrerBreakdown(attributed),
    engines: engineBreakdown(attributed),
    queries: queryBreakdown(attributed),
    campaigns: campaignBreakdown(attributed),
    pages: pageBreakdown(attributed, sessions),
    audience: audience(attributed),
    heatmap: heatmap(attributed),
    realtime: await realtime(siteId),
    crawlers: await crawlerStats(siteId, r.from, r.to),
    recent: await recent(siteId, 25),
    sessionsSample: sessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 25)
      .map((s) => ({
        id: s.id.slice(0, 10),
        startedAt: s.startedAt,
        pageviews: s.pageviews,
        duration: s.duration,
        entry: s.entry,
        exit: s.exit,
        source: s.source,
        channel: s.channel,
        country: s.country,
        device: s.device,
        bounced: s.bounced,
        scrollMax: s.scrollMax,
      })),
  };
}

async function toCsv(siteId, { range = '30d', from, to } = {}) {
  const r = resolveRange(range, from, to);
  const rows = await db.rangeEvents(siteId, r.from, r.to);
  const cols = ['ts', 'type', 'path', 'source', 'channel', 'engine', 'query', 'country', 'device', 'browser', 'os', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'session', 'duration', 'scroll'];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(c === 'ts' ? new Date(row.ts).toISOString() : row[c])).join(','));
  }
  return lines.join('\n');
}

module.exports = {
  RANGES,
  CHANNEL_META,
  dashboard,
  toCsv,
  resolveRange,
  realtime,
};
