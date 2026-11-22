'use strict';

/**
 * Drops local data. Refuses to touch a Supabase project — use the SQL editor
 * there instead (truncate public.events;).
 */

const fs = require('node:fs');
const path = require('node:path');

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  console.error('Supabase mode detected. This script only resets local SQLite data.');
  console.error('To reset Supabase: truncate table public.events, public.audits, public.sites cascade;');
  process.exit(1);
}

const dir = process.env.SOURCELENS_DATA_DIR
  ? path.resolve(process.env.SOURCELENS_DATA_DIR)
  : path.join(__dirname, '..', 'data');

if (fs.existsSync(dir)) {
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith('sourcelens.db')) {
      fs.rmSync(path.join(dir, file), { force: true });
      console.log('removed', file);
    }
  }
}
console.log('Local database reset.');
