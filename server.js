'use strict';

/**
 * SourceLens server.
 *
 * Zero npm dependencies: Node's http server, node:sqlite (local mode) or
 * Supabase over fetch (production mode).
 */

/* Re-exec with the SQLite flag when it is needed and missing, so plain
 * `node server.js` works in local mode. Supabase mode needs no flag. */
const NEEDS_SQLITE_FLAG = !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
if (NEEDS_SQLITE_FLAG && !process.execArgv.includes('--experimental-sqlite') && !process.env.SOURCELENS_REEXEC) {
  const { spawnSync } = require('node:child_process');
  const res = spawnSync(
    process.execPath,
    ['--experimental-sqlite', '--no-warnings', __filename, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, SOURCELENS_REEXEC: '1' } }
  );
  process.exit(res.status ?? 0);
}

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const db = require('./lib/db');
const stats = require('./lib/stats');
const ingest = require('./lib/ingest');
const auth = require('./lib/auth');
const storage = require('./lib/storage');
const auditLib = require('./lib/audit');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = '1.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ALLOW_AUTO_SITE = process.env.ALLOW_AUTO_SITE === 'true' || !db.isSupabase;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/* ------------------------------------------------------------------ utils */

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      let buf = Buffer.concat(chunks);
      const enc = String(req.headers['content-encoding'] || '').toLowerCase();
      try {
        if (enc === 'gzip') buf = zlib.gunzipSync(buf);
        else if (enc === 'deflate') buf = zlib.inflateSync(buf);
        else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
      } catch {
        return resolve({});
      }
      if (!buf.length) return resolve({});
      try {
        resolve(JSON.parse(buf.toString('utf8')));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const raw =
    (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket?.remoteAddress ||
    '';
  return String(raw).replace(/^::ffff:/, '');
}

/* ------------------------------------------------------------- rate limit */

const buckets = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  return b.count <= max;
}

/* ------------------------------------------------------------------ static */

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, normalized);
  return full.startsWith(root) ? full : null;
}

function serveFile(req, res, filePath, { cache = 300, cors = false } = {}) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return sendText(res, 404, 'Not found');

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isText = /text|javascript|json|svg|xml/.test(type);
    const etag = `W/"${stat.size}-${stat.mtimeMs.toString(36)}"`;

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { etag });
      return res.end();
    }

    const headers = {
      'content-type': type,
      etag,
      'cache-control': cache > 0 ? `public, max-age=${cache}` : 'no-cache',
      'x-content-type-options': 'nosniff',
    };
    if (cors) {
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
      headers['access-control-allow-headers'] = 'content-type';
    }

    const accept = String(req.headers['accept-encoding'] || '');
    if (isText && stat.size > 1024 && /\bgzip\b/.test(accept)) {
      headers['content-encoding'] = 'gzip';
      headers['vary'] = 'accept-encoding';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
      return;
    }

    headers['content-length'] = stat.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------------------------------------------- auth */

const PUBLIC_API = new Set([
  '/api/health',
  '/api/collect',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/me',
]);

async function authenticate(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (PUBLIC_API.has(pathname)) return { user: null, public: true };

  if (ADMIN_TOKEN) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
    if (token && token === ADMIN_TOKEN) return { user: { id: 'admin', email: 'admin', name: 'API token' }, public: false };
  }

  const result = await auth.session(req);
  if (result.setCookies?.length) res.setHeader('set-cookie', result.setCookies);
  if (!result.user) return { user: null, public: false };
  return { user: result.user, public: false };
}

async function requireSite(siteId, user) {
  const site = await db.getSiteById(siteId);
  if (!site) return { error: { status: 404, message: 'Site not found' } };
  if (db.isSupabase && site.owner_id && user?.id && site.owner_id !== user.id) {
    return { error: { status: 403, message: 'You do not have access to this site' } };
  }
  return { site };
}

/* ------------------------------------------------------------------ routes */

async function handleApi(req, res, url) {
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method;

  /* ------------------------------------------------------------ health */
  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      version: VERSION,
      store: db.mode,
      auth: auth.enabled,
      storage: storage.enabled,
      uptime: Math.round(process.uptime()),
    });
  }

  /* ----------------------------------------------------------- collect */
  if (pathname === '/api/collect') {
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': CORS_ORIGIN,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      });
      return res.end();
    }
    if (method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    if (!rateLimit('collect:' + clientIp(req), 240, 60_000)) {
      return sendJson(res, 429, { error: 'Too many events' }, { 'access-control-allow-origin': CORS_ORIGIN });
    }

    const body = await readBody(req, 64 * 1024);
    if (!body || (!body.site && !body.domain && !body.host)) {
      return sendJson(res, 400, { error: 'Missing site key or domain' }, { 'access-control-allow-origin': CORS_ORIGIN });
    }

    if (db.isSupabase && !ALLOW_AUTO_SITE && !body.site) {
      const existing = await db.getSiteByDomain(body.domain || body.host);
      if (!existing) {
        return sendJson(res, 403, { error: 'site_not_registered' }, { 'access-control-allow-origin': CORS_ORIGIN });
      }
    }

    try {
      const result = await ingest.ingest(body, req);
      if (!result.ok) {
        return sendJson(res, 202, { ok: false, skipped: result.reason }, { 'access-control-allow-origin': CORS_ORIGIN });
      }
      res.writeHead(204, {
        'access-control-allow-origin': CORS_ORIGIN,
        'access-control-allow-headers': 'content-type',
        'cache-control': 'no-store',
      });
      return res.end();
    } catch (err) {
      log('collect error:', err.message);
      return sendJson(res, 500, { error: 'Ingest failed' }, { 'access-control-allow-origin': CORS_ORIGIN });
    }
  }

  /* ---------------------------------------------- public live counter */
  if (pathname === '/api/public/live' && method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return sendJson(res, 400, { error: 'A site key is required' });
    if (!rateLimit('live:' + clientIp(req), 120, 60_000)) {
      return sendJson(res, 429, { error: 'Too many requests' }, { 'access-control-allow-origin': '*' });
    }
    const site = await db.getSiteByKey(key);
    if (!site) return sendJson(res, 404, { error: 'Unknown site key' }, { 'access-control-allow-origin': '*' });
    const rt = await stats.realtime(site.id);
    return sendJson(
      res,
      200,
      { active: rt.active, pageviews: rt.pageviews, perMinute: rt.perMinute },
      { 'access-control-allow-origin': '*', 'cache-control': 'no-store' }
    );
  }

  /* -------------------------------------------------------------- auth */
  if (pathname === '/api/auth/me') {
    const result = await auth.session(req);
    if (result.setCookies?.length) res.setHeader('set-cookie', result.setCookies);
    return sendJson(res, 200, {
      authenticated: Boolean(result.user),
      user: result.user,
      authEnabled: auth.enabled,
      mode: db.mode,
    });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    if (!rateLimit('login:' + clientIp(req), 20, 60_000)) {
      return sendJson(res, 429, { error: 'Too many attempts. Try again in a minute.' });
    }
    const body = await readBody(req, 8 * 1024);
    if (!body.email || !body.password) return sendJson(res, 400, { error: 'Email and password are required' });
    try {
      const tokens = await auth.login(String(body.email).trim(), String(body.password));
      res.setHeader('set-cookie', auth.sessionCookies(tokens));
      return sendJson(res, 200, { ok: true, user: tokens.user });
    } catch (err) {
      return sendJson(res, 401, { error: err.message || 'Invalid credentials' });
    }
  }

  if (pathname === '/api/auth/signup' && method === 'POST') {
    if (!rateLimit('signup:' + clientIp(req), 10, 60_000)) {
      return sendJson(res, 429, { error: 'Too many attempts. Try again in a minute.' });
    }
    const body = await readBody(req, 8 * 1024);
    if (!body.email || !body.password) return sendJson(res, 400, { error: 'Email and password are required' });
    if (String(body.password).length < 8) return sendJson(res, 400, { error: 'Use at least 8 characters' });
    try {
      const result = await auth.signup(String(body.email).trim(), String(body.password));
      if (result.needsConfirmation) {
        return sendJson(res, 200, { ok: true, needsConfirmation: true });
      }
      res.setHeader('set-cookie', auth.sessionCookies(result));
      return sendJson(res, 200, { ok: true, user: result.user });
    } catch (err) {
      return sendJson(res, 400, { error: err.message || 'Sign up failed' });
    }
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    res.setHeader('set-cookie', auth.logoutCookies());
    return sendJson(res, 200, { ok: true });
  }

  /* ------------------------------------------------------------- sites */
  const ctx = await authenticate(req, res);
  if (!ctx.public && !ctx.user) return sendJson(res, 401, { error: 'Not authenticated' });
  const user = ctx.user;

  if (pathname === '/api/sites' && method === 'GET') {
    const sites = await db.listSites(db.isSupabase ? user.id : null);
    return sendJson(res, 200, { sites });
  }

  if (pathname === '/api/sites' && method === 'POST') {
    const body = await readBody(req, 16 * 1024);
    if (!body.domain) return sendJson(res, 400, { error: 'A domain is required' });
    try {
      const site = await db.upsertSite({
        domain: body.domain,
        name: body.name || body.domain,
        ownerId: db.isSupabase ? user.id : null,
      });
      return sendJson(res, 200, { site });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const siteDelete = pathname.match(/^\/api\/sites\/(\d+)$/);
  if (siteDelete && method === 'DELETE') {
    const { site, error } = await requireSite(Number(siteDelete[1]), user);
    if (error) return sendJson(res, error.status, { error: error.message });
    await db.deleteSite(site.id);
    return sendJson(res, 200, { ok: true });
  }

  /* ------------------------------------------------------------- stats */
  if (pathname === '/api/stats' && method === 'GET') {
    const siteId = Number(url.searchParams.get('site'));
    if (!siteId) return sendJson(res, 400, { error: 'A site is required' });
    const { site, error } = await requireSite(siteId, user);
    if (error) return sendJson(res, error.status, { error: error.message });

    const range = url.searchParams.get('range') || '7d';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const payload = await stats.dashboard(site.id, {
      range,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
    });
    return sendJson(res, 200, { site, ...payload });
  }

  if (pathname === '/api/stats/realtime' && method === 'GET') {
    const siteId = Number(url.searchParams.get('site'));
    if (!siteId) return sendJson(res, 400, { error: 'A site is required' });
    const { site, error } = await requireSite(siteId, user);
    if (error) return sendJson(res, error.status, { error: error.message });
    return sendJson(res, 200, { realtime: await stats.realtime(site.id) });
  }

  /* ----------------------------------------------------------- audits */
  if (pathname === '/api/audit' && method === 'GET') {
    const target = url.searchParams.get('url');
    const siteId = Number(url.searchParams.get('site')) || null;
    if (!target) return sendJson(res, 400, { error: 'A url is required' });

    if (!rateLimit('audit:' + clientIp(req), 12, 60_000)) {
      return sendJson(res, 429, { error: 'Slow down — 12 audits per minute max.' });
    }

    try {
      const result = await auditLib.auditSite(target);
      if (result.ok && siteId) {
        await db.saveAudit({ ...result, siteId });
      }
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/audit/latest' && method === 'GET') {
    const siteId = Number(url.searchParams.get('site'));
    if (!siteId) return sendJson(res, 400, { error: 'A site is required' });
    const { site, error } = await requireSite(siteId, user);
    if (error) return sendJson(res, error.status, { error: error.message });
    const latest = await db.latestAudit(site.id);
    return sendJson(res, 200, { audit: latest });
  }

  /* --------------------------------------------------------- llms.txt */
  if (pathname === '/api/llms-txt' && method === 'GET') {
    const siteId = Number(url.searchParams.get('site'));
    const { site, error } = await requireSite(siteId, user);
    if (error) return sendJson(res, error.status, { error: error.message });

    const data = await stats.dashboard(site.id, { range: '30d' });
    const pages = data.pages.slice(0, 20).map((p) => ({ path: p.path, title: p.title || p.path }));
    const text = auditLib.buildLlmsTxt({
      name: site.name,
      domain: site.domain,
      description: `${site.name} — official site. Key pages, products and documentation.`,
      pages,
    });
    return sendText(res, 200, text, {
      'content-disposition': `attachment; filename="llms.txt"`,
      'cache-control': 'no-store',
    });
  }

  /* ----------------------------------------------------------- export */
  if (pathname === '/api/export' && method === 'GET') {
    const siteId = Number(url.searchParams.get('site'));
    const { site, error } = await requireSite(siteId, user);
    if (error) return sendJson(res, error.status, { error: error.message });

    const range = url.searchParams.get('range') || '30d';
    const csv = await stats.toCsv(site.id, { range });
    const filename = `${site.domain}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (storage.enabled) {
      try {
        const uploaded = await storage.upload(filename, csv, 'text/csv');
        if (uploaded?.signedUrl) {
          return sendJson(res, 200, { ok: true, ...uploaded, rows: csv.split('\n').length - 1 });
        }
      } catch (err) {
        log('storage upload failed, falling back to direct download:', err.message);
      }
    }

    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    });
    return res.end(csv);
  }

  /* ------------------------------------------------------------- demo */
  if (pathname === '/api/demo/seed' && method === 'POST') {
    const { seedDemo } = require('./lib/seed');
    const result = await seedDemo();
    return sendJson(res, 200, { ok: true, ...result });
  }

  /* ------------------------------------------------------------ cleanup */
  if (pathname === '/api/maintenance/purge' && method === 'POST') {
    const body = await readBody(req, 4 * 1024);
    const days = Math.max(1, Number(body.days) || 90);
    await db.purgeOlderThan(days);
    return sendJson(res, 200, { ok: true, days });
  }

  return sendJson(res, 404, { error: 'Unknown endpoint' });
}

/* ------------------------------------------------------------------- boot */

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  res.setHeader('x-powered-by', 'SourceLens');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
  if (!pathname.startsWith('/embed')) {
    res.setHeader('x-frame-options', 'SAMEORIGIN');
  }

  try {
    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendText(res, 405, 'Method not allowed');
    }

    /* tracker — embeddable on any origin */
    if (pathname === '/t.js' || pathname === '/tracker.js') {
      return serveFile(req, res, path.join(PUBLIC_DIR, 'tracker.js'), { cache: 300, cors: true });
    }

    if (pathname === '/embed' || pathname === '/embed/') {
      return serveFile(req, res, path.join(PUBLIC_DIR, 'embed.html'), { cache: 0 });
    }

    if (pathname === '/' || pathname === '/login' || pathname === '/app') {
      return serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'), { cache: 0 });
    }

    const filePath = safeJoin(PUBLIC_DIR, pathname);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(req, res, filePath, { cache: 3600 });
    }

    // SPA fallback for anything that is not an asset request
    if (!path.extname(pathname)) {
      return serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'), { cache: 0 });
    }

    return sendText(res, 404, 'Not found');
  } catch (err) {
    log('unhandled error:', err.stack || err.message);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.message || 'Internal error' });
    else res.end();
  } finally {
    if (process.env.SOURCELENS_LOG !== 'off' && pathname.startsWith('/api/')) {
      log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
});

server.headersTimeout = 65_000;
server.requestTimeout = 120_000;

server.listen(PORT, HOST, () => {
  log(`SourceLens ${VERSION} listening on http://${HOST}:${PORT}`);
  log(`store: ${db.mode}${db.isSupabase ? ' (Supabase)' : ' (local SQLite)'} · auth: ${auth.enabled ? 'Supabase' : 'open (local)'} · storage: ${storage.enabled ? 'Supabase' : 'off'}`);
  if (!db.isSupabase) log('Local mode. Set SUPABASE_URL + SUPABASE_SERVICE_KEY + SUPABASE_ANON_KEY to run on Supabase.');
});

function shutdown(signal) {
  log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log('unhandledRejection:', err?.stack || err));
