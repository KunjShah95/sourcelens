'use strict';

/**
 * Server-side secret used to salt the daily visitor hash.
 *
 * Order of preference:
 *   1. SOURCELENS_SALT env var  (recommended in production)
 *   2. a value derived from the Supabase service key (stable per project,
 *      so multiple instances/instances-on-restart agree)
 *   3. a generated file in the data dir (local SQLite mode)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let cached = null;

function getSecret() {
  if (cached) return cached;

  if (process.env.SOURCELENS_SALT) {
    cached = process.env.SOURCELENS_SALT;
    return cached;
  }

  if (process.env.SUPABASE_SERVICE_KEY) {
    cached = crypto
      .createHash('sha256')
      .update('sourcelens:' + process.env.SUPABASE_SERVICE_KEY)
      .digest('hex');
    return cached;
  }

  const dir = process.env.SOURCELENS_DATA_DIR
    ? path.resolve(process.env.SOURCELENS_DATA_DIR)
    : path.join(__dirname, '..', 'data');
  const file = path.join(dir, 'secret.key');

  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing) {
      cached = existing;
      return cached;
    }
  } catch {
    /* not created yet */
  }

  fs.mkdirSync(dir, { recursive: true });
  cached = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, cached, { mode: 0o600 });
  return cached;
}

module.exports = { getSecret };
