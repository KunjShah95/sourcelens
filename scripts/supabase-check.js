'use strict';

/**
 * Supabase preflight. Run after adding credentials:
 *
 *   npm run supabase:check
 *
 * It reads .env when present, then verifies the tables, RPC, storage bucket
 * and Auth endpoint the app depends on. It never prints secret values.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const service = process.env.SUPABASE_SERVICE_KEY || '';
const anon = process.env.SUPABASE_ANON_KEY || '';

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(30)} ${detail}`);
}

async function request(label, pathname, headers, method = 'GET', body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${url}${pathname}`, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { res, data };
  } catch (err) {
    record(label, false, err.name === 'AbortError' ? 'request timed out' : err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  console.log('\nSourceLens — Supabase preflight\n');

  if (!url || !service || !anon) {
    record('Credentials', false, 'set SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY');
    console.log('\nCopy .env.example to .env, fill the three values, then re-run this command.\n');
    process.exit(1);
  }
  record('Credentials', true, `${new URL(url).host} · keys present (hidden)`);

  const admin = { apikey: service, authorization: `Bearer ${service}` };
  const publicKey = { apikey: anon, authorization: `Bearer ${anon}` };

  for (const table of ['sites', 'events', 'audits']) {
    const out = await request(`Table: ${table}`, `/rest/v1/${table}?select=id&limit=1`, admin);
    if (!out) continue;
    record(`Table: ${table}`, out.res.ok, out.res.ok ? 'reachable' : `${out.res.status} ${out.data?.message || ''}`.trim());
  }

  const rpc = await request('RPC: site_overview', '/rest/v1/rpc/site_overview', admin, 'POST', { p_owner: null });
  if (rpc) record('RPC: site_overview', rpc.res.ok, rpc.res.ok ? `${Array.isArray(rpc.data) ? rpc.data.length : 0} site row(s)` : `${rpc.res.status} ${rpc.data?.message || ''}`.trim());

  const bucket = await request('Storage: exports', '/storage/v1/bucket/exports', admin);
  if (bucket) record('Storage: exports', bucket.res.ok, bucket.res.ok ? 'private bucket exists' : `${bucket.res.status} ${bucket.data?.message || ''}`.trim());

  const auth = await request('Auth endpoint', '/auth/v1/settings', publicKey);
  if (auth) {
    const enabled = Boolean(auth.data?.external_email_enabled ?? auth.data?.disable_signup === false);
    record('Auth endpoint', auth.res.ok, auth.res.ok ? `reachable${enabled ? ' · email enabled' : ''}` : `${auth.res.status} ${auth.data?.message || ''}`.trim());
  }

  const locked = await request('RLS: anon blocked', '/rest/v1/events?select=id&limit=1', publicKey);
  if (locked) {
    const blocked = locked.res.status === 401 || locked.res.status === 403 || (Array.isArray(locked.data) && locked.data.length === 0);
    record('RLS: anon blocked', blocked, blocked ? 'no direct client reads' : 'WARNING: anon can read events — check RLS policies');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log('Apply supabase/schema.sql in the SQL Editor, confirm the keys, then re-run.\n');
    process.exit(1);
  }
  console.log('Supabase is ready. Start the API and open the dashboard.\n');
})();
