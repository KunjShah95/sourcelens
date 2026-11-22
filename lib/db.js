'use strict';

/**
 * Store facade.
 *
 * Supabase is the production backend; SQLite is the zero-config local fallback.
 * Both expose the same async interface, so the rest of the app never branches
 * on which one is active.
 */

const isSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

let store;
if (isSupabase) {
  store = require('./store/supabase');
} else {
  store = require('./store/sqlite');
}

module.exports = {
  ...store,
  isSupabase,
  mode: store.mode,
};
