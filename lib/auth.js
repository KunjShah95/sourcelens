'use strict';

/**
 * Supabase Auth integration.
 *
 * The browser never talks to Supabase directly: login goes through this
 * server, and the resulting tokens live in httpOnly cookies. Every API request
 * is verified against Supabase's /auth/v1/user endpoint (with a short-lived
 * in-memory cache so we do not call it on every asset request).
 */

const crypto = require('node:crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';

const enabled = Boolean(SUPABASE_URL && ANON_KEY && !AUTH_DISABLED);

const ACCESS_COOKIE = 'sl_at';
const REFRESH_COOKIE = 'sl_rt';
const MAX_AGE = 60 * 60 * 24 * 30;

/* --------------------------------------------------------------- utilities */

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
}

const userCache = new Map(); // hash -> { user, expires }

function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function cookie(name, value, { maxAge = MAX_AGE, secure = true, sameSite = 'Lax' } = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', `SameSite=${sameSite}`];
  if (maxAge !== null) bits.push(`Max-Age=${maxAge}`);
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

function clearCookie(name, { secure = true } = {}) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

async function authFetch(path, { method = 'GET', body, token, apikey = ANON_KEY, timeout = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method,
      signal: controller.signal,
      headers: {
        apikey: apikey || SERVICE_KEY,
        authorization: `Bearer ${token || apikey || SERVICE_KEY}`,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }
    if (!res.ok) {
      const err = new Error(
        data?.error_description || data?.msg || data?.message || `Auth failed (${res.status})`
      );
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------- flows */

async function login(email, password) {
  if (!enabled) throw new Error('Auth is not configured');
  const data = await authFetch('token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: normalizeUser(data.user),
  };
}

async function signup(email, password) {
  if (!enabled) throw new Error('Auth is not configured');
  const data = await authFetch('signup', { method: 'POST', body: { email, password } });
  return {
    user: data.user ? normalizeUser(data.user) : null,
    needsConfirmation: !data.access_token,
    accessToken: data.access_token || null,
    refreshToken: data.refresh_token || null,
  };
}

async function refresh(refreshToken) {
  const data = await authFetch('token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: normalizeUser(data.user),
  };
}

async function fetchUser(accessToken) {
  const key = hash(accessToken);
  const cached = userCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.user;

  const user = normalizeUser(await authFetch('user', { token: accessToken }));
  userCache.set(key, { user, expires: Date.now() + 60_000 });
  if (userCache.size > 500) {
    for (const [k, v] of userCache) if (v.expires < Date.now()) userCache.delete(k);
  }
  return user;
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || (user.email || '').split('@')[0],
    avatar: user.user_metadata?.avatar_url || null,
    createdAt: user.created_at,
    lastSignIn: user.last_sign_in_at,
  };
}

/**
 * Resolve the current session for a request.
 * @returns {Promise<{user: object|null, setCookies: string[], clear: boolean}>}
 */
async function session(req) {
  if (!enabled) return { user: { id: 'local', email: 'local@sourcelens', name: 'Local admin', local: true }, setCookies: [], clear: false };

  const cookies = parseCookies(req.headers.cookie);
  let accessToken = cookies[ACCESS_COOKIE];
  let refreshToken = cookies[REFRESH_COOKIE];
  const setCookies = [];

  // Bearer token support for API clients / CI.
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) accessToken = authHeader.slice(7).trim();

  const payload = accessToken ? decodeJwt(accessToken) : null;
  const expired = payload?.exp ? payload.exp * 1000 < Date.now() + 30_000 : false;

  if ((!accessToken || expired) && refreshToken) {
    try {
      const next = await refresh(refreshToken);
      accessToken = next.accessToken;
      refreshToken = next.refreshToken;
      setCookies.push(cookie(ACCESS_COOKIE, accessToken));
      setCookies.push(cookie(REFRESH_COOKIE, refreshToken));
    } catch {
      return { user: null, setCookies: [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)], clear: true };
    }
  }

  if (!accessToken) return { user: null, setCookies, clear: false };

  try {
    const user = await fetchUser(accessToken);
    return { user, setCookies, clear: false };
  } catch {
    if (refreshToken) {
      try {
        const next = await refresh(refreshToken);
        const user = await fetchUser(next.accessToken);
        setCookies.push(cookie(ACCESS_COOKIE, next.accessToken));
        setCookies.push(cookie(REFRESH_COOKIE, next.refreshToken));
        return { user, setCookies, clear: false };
      } catch {
        /* fall through */
      }
    }
    return { user: null, setCookies: [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)], clear: true };
  }
}

function sessionCookies(tokens) {
  return [
    cookie(ACCESS_COOKIE, tokens.accessToken),
    cookie(REFRESH_COOKIE, tokens.refreshToken),
  ];
}

function logoutCookies() {
  return [clearCookie(ACCESS_COOKIE), clearCookie(REFRESH_COOKIE)];
}

module.exports = {
  enabled,
  login,
  signup,
  refresh,
  session,
  sessionCookies,
  logoutCookies,
  parseCookies,
  normalizeUser,
};
