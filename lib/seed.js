'use strict';

/**
 * Demo data generator. Produces ~30 days of plausible traffic with a rising
 * AI-assistant share, so every dashboard view has something real to show
 * before the tracker is installed.
 */

const db = require('./db');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAGES = [
  { path: '/', title: 'Acme Cloud — Edge platform for modern apps', weight: 20 },
  { path: '/pricing', title: 'Pricing — Acme Cloud', weight: 11 },
  { path: '/product/analytics', title: 'Traffic analytics with source intelligence', weight: 9 },
  { path: '/product/edge-functions', title: 'Edge Functions — run code in 300 cities', weight: 7 },
  { path: '/docs/getting-started', title: 'Getting started — Acme Cloud docs', weight: 8 },
  { path: '/docs/api-reference', title: 'API reference — Acme Cloud docs', weight: 5 },
  { path: '/blog/edge-caching-explained', title: 'Edge caching explained: a practical guide', weight: 7 },
  { path: '/blog/ai-search-traffic-2026', title: 'How AI search is rewriting referral traffic', weight: 6 },
  { path: '/blog/llms-txt-guide', title: 'llms.txt: a practical guide for teams', weight: 5 },
  { path: '/blog/core-web-vitals-2026', title: 'Core Web Vitals in 2026: what actually moves INP', weight: 5 },
  { path: '/customers', title: 'Customer stories — Acme Cloud', weight: 4 },
  { path: '/integrations', title: 'Integrations — Acme Cloud', weight: 4 },
  { path: '/changelog', title: 'Changelog — Acme Cloud', weight: 4 },
  { path: '/security', title: 'Security & compliance — Acme Cloud', weight: 3 },
  { path: '/about', title: 'About Acme Cloud', weight: 2 },
  { path: '/careers', title: 'Careers at Acme Cloud', weight: 2 },
  { path: '/contact', title: 'Contact sales', weight: 2 },
];

const QUERIES = [
  'edge caching explained', 'best analytics for developers', 'how to track ai traffic',
  'llms.txt example', 'core web vitals 2026', 'cloudflare workers alternatives',
  'privacy friendly analytics', 'generative engine optimization', 'how do llm crawlers work',
  'track traffic sources without cookies', 'edge functions vs serverless', 'aeo vs seo',
  'what is geo optimization', 'best saas analytics tool', 'how to get cited by chatgpt',
];

const AI_ENGINES = [
  { name: 'ChatGPT', weight: 42 },
  { name: 'Perplexity', weight: 21 },
  { name: 'Claude', weight: 14 },
  { name: 'Gemini', weight: 11 },
  { name: 'Copilot', weight: 7 },
  { name: 'Grok', weight: 3 },
  { name: 'You.com', weight: 2 },
];

const SOCIAL = [
  { name: 'LinkedIn', weight: 34, ref: 'linkedin.com' },
  { name: 'X', weight: 24, ref: 'x.com' },
  { name: 'Reddit', weight: 16, ref: 'reddit.com' },
  { name: 'Hacker News', weight: 12, ref: 'news.ycombinator.com' },
  { name: 'YouTube', weight: 7, ref: 'youtube.com' },
  { name: 'Product Hunt', weight: 4, ref: 'producthunt.com' },
  { name: 'Dev.to', weight: 3, ref: 'dev.to' },
];

const REFERRERS = [
  { domain: 'github.com', source: 'github.com', weight: 26 },
  { domain: 'dev.to', source: 'dev.to', weight: 14 },
  { domain: 'news.ycombinator.com', source: 'Hacker News', weight: 13 },
  { domain: 'medium.com', source: 'medium.com', weight: 10 },
  { domain: 'smashingmagazine.com', source: 'smashingmagazine.com', weight: 8 },
  { domain: 'css-tricks.com', source: 'css-tricks.com', weight: 7 },
  { domain: 'stackoverflow.com', source: 'Stack Overflow', weight: 7 },
  { domain: 'substack.com', source: 'substack.com', weight: 5 },
  { domain: 'indiehackers.com', source: 'indiehackers.com', weight: 4 },
  { domain: 'thenewstack.io', source: 'thenewstack.io', weight: 3 },
  { domain: 'techcrunch.com', source: 'techcrunch.com', weight: 3 },
];

const CAMPAIGNS = [
  { campaign: 'launch-ai-analytics', source: 'newsletter', medium: 'email', channel: 'email', weight: 30 },
  { campaign: 'spring-retargeting', source: 'google', medium: 'cpc', channel: 'paid', weight: 34 },
  { campaign: 'linkedin-demo-q2', source: 'linkedin', medium: 'paid_social', channel: 'paid', weight: 22 },
  { campaign: 'devtool-newsletter-sponsor', source: 'bytesweekly', medium: 'sponsorship', channel: 'paid', weight: 14 },
];

const COUNTRIES = [
  ['US', 21], ['IN', 18], ['GB', 8], ['DE', 7], ['CA', 5], ['AU', 4], ['FR', 4], ['NL', 3],
  ['SG', 3], ['BR', 3], ['JP', 3], ['AE', 2], ['ES', 2], ['IT', 2], ['PK', 2], ['NG', 2],
  ['ZA', 1], ['MX', 2], ['SE', 1], ['PL', 2], ['ID', 2], ['PH', 1], ['TR', 1], ['KR', 1],
];

const CITIES = {
  US: ['San Francisco', 'New York', 'Seattle', 'Austin', 'Chicago'],
  IN: ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'],
  GB: ['London', 'Manchester', 'Edinburgh'],
  DE: ['Berlin', 'Munich', 'Hamburg'],
  CA: ['Toronto', 'Vancouver', 'Montreal'],
  AU: ['Sydney', 'Melbourne'],
  FR: ['Paris', 'Lyon'],
  NL: ['Amsterdam', 'Rotterdam'],
  SG: ['Singapore'],
  BR: ['São Paulo', 'Rio de Janeiro'],
  JP: ['Tokyo', 'Osaka'],
  AE: ['Dubai'],
  ES: ['Madrid', 'Barcelona'],
  IT: ['Milan', 'Rome'],
  PK: ['Karachi', 'Lahore'],
  NG: ['Lagos'],
  MX: ['Mexico City'],
  SE: ['Stockholm'],
  PL: ['Warsaw'],
  ID: ['Jakarta'],
  PH: ['Manila'],
  TR: ['Istanbul'],
  KR: ['Seoul'],
  ZA: ['Cape Town'],
};

const SCREENS = ['390x844', '393x852', '412x915', '1440x900', '1920x1080', '2560x1440', '1366x768', '768x1024', '428x926', '1536x864'];
const LANGS = [['en-US', 42], ['en-GB', 14], ['en-IN', 12], ['de-DE', 6], ['hi-IN', 5], ['es-ES', 4], ['fr-FR', 4], ['pt-BR', 3], ['ja-JP', 3], ['nl-NL', 2], ['id-ID', 2], ['pl-PL', 2]];

const AI_CRAWLERS = [
  ['GPTBot', 30], ['ClaudeBot', 22], ['PerplexityBot', 18], ['OAI-SearchBot', 12],
  ['Google-Extended', 8], ['CCBot', 5], ['Bytespider', 3], ['Amazonbot', 2],
];

const HOUR_WEIGHTS = [1, 1, 1, 1, 2, 3, 5, 8, 12, 16, 18, 17, 15, 16, 17, 16, 15, 14, 15, 17, 16, 12, 7, 3];
const DAY_WEIGHTS = [0.72, 1.0, 1.06, 1.04, 1.0, 0.82, 0.68]; // Sun..Sat

function pickWeighted(rand, list, weightKey = 'weight') {
  const total = list.reduce((a, i) => a + (i[weightKey] ?? 1), 0);
  let r = rand() * total;
  for (const item of list) {
    r -= item[weightKey] ?? 1;
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

function pickPair(rand, pairs) {
  const total = pairs.reduce((a, p) => a + p[1], 0);
  let r = rand() * total;
  for (const p of pairs) {
    r -= p[1];
    if (r <= 0) return p[0];
  }
  return pairs[0][0];
}

function hex(rand, len = 16) {
  let out = '';
  for (let i = 0; i < len; i++) out += Math.floor(rand() * 16).toString(16);
  return out;
}

function sessionId(rand) {
  return `${hex(rand, 8)}-${hex(rand, 8)}`;
}

function deviceProfile(rand) {
  const device = pickWeighted(rand, [{ v: 'Mobile', weight: 54 }, { v: 'Desktop', weight: 41 }, { v: 'Tablet', weight: 5 }], 'weight').v;
  const browser = pickWeighted(rand, [
    { v: 'Chrome', weight: 61 }, { v: 'Safari', weight: 21 }, { v: 'Edge', weight: 8 },
    { v: 'Firefox', weight: 5 }, { v: 'Samsung Internet', weight: 3 }, { v: 'Opera', weight: 2 },
  ]).v;
  let os;
  if (device === 'Mobile') os = browser === 'Safari' ? 'iOS' : pickWeighted(rand, [{ v: 'Android', weight: 88 }, { v: 'iOS', weight: 12 }]).v;
  else if (device === 'Tablet') os = browser === 'Safari' ? 'iOS' : 'Android';
  else os = pickWeighted(rand, [{ v: 'Windows 10/11', weight: 56 }, { v: 'macOS', weight: 32 }, { v: 'Linux', weight: 10 }, { v: 'ChromeOS', weight: 2 }]).v;
  const screen = device === 'Mobile'
    ? pickWeighted(rand, [{ v: '390x844', weight: 30 }, { v: '393x852', weight: 22 }, { v: '412x915', weight: 20 }, { v: '428x926', weight: 14 }, { v: '360x800', weight: 14 }]).v
    : pickWeighted(rand, SCREENS.filter((s) => !/^3|^4/.test(s)).map((v) => ({ v, weight: v.startsWith('1920') || v.startsWith('1440') ? 30 : 12 }))).v;
  return { device, browser, os, screen };
}

function buildSessionEvents(rand, when, ctx) {
  const { dayIndex, totalDays, siteKey } = ctx;
  const growth = 0.55 + (dayIndex / Math.max(1, totalDays - 1)) * 0.45;
  const aiWeight = 6 + (dayIndex / Math.max(1, totalDays - 1)) * 17; // AI share climbs 6% → 23%

  const channel = pickWeighted(rand, [
    { v: 'search', weight: 38 },
    { v: 'ai', weight: aiWeight },
    { v: 'direct', weight: 19 },
    { v: 'social', weight: 10 },
    { v: 'referral', weight: 7 },
    { v: 'paid', weight: 8 },
    { v: 'email', weight: 3 },
  ]).v;

  const country = pickPair(rand, COUNTRIES);
  const { device, browser, os, screen } = deviceProfile(rand);
  const lang = pickPair(rand, LANGS);
  const city = (CITIES[country] || [''])[Math.floor(rand() * (CITIES[country]?.length || 1))] || null;
  const session = sessionId(rand);
  const visitor = hex(rand, 16);

  let source = 'Direct';
  let engine = null;
  let query = null;
  let referrer = null;
  let refDomain = null;
  let utm = { source: '', medium: '', campaign: '' };

  if (channel === 'search') {
    const se = pickWeighted(rand, [
      { v: 'Google', weight: 82 }, { v: 'Bing', weight: 9 }, { v: 'DuckDuckGo', weight: 4 },
      { v: 'Yahoo', weight: 2 }, { v: 'Brave Search', weight: 2 }, { v: 'Yandex', weight: 1 },
    ]).v;
    source = se;
    query = pickWeighted(rand, QUERIES.map((q) => ({ v: q, weight: 1 }))).v;
    refDomain = { Google: 'google.com', Bing: 'bing.com', DuckDuckGo: 'duckduckgo.com', Yahoo: 'search.yahoo.com', 'Brave Search': 'search.brave.com', Yandex: 'yandex.com' }[se];
    referrer = `https://${refDomain}/search?q=${encodeURIComponent(query)}`;
  } else if (channel === 'ai') {
    const ai = pickWeighted(rand, AI_ENGINES);
    source = ai.name;
    engine = ai.name;
    refDomain = { ChatGPT: 'chatgpt.com', Perplexity: 'perplexity.ai', Claude: 'claude.ai', Gemini: 'gemini.google.com', Copilot: 'copilot.microsoft.com', Grok: 'grok.com', 'You.com': 'you.com' }[ai.name];
    // OpenAI and Anthropic usually strip the referrer — half the time we only see utm_source.
    if (rand() > 0.45) referrer = `https://${refDomain}/`;
    else utm.source = refDomain;
    query = rand() > 0.5 ? pickWeighted(rand, QUERIES.map((q) => ({ v: q, weight: 1 }))).v : null;
  } else if (channel === 'social') {
    const s = pickWeighted(rand, SOCIAL);
    source = s.name;
    refDomain = s.ref;
    referrer = `https://${s.ref}/`;
  } else if (channel === 'referral') {
    const r = pickWeighted(rand, REFERRERS);
    source = r.source;
    refDomain = r.domain;
    referrer = `https://${r.domain}/some/article`;
  } else if (channel === 'paid') {
    const c = pickWeighted(rand, CAMPAIGNS.filter((x) => x.channel === 'paid'));
    source = c.source === 'google' ? 'Google Ads' : c.source === 'linkedin' ? 'LinkedIn Ads' : c.source;
    utm = { source: c.source, medium: c.medium, campaign: c.campaign };
    refDomain = c.source === 'google' ? 'google.com' : c.source === 'linkedin' ? 'linkedin.com' : 'newsletter';
  } else if (channel === 'email') {
    const c = pickWeighted(rand, CAMPAIGNS.filter((x) => x.channel === 'email'));
    source = 'Newsletter';
    utm = { source: c.source, medium: c.medium, campaign: c.campaign };
  }

  const landing = pickWeighted(rand, PAGES);
  const pageCount = channel === 'paid' || channel === 'ai'
    ? (rand() > 0.55 ? 2 : 1)
    : 1 + Math.floor(Math.pow(rand(), 1.7) * 4);
  const pages = [landing];
  for (let i = 1; i < pageCount; i++) {
    const next = pickWeighted(rand, PAGES);
    if (!pages.some((p) => p.path === next.path)) pages.push(next);
  }

  const events = [];
  let cursor = when;
  const engaged = rand() > 0.32;

  pages.forEach((page, index) => {
    const isEntry = index === 0;
    const duration = isEntry
      ? Math.round((engaged ? 18000 + rand() * 210000 : 900 + rand() * 6000) * growth)
      : Math.round(12000 + rand() * 150000);
    const scroll = engaged ? Math.round(35 + rand() * 65) : Math.round(5 + rand() * 30);

    events.push({
      site_id: ctx.siteId,
      ts: cursor,
      type: 'pageview',
      path: page.path,
      title: page.title,
      referrer: isEntry ? referrer : null,
      ref_domain: isEntry ? refDomain : null,
      source: isEntry ? source : 'Internal',
      channel: isEntry ? channel : 'internal',
      engine: isEntry ? engine : null,
      query: isEntry ? query : null,
      utm_source: isEntry ? utm.source : '',
      utm_medium: isEntry ? utm.medium : '',
      utm_campaign: isEntry ? utm.campaign : '',
      utm_term: '',
      utm_content: '',
      country,
      region: null,
      city,
      device,
      browser,
      os,
      screen,
      lang,
      visitor,
      session,
      bot: 0,
      bot_name: null,
      duration: 0,
      scroll: 0,
      props: null,
    });

    events.push({
      site_id: ctx.siteId,
      ts: cursor + Math.min(duration, 60000),
      type: 'engage',
      path: page.path,
      title: page.title,
      referrer: null,
      ref_domain: null,
      source: isEntry ? source : 'Internal',
      channel: isEntry ? channel : 'internal',
      engine: isEntry ? engine : null,
      query: null,
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      country,
      region: null,
      city,
      device,
      browser,
      os,
      screen,
      lang,
      visitor,
      session,
      bot: 0,
      bot_name: null,
      duration,
      scroll,
      props: null,
    });

    cursor += duration + 2000 + Math.floor(rand() * 8000);
  });

  return events;
}

async function seedDemo({ days = 30, siteName = 'Acme Cloud', domain = 'acme.dev', sessionsPerDay = 620, seed = 20260214 } = {}) {
  const rand = mulberry32(seed);
  const site = await db.upsertSite({ domain, name: siteName });
  await db.clearSiteEvents(site.id);

  const now = new Date();
  const events = [];
  const crawls = [];

  for (let d = days - 1; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 86400e3);
    const dayIndex = days - 1 - d;
    const dow = dayDate.getDay();
    const growth = 0.55 + (dayIndex / Math.max(1, days - 1)) * 0.45;
    const seasonal = DAY_WEIGHTS[dow];
    const jitter = 0.85 + rand() * 0.3;
    const count = Math.round(sessionsPerDay * growth * seasonal * jitter);

    for (let i = 0; i < count; i++) {
      const hour = pickWeighted(rand, HOUR_WEIGHTS.map((w, h) => ({ v: h, weight: w }))).v;
      const minute = Math.floor(rand() * 60);
      const second = Math.floor(rand() * 60);
      const when = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hour, minute, second).getTime();
      if (when > Date.now()) continue;
      const sessionEvents = buildSessionEvents(rand, when, { siteId: site.id, dayIndex, totalDays: days, siteKey: site.key });
      events.push(...sessionEvents);
    }

    // AI crawler hits — the leading indicator that content is being read.
    const crawlCount = 14 + Math.round(rand() * 30 + dayIndex * 0.4);
    for (let i = 0; i < crawlCount; i++) {
      const bot = pickWeighted(rand, AI_CRAWLERS.map(([name, weight]) => ({ name, weight }))).name;
      const page = pickWeighted(rand, PAGES);
      const when = dayDate.getTime() + Math.floor(rand() * 86400e3 * 0.85);
      if (when > Date.now()) continue;
      crawls.push({
        site_id: site.id,
        ts: when,
        type: 'crawl',
        path: page.path,
        title: page.title,
        referrer: null,
        ref_domain: null,
        source: bot,
        channel: 'ai',
        engine: null,
        query: null,
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        country: null,
        region: null,
        city: null,
        device: 'Bot',
        browser: bot,
        os: null,
        screen: null,
        lang: null,
        visitor: null,
        session: null,
        bot: 1,
        bot_name: bot,
        duration: 0,
        scroll: 0,
        props: null,
      });
    }
  }

  // A few visits in the last two minutes so the live view is not empty.
  for (let i = 0; i < 5; i++) {
    const when = Date.now() - Math.floor(rand() * 110000);
    events.push(...buildSessionEvents(rand, when, { siteId: site.id, dayIndex: days - 1, totalDays: days, siteKey: site.key }));
  }

  const all = [...events, ...crawls].sort((a, b) => a.ts - b.ts);
  await db.insertEvents(all);

  return { site, events: events.length, crawls: crawls.length, total: all.length };
}

module.exports = { seedDemo };
