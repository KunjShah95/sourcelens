'use strict';

/**
 * Supabase store — production backend.
 *
 * Talks to Supabase over PostgREST (plain fetch, no SDK, no dependencies).
 * The server holds the service-role key; browsers never see it.
 *
 * Requires:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_KEY=<service_role key>
 * and the schema in supabase/schema.sql applied to the project.
 */

const crypto = require('node:crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Supabase store requires SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

const PAGE_SIZE = 1000;
const MAX_ROWS = 120000;
const INSERT_CHUNK = 400;

/* ------------------------------------------------------------------ fetch */

async function rest(path, { method = 'GET', body, query, prefer, headers = {}, raw = false, timeout = 20000 } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${path}`;
  if (query) {
    const qs = typeof query === 'string' ? query : new URLSearchParams(query).toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...(prefer ? { prefer: prefer } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (raw) return res;

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message = data?.message || data?.error_description || (typeof data === 'string' ? data : '') || `HTTP ${res.status}`;
      const err = new Error(`Supabase ${method} ${path} failed: ${message}`);
      err.status = res.status;
      err.details = data;
      throw err;
    }
    return { data, headers: res.headers, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------------------- normalize */

function num(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeEvent(row) {
  return {
    ...row,
    ts: num(row.ts) ?? 0,
    duration: num(row.duration) ?? 0,
    scroll: num(row.scroll) ?? 0,
    bot: row.bot === true ? 1 : num(row.bot) ?? 0,
    site_id: num(row.site_id),
  };
}

function normalizeSite(row) {
  if (!row) return row;
  return {
    ...row,
    id: num(row.id),
    created_at: num(row.created_at) ?? 0,
    events: num(row.events) ?? 0,
    last_seen: num(row.last_seen),
  };
}

/* ------------------------------------------------------------------ sites */

function normalizeDomain(input) {
  if (!input) return '';
  let d = String(input).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
  d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return d.replace(/\.$/, '');
}

function makeKey(domain) {
  return 'sl_' + crypto.createHash('sha1').update(domain + Date.now() + Math.random()).digest('hex').slice(0, 18);
}

async function listSites(ownerId) {
  // Prefer the aggregate RPC (one round trip). Fall back to a plain select if
  // the schema has not been upgraded yet.
  try {
    const { data } = await rest('rpc/site_overview', {
      method: 'POST',
      body: { p_owner: ownerId || null },
    });
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map(normalizeSite)
      .filter((s) => !ownerId || s.owner_id === ownerId)
      .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
  } catch (err) {
    if (err.status !== 404) throw err;
    const query = ownerId ? { select: '*', owner_id: `eq.${ownerId}`, order: 'created_at.asc' } : { select: '*', order: 'created_at.asc' };
    const { data } = await rest('sites', { query });
    return (data || []).map((s) => normalizeSite({ ...s, events: 0, last_seen: null }));
  }
}

async function getSiteByKey(key) {
  if (!key) return undefined;
  const { data } = await rest('sites', { query: { select: '*', key: `eq.${key}`, limit: '1' } });
  return data && data[0] ? normalizeSite(data[0]) : undefined;
}

async function getSiteById(id) {
  if (!id) return undefined;
  const { data } = await rest('sites', { query: { select: '*', id: `eq.${Number(id)}`, limit: '1' } });
  return data && data[0] ? normalizeSite(data[0]) : undefined;
}

async function getSiteByDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return undefined;
  const { data } = await rest('sites', { query: { select: '*', domain: `eq.${normalized}`, limit: '1' } });
  return data && data[0] ? normalizeSite(data[0]) : undefined;
}

async function upsertSite({ domain, name, timezone, ownerId }) {
  const normalized = normalizeDomain(domain);
  if (!normalized) throw new Error('A domain is required');

  const existing = await getSiteByDomain(normalized);
  if (existing) {
    const patch = {};
    if (name && name !== existing.name) patch.name = name;
    if (ownerId && !existing.owner_id) patch.owner_id = ownerId;
    if (timezone && !existing.timezone) patch.timezone = timezone;
    if (Object.keys(patch).length) {
      const { data } = await rest('sites', {
        method: 'PATCH',
        query: { id: `eq.${existing.id}` },
        body: patch,
        prefer: 'return=representation',
      });
      return normalizeSite(data && data[0]);
    }
    return existing;
  }

  const row = {
    domain: normalized,
    name: name || normalized,
    key: makeKey(normalized),
    owner_id: ownerId || null,
    timezone: timezone || null,
    created_at: Date.now(),
  };

  try {
    const { data } = await rest('sites', {
      method: 'POST',
      body: [row],
      prefer: 'return=representation',
    });
    return normalizeSite(data && data[0]);
  } catch (err) {
    // Unique violation from a concurrent insert — read it back.
    if (err.status === 409) {
      const found = await getSiteByDomain(normalized);
      if (found) return found;
    }
    throw err;
  }
}

async function deleteSite(id) {
  await rest('events', { method: 'DELETE', query: { site_id: `eq.${Number(id)}` } });
  await rest('audits', { method: 'DELETE', query: { site_id: `eq.${Number(id)}` } });
  await rest('sites', { method: 'DELETE', query: { id: `eq.${Number(id)}` } });
}

/* ----------------------------------------------------------------- events */

const EVENT_COLUMNS = [
  'site_id', 'ts', 'type', 'path', 'title', 'referrer', 'ref_domain', 'source',
  'channel', 'engine', 'query', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'country', 'region', 'city', 'device', 'browser',
  'os', 'screen', 'lang', 'visitor', 'session', 'bot', 'bot_name', 'duration',
  'scroll', 'props',
];

const RANGE_COLUMNS = EVENT_COLUMNS.filter((c) => c !== 'site_id').join(',');

function cleanRow(ev) {
  const row = {};
  for (const col of EVENT_COLUMNS) row[col] = ev[col] === undefined ? null : ev[col];
  return row;
}

async function insertEvent(ev) {
  const { data } = await rest('events', {
    method: 'POST',
    body: [cleanRow(ev)],
    prefer: 'return=minimal',
  });
  return data;
}

async function insertEvents(list) {
  let inserted = 0;
  for (let i = 0; i < list.length; i += INSERT_CHUNK) {
    const chunk = list.slice(i, i + INSERT_CHUNK).map(cleanRow);
    await rest('events', { method: 'POST', body: chunk, prefer: 'return=minimal', timeout: 45000 });
    inserted += chunk.length;
  }
  return inserted;
}

async function rangeEvents(siteId, from, to, { includeBots = false } = {}) {
  const out = [];
  let offset = 0;

  while (out.length < MAX_ROWS) {
    // PostgREST accepts repeated params, so the ts range is built by hand:
    // ts=gte.<from>&ts=lt.<to>
    const qs =
      `select=${encodeURIComponent(RANGE_COLUMNS)}` +
      `&site_id=eq.${Number(siteId)}` +
      `&ts=gte.${Math.floor(from)}&ts=lt.${Math.floor(to)}` +
      (includeBots ? '' : '&bot=eq.0') +
      `&order=ts.desc&limit=${PAGE_SIZE}&offset=${offset}`;

    const { data } = await rest('events', { query: qs });
    const rows = (data || []).map(normalizeEvent);
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return out;
}

async function recentEvents(siteId, limit = 40) {
  const { data } = await rest('events', {
    query: {
      select: '*',
      site_id: `eq.${Number(siteId)}`,
      bot: 'eq.0',
      order: 'ts.desc',
      limit: String(Math.min(limit, 500)),
    },
  });
  return (data || []).map(normalizeEvent);
}

async function countEvents(siteId) {
  const res = await rest('events', {
    method: 'HEAD',
    query: { select: 'id', site_id: `eq.${Number(siteId)}` },
    prefer: 'count=exact',
    raw: true,
  });
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

async function purgeOlderThan(days) {
  await rest('events', { method: 'DELETE', query: { ts: `lt.${Date.now() - days * 86400e3}` } });
}

async function clearSiteEvents(siteId) {
  await rest('events', { method: 'DELETE', query: { site_id: `eq.${Number(siteId)}` } });
}

/* ----------------------------------------------------------------- audits */

async function saveAudit(audit) {
  const { data } = await rest('audits', {
    method: 'POST',
    body: [
      {
        site_id: audit.siteId ?? null,
        url: audit.url,
        created_at: Date.now(),
        seo: audit.scores?.seo ?? 0,
        aeo: audit.scores?.aeo ?? 0,
        geo: audit.scores?.geo ?? 0,
        payload: audit,
      },
    ],
    prefer: 'return=representation',
  });
  return data && data[0];
}

async function latestAudit(siteId) {
  const { data } = await rest('audits', {
    query: { select: 'payload', site_id: `eq.${Number(siteId)}`, order: 'created_at.desc', limit: '1' },
  });
  const row = data && data[0];
  if (!row) return null;
  if (typeof row.payload === 'string') {
    try {
      return JSON.parse(row.payload);
    } catch {
      return null;
    }
  }
  return row.payload;
}

module.exports = {
  mode: 'supabase',
  normalizeDomain,
  listSites,
  getSiteByKey,
  getSiteById,
  getSiteByDomain,
  upsertSite,
  deleteSite,
  insertEvent,
  insertEvents,
  rangeEvents,
  recentEvents,
  countEvents,
  purgeOlderThan,
  clearSiteEvents,
  saveAudit,
  latestAudit,
  _rest: rest,
};
