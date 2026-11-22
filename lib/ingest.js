'use strict';

/**
 * Event ingestion: validate → enrich → classify → store.
 *
 * Privacy model: the raw IP address is never persisted. Visitors are
 * identified by a salted, daily-rotating hash so returning-visitor counts work
 * for a day without any long-lived identifier, and no cookies are required.
 */

const crypto = require('node:crypto');
const db = require('./db');
const { getSecret } = require('./secret');
const { classify, isBotUA, detectCrawler, parseUA, hostOf } = require('./classify');

/* ------------------------------------------------------------ salt / hash */

function dayStamp(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function visitorHash(ip, ua, siteKey, ts) {
  return crypto
    .createHash('sha256')
    .update([ip || '', ua || '', siteKey, dayStamp(ts), getSecret()].join('|'))
    .digest('hex')
    .slice(0, 16);
}

/* -------------------------------------------------------------------- geo */

const TZ_COUNTRY = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Jerusalem': 'IL', 'Asia/Tehran': 'IR',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID',
  'Asia/Bangkok': 'TH', 'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Hanoi': 'VN',
  'Asia/Istanbul': 'TR', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ',
  'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Kabul': 'AF', 'Asia/Baghdad': 'IQ',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Athens': 'GR',
  'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'Europe/Moscow': 'RU', 'Europe/Belgrade': 'RS',
  'Europe/Zagreb': 'HR', 'Europe/Sofia': 'BG', 'Europe/Bratislava': 'SK', 'Europe/Ljubljana': 'SI',
  'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT', 'Europe/Tallinn': 'EE', 'Europe/Minsk': 'BY',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Montreal': 'CA',
  'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Lima': 'PE',
  'America/Santiago': 'CL', 'America/Argentina/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR',
  'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/Havana': 'CU',
  'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA',
  'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
};

function geoFromHeaders(headers) {
  const country =
    headers['cf-ipcountry'] ||
    headers['x-vercel-ip-country'] ||
    headers['x-country-code'] ||
    headers['x-geo-country'] ||
    '';
  const region = headers['x-vercel-ip-country-region'] || headers['x-region'] || '';
  const city = headers['x-vercel-ip-city'] || headers['x-geo-city'] || '';
  return {
    country: String(country).toUpperCase().slice(0, 2) || '',
    region: decodeURIComponentSafe(region),
    city: decodeURIComponentSafe(city),
  };
}

function decodeURIComponentSafe(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value);
  }
}

function countryFromTimezone(tz) {
  if (!tz) return '';
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  const parts = String(tz).split('/');
  if (parts.length === 2) {
    // Try the regional capital mapping, then a continent-level guess.
    const guess = Object.keys(TZ_COUNTRY).find((k) => k.split('/')[0] === parts[0] && k.split('/')[1] === parts[1]);
    if (guess) return TZ_COUNTRY[guess];
  }
  return '';
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const raw =
    (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket?.remoteAddress ||
    '';
  return String(raw).replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');
}

/* --------------------------------------------------------------- ingestion */

function str(value, max = 512) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function normalizePath(value) {
  if (!value) return '/';
  let p = String(value);
  try {
    if (p.startsWith('http')) p = new URL(p).pathname + new URL(p).search;
  } catch {
    /* keep as-is */
  }
  if (!p.startsWith('/')) p = '/' + p;
  return p.slice(0, 512);
}

async function resolveSite(payload) {
  if (payload.site) {
    const byKey = await db.getSiteByKey(String(payload.site));
    if (byKey) return byKey;
  }
  const domain = payload.domain || payload.host || '';
  if (domain) {
    return db.upsertSite({ domain, name: payload.siteName || domain });
  }
  return null;
}

/**
 * Ingest one event. Returns { ok, skipped?, reason? }.
 */
async function ingest(payload, req) {
  const now = Date.now();
  const ts = payload.ts && Math.abs(payload.ts - now) < 1000 * 60 * 60 * 24 * 2
    ? num(payload.ts, now)
    : now;

  const site = await resolveSite(payload);
  if (!site) return { ok: false, skipped: true, reason: 'unknown-site' };

  const ua = str(payload.ua || req?.headers['user-agent'] || '', 512) || '';
  const ip = req ? clientIp(req) : '';
  const crawler = detectCrawler(ua);
  const bot = Boolean(crawler) || isBotUA(ua);
  const type = ['pageview', 'engage', 'event', 'outbound', 'download', 'crawl'].includes(payload.type)
    ? payload.type
    : 'pageview';

  const url = str(payload.url || '', 1024) || '';
  const referrer = str(payload.referrer || '', 1024) || '';
  const utm = {
    source: str(payload.utm?.source, 120) || '',
    medium: str(payload.utm?.medium, 120) || '',
    campaign: str(payload.utm?.campaign, 160) || '',
    term: str(payload.utm?.term, 160) || '',
    content: str(payload.utm?.content, 160) || '',
  };

  const cls = classify({
    referrer,
    pageUrl: url,
    siteDomain: site.domain,
    utm,
  });

  const geoHeaders = req ? geoFromHeaders(req.headers) : { country: '', region: '', city: '' };
  const country =
    geoHeaders.country ||
    (payload.country ? String(payload.country).toUpperCase().slice(0, 2) : '') ||
    countryFromTimezone(payload.tz) ||
    '';

  const { os, browser, device } = parseUA(ua);

  const visitor = visitorHash(ip, ua, site.key, ts);
  const session = str(payload.session, 64) || visitor.slice(0, 12) + '-' + Math.floor(ts / 1800000);

  const event = {
    site_id: site.id,
    ts,
    type,
    path: normalizePath(payload.path || url),
    title: str(payload.title, 300),
    referrer: referrer || null,
    ref_domain: cls.refDomain,
    source: cls.source,
    channel: cls.channel,
    engine: cls.engine,
    query: str(cls.query, 200),
    utm_source: cls.utmSource,
    utm_medium: cls.utmMedium,
    utm_campaign: cls.utmCampaign,
    utm_term: cls.utmTerm,
    utm_content: cls.utmContent,
    country: country || null,
    region: str(payload.region || geoHeaders.region, 120) || null,
    city: str(payload.city || geoHeaders.city, 120) || null,
    device: str(payload.device, 32) || device,
    browser: str(payload.browser, 32) || browser,
    os: str(payload.os, 32) || os,
    screen: str(payload.screen, 24),
    lang: str(payload.lang, 24),
    visitor,
    session,
    bot: bot ? 1 : 0,
    bot_name: crawler ? crawler.name : bot ? 'Other bot' : null,
    duration: num(payload.duration, 0),
    scroll: Math.max(0, Math.min(100, num(payload.scroll, 0))),
    props: payload.props ? JSON.stringify(payload.props).slice(0, 2000) : null,
  };

  if (crawler && type !== 'crawl') event.type = 'crawl';

  await db.insertEvent(event);
  return { ok: true, event: { ...event, site: site.domain } };
}

/** Bulk ingest used by the demo seeder. */
async function ingestMany(list, siteId) {
  return db.insertEvents(list.map((e) => ({ ...e, site_id: siteId })));
}

module.exports = {
  ingest,
  ingestMany,
  visitorHash,
  clientIp,
  countryFromTimezone,
  normalizePath,
};
