'use strict';

/**
 * Supabase Storage — report and export artifacts.
 *
 * Exports are written to the `exports` bucket and handed back as a short-lived
 * signed URL, so the dashboard can offer a download without making the bucket
 * public and without streaming large CSVs through the Node process twice.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const enabled = Boolean(SUPABASE_URL && SERVICE_KEY);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'exports';

const bucketsEnsured = new Set();

async function call(path, { method = 'POST', body, headers = {}, timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        ...headers,
      },
      body,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `Storage ${method} ${path} failed (${res.status})`);
      err.status = res.status;
      err.details = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureBucket(bucket = BUCKET) {
  if (bucketsEnsured.has(bucket)) return;
  try {
    await call('/storage/v1/bucket', {
      body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 52428800 }),
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // 400/409 = already exists, which is the normal path.
    if (![400, 409].includes(err.status)) throw err;
  }
  bucketsEnsured.add(bucket);
}

/**
 * Upload a file and return { path, signedUrl, expiresAt }.
 */
async function upload(name, content, contentType = 'text/csv', bucket = BUCKET) {
  if (!enabled) return null;
  await ensureBucket(bucket);

  const safeName = String(name).replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`;

  await call(`/storage/v1/object/${bucket}/${path}`, {
    body: content,
    headers: {
      'content-type': contentType,
      'x-upsert': 'true',
      'cache-control': 'private, max-age=0',
    },
  });

  const expiresIn = 60 * 60 * 24;
  const signed = await call(`/storage/v1/object/sign/${bucket}/${path}`, {
    body: JSON.stringify({ expiresIn }),
    headers: { 'content-type': 'application/json' },
  });

  const signedPath = signed?.signedURL || signed?.signedUrl || '';
  return {
    bucket,
    path,
    signedUrl: signedPath ? `${SUPABASE_URL}/storage/v1${signedPath}` : null,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

module.exports = { enabled, upload, ensureBucket, BUCKET };
