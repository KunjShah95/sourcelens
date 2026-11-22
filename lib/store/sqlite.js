'use strict';

/**
 * SQLite store — the zero-config local backend.
 * Same interface as the Supabase store so the rest of the app is agnostic.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  throw new Error(
    'node:sqlite is unavailable. Start with `npm start` (passes --experimental-sqlite) ' +
      'or set SUPABASE_URL + SUPABASE_SERVICE_KEY to use Supabase instead.'
  );
}

const DATA_DIR = process.env.SOURCELENS_DATA_DIR
  ? path.resolve(process.env.SOURCELENS_DATA_DIR)
  : path.join(__dirname, '..', '..', 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'sourcelens.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    "key"       TEXT    NOT NULL UNIQUE,
    owner_id    TEXT,
    timezone    TEXT,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id     INTEGER NOT NULL,
    ts          INTEGER NOT NULL,
    type        TEXT    NOT NULL,
    path        TEXT    NOT NULL,
    title       TEXT,
    referrer    TEXT,
    ref_domain  TEXT,
    source      TEXT,
    channel     TEXT,
    engine      TEXT,
    query       TEXT,
    utm_source  TEXT,
    utm_medium  TEXT,
    utm_campaign TEXT,
    utm_term    TEXT,
    utm_content TEXT,
    country     TEXT,
    region      TEXT,
    city        TEXT,
    device      TEXT,
    browser     TEXT,
    os          TEXT,
    screen      TEXT,
    lang        TEXT,
    visitor     TEXT,
    session     TEXT,
    bot         INTEGER NOT NULL DEFAULT 0,
    bot_name    TEXT,
    duration    INTEGER NOT NULL DEFAULT 0,
    scroll      INTEGER NOT NULL DEFAULT 0,
    props       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_site_ts   ON events(site_id, ts);
  CREATE INDEX IF NOT EXISTS idx_events_session   ON events(session, ts);
  CREATE INDEX IF NOT EXISTS idx_events_channel   ON events(site_id, channel, ts);
  CREATE INDEX IF NOT EXISTS idx_events_visitor   ON events(site_id, visitor, ts);

  CREATE TABLE IF NOT EXISTS audits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id     INTEGER,
    url         TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    seo         INTEGER NOT NULL DEFAULT 0,
    aeo         INTEGER NOT NULL DEFAULT 0,
    geo         INTEGER NOT NULL DEFAULT 0,
    payload     TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audits_site ON audits(site_id, created_at);
`);

/* ---------------------------------------------------------------- helpers */

const all = (sql, params = []) => db.prepare(sql).all(...params).map((r) => ({ ...r }));
const get = (sql, params = []) => {
  const row = db.prepare(sql).get(...params);
  return row ? { ...row } : undefined;
};
const run = (sql, params = []) => db.prepare(sql).run(...params);

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

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

/* ------------------------------------------------------------------ sites */

function listSites(ownerId) {
  const rows = ownerId
    ? all(
        `SELECT s.*, (SELECT COUNT(*) FROM events e WHERE e.site_id = s.id AND e.bot = 0) AS events,
                (SELECT MAX(ts) FROM events e WHERE e.site_id = s.id) AS last_seen
           FROM sites s WHERE s.owner_id = ? ORDER BY s.created_at ASC`,
        [ownerId]
      )
    : all(
        `SELECT s.*, (SELECT COUNT(*) FROM events e WHERE e.site_id = s.id AND e.bot = 0) AS events,
                (SELECT MAX(ts) FROM events e WHERE e.site_id = s.id) AS last_seen
           FROM sites s ORDER BY s.created_at ASC`
      );
  return rows.map((r) => ({ ...r, key: r.key }));
}

const getSiteByKey = (key) => get('SELECT * FROM sites WHERE "key" = ?', [key]);
const getSiteById = (id) => get('SELECT * FROM sites WHERE id = ?', [Number(id)]);
const getSiteByDomain = (domain) => get('SELECT * FROM sites WHERE domain = ?', [normalizeDomain(domain)]);

function upsertSite({ domain, name, timezone, ownerId }) {
  const normalized = normalizeDomain(domain);
  if (!normalized) throw new Error('A domain is required');
  const existing = getSiteByDomain(normalized);
  if (existing) {
    if (ownerId && !existing.owner_id) {
      run('UPDATE sites SET owner_id = ? WHERE id = ?', [ownerId, existing.id]);
      return getSiteById(existing.id);
    }
    if (name && name !== existing.name) {
      run('UPDATE sites SET name = ? WHERE id = ?', [name, existing.id]);
      return getSiteById(existing.id);
    }
    return existing;
  }
  run(
    'INSERT INTO sites (domain, name, "key", owner_id, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [normalized, name || normalized, makeKey(normalized), ownerId || null, timezone || null, Date.now()]
  );
  return getSiteByDomain(normalized);
}

function deleteSite(id) {
  run('DELETE FROM events WHERE site_id = ?', [Number(id)]);
  run('DELETE FROM audits WHERE site_id = ?', [Number(id)]);
  run('DELETE FROM sites WHERE id = ?', [Number(id)]);
}

/* ----------------------------------------------------------------- events */

const EVENT_COLUMNS = [
  'site_id', 'ts', 'type', 'path', 'title', 'referrer', 'ref_domain', 'source',
  'channel', 'engine', 'query', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'country', 'region', 'city', 'device', 'browser',
  'os', 'screen', 'lang', 'visitor', 'session', 'bot', 'bot_name', 'duration',
  'scroll', 'props',
];

const INSERT_SQL = `INSERT INTO events (${EVENT_COLUMNS.map((c) => `"${c}"`).join(', ')})
  VALUES (${EVENT_COLUMNS.map(() => '?').join(', ')})`;

function insertEvent(ev) {
  return run(INSERT_SQL, EVENT_COLUMNS.map((c) => (ev[c] === undefined ? null : ev[c])));
}

function insertEvents(list) {
  return transaction(() => {
    const stmt = db.prepare(INSERT_SQL);
    for (const ev of list) stmt.run(...EVENT_COLUMNS.map((c) => (ev[c] === undefined ? null : ev[c])));
    return list.length;
  });
}

const RANGE_COLUMNS = `ts, type, path, title, referrer, ref_domain, source, channel, engine,
  query, utm_source, utm_medium, utm_campaign, country, region, city, device,
  browser, os, screen, lang, visitor, session, bot, bot_name, duration, scroll, props`;

function rangeEvents(siteId, from, to, { includeBots = false } = {}) {
  return all(
    `SELECT ${RANGE_COLUMNS} FROM events
      WHERE site_id = ? AND ts >= ? AND ts < ? ${includeBots ? '' : 'AND bot = 0'}
      ORDER BY ts DESC`,
    [Number(siteId), from, to]
  );
}

const recentEvents = (siteId, limit = 40) =>
  all('SELECT * FROM events WHERE site_id = ? AND bot = 0 ORDER BY ts DESC LIMIT ?', [Number(siteId), limit]);

const countEvents = (siteId) =>
  get('SELECT COUNT(*) AS n FROM events WHERE site_id = ?', [Number(siteId)])?.n ?? 0;

const purgeOlderThan = (days) => run('DELETE FROM events WHERE ts < ?', [Date.now() - days * 86400e3]);

const clearSiteEvents = (siteId) => run('DELETE FROM events WHERE site_id = ?', [Number(siteId)]);

/* ----------------------------------------------------------------- audits */

function saveAudit(audit) {
  run(
    'INSERT INTO audits (site_id, url, created_at, seo, aeo, geo, payload) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      audit.siteId ?? null,
      audit.url,
      Date.now(),
      audit.scores?.seo ?? 0,
      audit.scores?.aeo ?? 0,
      audit.scores?.geo ?? 0,
      JSON.stringify(audit),
    ]
  );
  return get('SELECT * FROM audits ORDER BY id DESC LIMIT 1');
}

function latestAudit(siteId) {
  const row = get('SELECT * FROM audits WHERE site_id = ? ORDER BY created_at DESC LIMIT 1', [Number(siteId)]);
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

module.exports = {
  mode: 'sqlite',
  DATA_DIR,
  all,
  get,
  run,
  transaction,
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
};
