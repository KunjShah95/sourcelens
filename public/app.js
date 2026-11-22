/* ==========================================================================
   SourceLens dashboard
   Vanilla JS, no build step. Renders server-aggregated data.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- helpers */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (value) =>
    String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const nf = new Intl.NumberFormat('en-US');

  const fmt = {
    num(v) {
      if (v === null || v === undefined || Number.isNaN(v)) return '—';
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (v >= 1e4) return Math.round(v / 1e3) + 'k';
      return nf.format(Math.round(v));
    },
    exact(v) {
      return nf.format(Math.round(v || 0));
    },
    pct(v, digits) {
      const d = digits === undefined ? 1 : digits;
      return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(/\.0+$/, '') + '%';
    },
    dur(seconds) {
      if (!seconds) return '0s';
      const s = Math.round(seconds);
      if (s < 60) return s + 's';
      const m = Math.floor(s / 60);
      const rest = s % 60;
      if (m < 60) return m + 'm' + (rest ? ' ' + rest + 's' : '');
      return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    },
    ago(ts) {
      const diff = Math.max(0, Date.now() - ts);
      if (diff < 60e3) return Math.floor(diff / 1000) + 's';
      if (diff < 3600e3) return Math.floor(diff / 60e3) + 'm';
      if (diff < 86400e3) return Math.floor(diff / 3600e3) + 'h';
      return Math.floor(diff / 86400e3) + 'd';
    },
    clock(ts) {
      return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    },
    date(ts) {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
    dateTime(ts) {
      return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
  };

  const CH_COLOR = {
    search: 'var(--search)', ai: 'var(--ai)', social: 'var(--social)',
    referral: 'var(--referral)', paid: 'var(--paid)', email: 'var(--email)',
    direct: 'var(--direct)', internal: 'var(--internal)',
  };
  const CH_LABEL = {
    search: 'Organic search', ai: 'AI assistants', social: 'Social',
    referral: 'Referral', paid: 'Paid', email: 'Email', direct: 'Direct', internal: 'Internal',
  };

  /* Channel colours live in CSS so both themes stay in sync. */
  const chColor = (channel, fallback) => CH_COLOR[channel] || fallback || 'var(--accent)';

  const RANGES = [
    ['24h', '24h'], ['7d', '7d'], ['30d', '30d'], ['90d', '90d'],
  ];

  /* --------------------------------------------------------------- state */

  const state = {
    user: null,
    authEnabled: false,
    mode: 'sqlite',
    sites: [],
    site: null,
    range: localStorage.getItem('sl-range') || '7d',
    route: 'overview',
    data: null,
    metric: 'pageviews',
    loading: false,
    chartQueue: [],
    pagesSort: { key: 'pageviews', dir: -1 },
    audit: null,
    auditRunning: false,
    auditFilter: 'issues',
    liveTimer: null,
    cache: new Map(),
  };

  /* ----------------------------------------------------------------- api */

  async function api(path, options) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      ...options,
    });
    if (res.status === 401) {
      showAuth();
      throw new Error('Not authenticated');
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* --------------------------------------------------------------- theme */

  function applyTheme(theme) {
    const next = theme || localStorage.getItem('sl-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sl-theme', next);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* --------------------------------------------------------------- toast */

  function toast(message, kind) {
    const node = document.createElement('div');
    node.className = 'toast ' + (kind || 'ok');
    node.innerHTML = icon(kind === 'err' ? 'alert' : 'check') + `<span>${esc(message)}</span>`;
    $('#toasts').appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 200);
    }, 3200);
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(label || 'Copied to clipboard');
    } catch (e) {
      toast('Copy failed — select and copy manually', 'err');
    }
  }

  /* --------------------------------------------------------------- modal */

  function openModal(title, bodyHtml, footHtml) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    $('#modal-foot').innerHTML = footHtml || '';
    $('#modal').hidden = false;
    const first = $('#modal-body input, #modal-body select, #modal-body textarea');
    if (first) setTimeout(() => first.focus(), 40);
  }

  function closeModal() {
    $('#modal').hidden = true;
  }

  /* ------------------------------------------------------------- palette */

  function paletteItems() {
    const items = [
      { group: 'Navigate', label: 'Overview', hint: 'G O', icon: 'grid', run: () => go('overview') },
      { group: 'Navigate', label: 'Sources', hint: 'G S', icon: 'source', run: () => go('sources') },
      { group: 'Navigate', label: 'Pages', hint: 'G P', icon: 'file', run: () => go('pages') },
      { group: 'Navigate', label: 'Audience', hint: 'G A', icon: 'globe', run: () => go('audience') },
      { group: 'Navigate', label: 'AI visibility', hint: 'G I', icon: 'sparkle', run: () => go('ai') },
      { group: 'Navigate', label: 'SEO audit', hint: 'G E', icon: 'search', run: () => go('seo') },
      { group: 'Navigate', label: 'Settings', hint: 'G ,', icon: 'settings', run: () => go('settings') },
      { group: 'Actions', label: 'Refresh data', icon: 'refresh', run: () => loadData(true) },
      { group: 'Actions', label: 'Export CSV', icon: 'download', run: exportCsv },
      { group: 'Actions', label: 'Toggle theme', icon: 'moon', run: toggleTheme },
      { group: 'Actions', label: 'Add a site', icon: 'plus', run: addSiteModal },
    ];
    for (const r of RANGES) {
      items.push({ group: 'Range', label: `Last ${r[0]}`, icon: 'clock', run: () => setRange(r[0]) });
    }
    for (const s of state.sites) {
      items.push({ group: 'Sites', label: s.name, hint: s.domain, icon: 'layers', run: () => selectSite(s.id) });
    }
    return items;
  }

  function openPalette() {
    $('#palette').hidden = false;
    const input = $('#palette-input');
    input.value = '';
    renderPalette('');
    setTimeout(() => input.focus(), 30);
  }

  function closePalette() {
    $('#palette').hidden = true;
  }

  function renderPalette(query) {
    const q = query.trim().toLowerCase();
    const items = paletteItems().filter((i) => !q || i.label.toLowerCase().includes(q) || (i.hint || '').toLowerCase().includes(q));
    let lastGroup = '';
    $('#palette-list').innerHTML = items.length
      ? items.map((item, index) => {
          const group = item.group !== lastGroup ? `<div class="palette-group">${esc(item.group)}</div>` : '';
          lastGroup = item.group;
          return `${group}<button class="palette-item${index === 0 ? ' active' : ''}" data-palette-index="${index}">
            ${icon(item.icon)}<span>${esc(item.label)}</span>
            ${item.hint ? `<span class="meta">${esc(item.hint)}</span>` : ''}
          </button>`;
        }).join('')
      : `<div class="empty">${icon('search')}<span>No matches</span></div>`;
    $('#palette-list').dataset.items = '1';
    state.paletteMatches = items;
  }

  function runPaletteIndex(index) {
    const items = state.paletteMatches || [];
    if (!items[index]) return;
    closePalette();
    items[index].run();
  }

  /* ---------------------------------------------------------------- auth */

  let authMode = 'login';

  function showAuth(message) {
    $('#boot').hidden = true;
    $('#shell').hidden = true;
    $('#auth').hidden = false;
    if (message) {
      const box = $('#auth-error');
      box.hidden = false;
      box.textContent = message;
    }
    setTimeout(() => $('#auth-email').focus(), 60);
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    $('#auth-title').textContent = isLogin ? 'Welcome back' : 'Create your workspace';
    $('#auth-sub').textContent = isLogin
      ? 'Sign in to your SourceLens workspace.'
      : 'Start tracking traffic sources in under a minute.';
    $('#auth-submit').querySelector('span').textContent = isLogin ? 'Sign in' : 'Create account';
    $('#auth-switch-text').textContent = isLogin ? 'New here?' : 'Already have an account?';
    $('#auth-switch').textContent = isLogin ? 'Create an account' : 'Sign in';
    $('#auth-password').setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    $('#auth-error').hidden = true;
  }

  async function submitAuth(event) {
    event.preventDefault();
    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;
    const errorBox = $('#auth-error');
    errorBox.hidden = true;

    if (!email || !password) {
      errorBox.hidden = false;
      errorBox.textContent = 'Email and password are required.';
      return;
    }

    const button = $('#auth-submit');
    button.disabled = true;
    button.querySelector('span').textContent = authMode === 'login' ? 'Signing in…' : 'Creating…';

    try {
      const result = await api(`/api/auth/${authMode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.needsConfirmation) {
        $('#auth-note').hidden = false;
        $('#auth-note').textContent = 'Check your inbox to confirm your email, then sign in.';
        setAuthMode('login');
        return;
      }
      await boot();
    } catch (err) {
      errorBox.hidden = false;
      errorBox.textContent = err.message;
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = authMode === 'login' ? 'Sign in' : 'Create account';
    }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    state.user = null;
    state.data = null;
    state.cache.clear();
    showAuth();
  }

  /* ---------------------------------------------------------------- boot */

  async function boot() {
    applyTheme();
    const me = await api('/api/auth/me');
    state.authEnabled = me.authEnabled;
    state.mode = me.mode;

    if (!me.authenticated) {
      showAuth();
      $('#auth-note').hidden = true;
      if (!me.authEnabled) {
        $('#auth-title').textContent = 'Local mode';
        $('#auth-sub').textContent = 'Supabase is not configured, so this instance is open.';
        $('#auth-form').querySelector('.field').style.display = 'none';
        $('#auth-form').querySelectorAll('.field')[1].style.display = 'none';
        $('#auth-submit').querySelector('span').textContent = 'Open dashboard';
        $('#auth-submit').type = 'button';
        $('#auth-submit').onclick = () => boot();
        $('#auth-switch').parentElement.style.display = 'none';
      }
      $('#boot').hidden = true;
      return;
    }

    state.user = me.user;
    await loadSites();
    $('#boot').hidden = true;
    $('#auth').hidden = true;
    $('#shell').hidden = false;

    const avatar = $('#user-avatar');
    avatar.textContent = initials(state.user.name || state.user.email || 'SL');
    $('#user-name').textContent = state.user.name || 'Workspace';
    $('#user-mail').textContent = state.user.email || '';

    $('#store-label').textContent = state.mode === 'supabase' ? 'Supabase' : 'SQLite';
    $('#store-chip').dataset.mode = state.mode;

    if (!state.site && state.sites.length) {
      const saved = Number(localStorage.getItem('sl-site'));
      state.site = state.sites.find((s) => s.id === saved) || state.sites[0];
    }

    routeFromHash();
  }

  function initials(value) {
    return String(value || 'SL').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'SL';
  }

  async function loadSites() {
    const { sites } = await api('/api/sites');
    state.sites = sites || [];
    if (state.site) state.site = state.sites.find((s) => s.id === state.site.id) || state.site;
  }

  function selectSite(id) {
    const site = state.sites.find((s) => s.id === Number(id));
    if (!site) return;
    state.site = site;
    state.data = null;
    state.audit = null;
    state.cache.clear();
    localStorage.setItem('sl-site', String(site.id));
    paintSite();
    loadData();
  }

  function paintSite() {
    if (!state.site) return;
    $('#site-name').textContent = state.site.name;
    $('#site-domain').textContent = state.site.domain;
    $('#site-favicon').textContent = (state.site.domain || 'S')[0].toUpperCase();
  }

  /* -------------------------------------------------------------- router */

  const ROUTES = ['overview', 'sources', 'pages', 'audience', 'ai', 'seo', 'settings'];

  function go(route) {
    if (!ROUTES.includes(route)) route = 'overview';
    location.hash = '#/' + route;
  }

  function routeFromHash() {
    const route = (location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'overview';
    state.route = ROUTES.includes(route) ? route : 'overview';
    paintNav();
    paintSite();
    loadData();
  }

  function paintNav() {
    $$('#nav .nav-item').forEach((node) => {
      node.classList.toggle('active', node.dataset.route === state.route);
    });
  }

  /* ---------------------------------------------------------------- data */

  async function loadData(force) {
    if (!state.site) {
      renderNoSite();
      return;
    }
    const key = `${state.site.id}:${state.range}`;
    if (!force && state.cache.has(key)) {
      state.data = state.cache.get(key);
      render();
      return;
    }

    state.loading = true;
    renderLoading();

    try {
      const data = await api(`/api/stats?site=${state.site.id}&range=${state.range}`);
      state.data = data;
      state.cache.set(key, data);
      state.loading = false;
      render();
      if (state.route === 'ai' || state.route === 'seo') {
        // reuse a previous audit for this site if present
        if (!state.audit) loadLatestAudit();
      }
    } catch (err) {
      state.loading = false;
      renderError(err.message);
    }
  }

  function setRange(range) {
    state.range = range;
    localStorage.setItem('sl-range', range);
    loadData();
  }

  function render() {
    paintSite();
    paintNav();
    const view = $('#view');
    const fn = {
      overview: viewOverview,
      sources: viewSources,
      pages: viewPages,
      audience: viewAudience,
      ai: viewAI,
      seo: viewSEO,
      settings: viewSettings,
    }[state.route];
    if (!fn) return;
    view.innerHTML = fn();
    flushCharts();
    updateLivePill();
    wireCharts();
  }

  function renderLoading() {
    $('#view').innerHTML = `
      <div class="page-head">
        <div><div class="skeleton" style="width:140px;height:22px"></div><div class="skeleton" style="width:280px;height:12px;margin-top:8px"></div></div>
      </div>
      <div class="grid g-kpi">${Array.from({ length: 5 }).map(() => '<div class="skeleton-card"></div>').join('')}</div>
      <div style="height:12px"></div>
      <div class="grid g-main">
        <div class="skeleton" style="height:330px;border-radius:14px"></div>
        <div class="skeleton" style="height:330px;border-radius:14px"></div>
      </div>`;
  }

  function renderError(message) {
    $('#view').innerHTML = `<div class="card" style="padding:40px;text-align:center">
      <div class="empty">${icon('alert')}<b>Could not load analytics</b><span>${esc(message)}</span>
      <button class="btn btn-sm" data-action="refresh" style="margin-top:8px">${icon('refresh')}Retry</button></div></div>`;
  }

  function renderNoSite() {
    $('#view').innerHTML = `<div class="card" style="padding:52px 24px;text-align:center">
      <div class="empty">
        ${icon('layers')}
        <b style="font-size:15px">Add your first site</b>
        <span style="max-width:44ch">SourceLens needs a domain to attribute traffic to. Add one, then paste the tracker snippet on your site.</span>
        <button class="btn btn-primary" data-action="add-site" style="margin-top:10px">${icon('plus')}Add site</button>
      </div>
    </div>`;
  }

  /* -------------------------------------------------------------- pieces */

  function rangeSeg() {
    return `<div class="seg" role="group" aria-label="Date range">
      ${RANGES.map(([value, label]) => `<button data-range="${value}" class="${state.range === value ? 'active' : ''}">${label}</button>`).join('')}
    </div>`;
  }

  function pageHead(title, sub, extra) {
    return `<div class="page-head">
      <div><h1>${esc(title)}</h1><p class="sub">${sub}</p></div>
      <div class="page-actions">
        ${rangeSeg()}
        <button class="btn" data-action="refresh">${icon('refresh')}Refresh</button>
        <button class="btn" data-action="export">${icon('download')}Export</button>
        ${extra || ''}
      </div>
    </div>`;
  }

  function deltaChip(value, invert) {
    if (value === null) return `<span class="delta flat" title="No comparable previous period">new</span>`;
    if (value === undefined || value === 0) return `<span class="delta flat">0%</span>`;
    const good = invert ? value < 0 : value > 0;
    const cls = good ? 'up' : 'down';
    const arrow = value > 0 ? 'M12 5v14M6 11l6-6 6 6' : 'M12 19V5M6 13l6 6 6-6';
    return `<span class="delta ${cls}"><svg viewBox="0 0 24 24"><path d="${arrow}" stroke="currentColor"/></svg>${Math.abs(value).toFixed(1).replace(/\.0$/, '')}%</span>`;
  }

  function kpiCard({ label, value, unit, delta, invert, spark, color, iconName }) {
    return `<div class="card kpi">
      <div class="kpi-label">${iconName ? icon(iconName) : ''}${esc(label)}</div>
      <div class="kpi-main">
        <span class="kpi-value">${value}</span>
        ${unit ? `<span class="kpi-unit">${esc(unit)}</span>` : ''}
        ${delta === undefined ? '' : deltaChip(delta, invert)}
      </div>
      <div class="kpi-spark">${sparkline(spark || [], color || 'var(--accent)')}</div>
    </div>`;
  }

  function sparkline(values, color) {
    const data = values && values.length ? values : [0, 0];
    const w = 120;
    const h = 30;
    const max = Math.max.apply(null, data.concat([1]));
    const min = Math.min.apply(null, data);
    const span = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return [x, y];
    });
    const line = smooth(pts);
    const area = `${line} L ${w} ${h} L 0 ${h} Z`;
    const id = 'sp' + Math.random().toString(36).slice(2, 8);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${id})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  function smooth(points) {
    if (points.length < 2) return points.length ? `M ${points[0][0]} ${points[0][1]}` : '';
    let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  }

  function donut(channels, total) {
    const r = 42;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const segments = channels.map((ch) => {
      const share = total ? ch.pageviews / total : 0;
      const len = Math.max(0, share * c - 2.2);
      const seg = `<circle cx="50" cy="50" r="${r}" stroke="${ch.color}" stroke-width="11"
        stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
      offset += share * c;
      return seg;
    }).join('');
    return `<div class="donut">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${r}" stroke="var(--panel-3)" stroke-width="11" fill="none"/>
        ${segments}
      </svg>
      <div class="donut-center"><b>${fmt.num(total)}</b><span>visits</span></div>
    </div>`;
  }

  function bars(rows, { color, nameKey = 'key', valueKey = 'pageviews', label, tagKey } = {}) {
    const max = Math.max.apply(null, rows.map((r) => r[valueKey] || 0).concat([1]));
    return `<div class="bar-list">${rows.map((row) => `
      <div class="bar-row">
        <div class="bar-top">
          <span class="bar-name" title="${esc(row[nameKey])}">${esc(row[label] || row[nameKey])}</span>
          ${tagKey && row[tagKey] ? `<span class="bar-tag">${esc(row[tagKey])}</span>` : ''}
          <span class="bar-num">${fmt.num(row[valueKey])}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (row[valueKey] / max) * 100)}%;background:${color || row.color || 'var(--accent)'}"></div></div>
      </div>`).join('')}</div>`;
  }

  function heatmap(grid) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const max = Math.max.apply(null, grid.flat().concat([1]));
    let cells = '';
    for (let d = 0; d < 7; d++) {
      cells += `<div class="hm-label">${days[d]}</div>`;
      for (let h = 0; h < 24; h++) {
        const v = grid[d][h];
        const alpha = v ? 0.14 + (v / max) * 0.86 : 0.035;
        cells += `<div class="hm-cell" style="background:color-mix(in srgb, var(--accent) ${Math.round(alpha * 100)}%, transparent)" title="${days[d]} ${String(h).padStart(2, '0')}:00 — ${v} visits"></div>`;
      }
    }
    const hours = Array.from({ length: 24 }).map((_, h) => `<div class="hm-hour">${h % 6 === 0 ? h : ''}</div>`).join('');
    return `<div class="heatmap"><div></div>${hours}${cells}</div>`;
  }

  function ring(score, label, sub, color) {
    const r = 21;
    const c = 2 * Math.PI * r;
    const dash = (score / 100) * c;
    const tint = color || (score >= 80 ? 'var(--ok)' : score >= 55 ? 'var(--warn)' : 'var(--bad)');
    return `<div class="score">
      <div class="ring">
        <svg viewBox="0 0 52 52">
          <circle class="track" cx="26" cy="26" r="${r}"/>
          <circle class="prog" cx="26" cy="26" r="${r}" stroke="${tint}"
            stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"/>
        </svg>
        <b>${score}</b>
      </div>
      <div class="score-meta"><div class="k">${esc(label)}</div><div class="v">${esc(sub)}</div></div>
    </div>`;
  }

  function channelBadge(channel) {
    return `<span class="badge" data-c="${esc(channel)}">${esc(CH_LABEL[channel] || channel)}</span>`;
  }

  function emptyState(text, sub) {
    return `<div class="empty">${icon('layers')}<b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  }

  /* -------------------------------------------------------------- charts */

  function queueChart(selector, series, options) {
    state.chartQueue.push({ selector, series, options: options || {} });
  }

  function flushCharts() {
    const queue = state.chartQueue;
    state.chartQueue = [];
    queue.forEach((item) => {
      const el = $(item.selector);
      if (el) drawArea(el, item.series, item.options);
    });
  }

  function wireCharts() {
    if (state.resizeBound) return;
    state.resizeBound = true;
    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        $$('[data-drawn]').forEach((el) => {
          if (el._redraw) el._redraw();
        });
      }, 140);
    });
  }

  function drawArea(el, series, options) {
    const opts = Object.assign({ metric: 'pageviews', color: 'var(--accent)', height: 236 }, options);
    const draw = () => {
      const width = Math.max(280, el.clientWidth || 640);
      const height = opts.height;
      const pad = { l: 38, r: 12, t: 14, b: 24 };
      const innerW = width - pad.l - pad.r;
      const innerH = height - pad.t - pad.b;
      const values = series.map((s) => s[opts.metric] || 0);
      const rawMax = Math.max.apply(null, values.concat([1]));
      const max = niceMax(rawMax * 1.15);
      const stepX = series.length > 1 ? innerW / (series.length - 1) : innerW;

      const pts = series.map((s, i) => [
        pad.l + (series.length > 1 ? i * stepX : innerW / 2),
        pad.t + innerH - ((s[opts.metric] || 0) / max) * innerH,
      ]);

      const line = smooth(pts);
      const area = `${line} L ${pts.length ? pts[pts.length - 1][0] : pad.l} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;
      const gid = 'grad' + Math.random().toString(36).slice(2, 8);

      const ticks = 4;
      let grid = '';
      let labels = '';
      for (let i = 0; i <= ticks; i++) {
        const y = pad.t + (innerH / ticks) * i;
        const value = max - (max / ticks) * i;
        grid += `<line class="grid-line" x1="${pad.l}" y1="${y}" x2="${width - pad.r}" y2="${y}"/>`;
        labels += `<text class="axis-label" x="${pad.l - 7}" y="${y + 3}" text-anchor="end">${fmt.num(value)}</text>`;
      }

      const labelEvery = Math.max(1, Math.ceil(series.length / (width > 720 ? 8 : 5)));
      let xLabels = '';
      series.forEach((s, i) => {
        if (i % labelEvery !== 0 && i !== series.length - 1) return;
        const x = pts[i] ? pts[i][0] : pad.l;
        xLabels += `<text class="axis-label" x="${x}" y="${height - 6}" text-anchor="${i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}">${esc(s.label)}</text>`;
      });

      el.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="height:${height}px">
        <defs>
          <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${opts.color}" stop-opacity="0.30"/>
            <stop offset="55%" stop-color="${opts.color}" stop-opacity="0.09"/>
            <stop offset="100%" stop-color="${opts.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${grid}${labels}${xLabels}
        <path class="area" d="${area}" fill="url(#${gid})"/>
        <path class="line" d="${line}" stroke="${opts.color}"/>
        <g class="hover-layer" style="opacity:0">
          <line class="hover-line" x1="0" y1="${pad.t}" x2="0" y2="${pad.t + innerH}"/>
          <circle class="hover-dot" r="4" cx="0" cy="0" fill="${opts.color}"/>
        </g>
      </svg>
      <div class="chart-tip"></div>`;

      const svg = el.querySelector('svg');
      const hover = el.querySelector('.hover-layer');
      const lineEl = el.querySelector('.hover-line');
      const dotEl = el.querySelector('.hover-dot');
      const tip = el.querySelector('.chart-tip');

      const move = (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * width;
        let index = Math.round((x - pad.l) / (stepX || 1));
        index = Math.max(0, Math.min(series.length - 1, index));
        const point = pts[index];
        if (!point) return;
        hover.style.opacity = '1';
        lineEl.setAttribute('x1', point[0]);
        lineEl.setAttribute('x2', point[0]);
        dotEl.setAttribute('cx', point[0]);
        dotEl.setAttribute('cy', point[1]);
        const s = series[index];
        tip.innerHTML = `<div style="color:var(--text-3);font-size:10.5px;margin-bottom:3px">${esc(s.label)}</div>
          <div class="tip-row"><span class="tip-dot" style="background:${opts.color}"></span><b>${fmt.exact(s[opts.metric] || 0)}</b><span style="color:var(--text-3)">${opts.metricLabel || opts.metric}</span></div>
          ${opts.secondary ? `<div class="tip-row" style="margin-top:2px"><span class="tip-dot" style="background:var(--text-3)"></span><b>${fmt.exact(s[opts.secondary] || 0)}</b><span style="color:var(--text-3)">${opts.secondaryLabel || opts.secondary}</span></div>` : ''}`;
        const pctX = (point[0] / width) * rect.width;
        tip.style.left = Math.max(60, Math.min(rect.width - 60, pctX)) + 'px';
        tip.style.top = ((point[1] / height) * rect.height) + 'px';
        tip.classList.add('on');
      };

      svg.addEventListener('mousemove', move);
      svg.addEventListener('mouseleave', () => {
        hover.style.opacity = '0';
        tip.classList.remove('on');
      });

      el.dataset.drawn = '1';
    };

    el._redraw = draw;
    draw();
  }

  function niceMax(value) {
    const exp = Math.floor(Math.log10(value || 1));
    const base = Math.pow(10, exp);
    const norm = value / base;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * base;
  }

  /* --------------------------------------------------------------- views */

  function viewOverview() {
    const d = state.data;
    if (!d) return '';
    const o = d.overview;
    const delta = o.delta || {};
    const series = d.series || [];
    const total = series.reduce((a, s) => a + (s.pageviews || 0), 0);

    const kpis = [
      { label: 'Unique visitors', value: fmt.num(o.visitors), delta: delta.visitors, spark: series.map((s) => s.visitors), iconName: 'users' },
      { label: 'Pageviews', value: fmt.num(o.pageviews), delta: delta.pageviews, spark: series.map((s) => s.pageviews), iconName: 'eye' },
      { label: 'Sessions', value: fmt.num(o.sessions), delta: delta.sessions, spark: series.map((s) => s.sessions), iconName: 'layers' },
      { label: 'Bounce rate', value: fmt.pct(o.bounceRate), delta: delta.bounceRate, invert: true, spark: series.map((s) => Math.max(0, (s.pageviews || 0) - (s.sessions || 0))), iconName: 'trend' },
      { label: 'Avg. engagement', value: fmt.dur(o.avgDuration), delta: delta.avgDuration, spark: series.map((s) => s.pageviews), iconName: 'clock' },
    ];

    queueChart('#main-chart', series, {
      metric: state.metric,
      metricLabel: state.metric,
      secondary: state.metric === 'pageviews' ? 'visitors' : 'pageviews',
      secondaryLabel: state.metric === 'pageviews' ? 'visitors' : 'pageviews',
      color: state.metric === 'visitors' ? 'var(--ai)' : 'var(--accent)',
      height: 236,
    });

    const topPages = (d.pages || []).slice(0, 7);
    const referrers = (d.referrers || []).slice(0, 7);
    const engines = (d.engines || []).slice(0, 6);

    return `
      ${pageHead('Overview', `Traffic to <b>${esc(state.site.domain)}</b> · ${esc(d.range.label)}`)}
      <div class="grid g-kpi">${kpis.map(kpiCard).join('')}</div>

      <div style="height:12px"></div>
      <div class="grid g-main">
        <div class="card">
          <div class="card-head">
            <h3>${icon('trend')}Traffic over time</h3>
            <div class="seg" style="height:27px">
              <button data-metric="pageviews" class="${state.metric === 'pageviews' ? 'active' : ''}">Pageviews</button>
              <button data-metric="visitors" class="${state.metric === 'visitors' ? 'active' : ''}">Visitors</button>
            </div>
          </div>
          <div class="card-body" style="padding:8px 10px 4px">
            <div class="chart-wrap" id="main-chart"></div>
          </div>
          <div class="legend">
            <span><i style="background:${state.metric === 'visitors' ? 'var(--ai)' : 'var(--accent)'}"></i>${state.metric === 'pageviews' ? 'Pageviews' : 'Visitors'}</span>
            <span><i style="background:var(--text-3)"></i>${state.metric === 'pageviews' ? 'Visitors' : 'Pageviews'}</span>
            <span style="margin-left:auto;color:var(--text-3)">${fmt.exact(total)} total · ${esc(d.range.label.toLowerCase())}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>${icon('source')}Traffic sources</h3><span class="hint">${(d.channels || []).length} channels</span></div>
          <div class="card-body">
            ${(d.channels || []).length ? `
              <div class="donut-wrap">
                ${donut(d.channels.map((c) => ({ ...c, color: chColor(c.channel, c.color) })), (d.channels || []).reduce((a, c) => a + c.pageviews, 0))}
                <div class="donut-legend">
                  ${d.channels.slice(0, 6).map((c) => `
                    <div class="donut-legend-row">
                      <i style="background:${chColor(c.channel, c.color)}"></i>
                      <span class="lbl">${esc(c.label)}</span>
                      <span class="val">${fmt.num(c.pageviews)}</span>
                      <span class="pct">${fmt.pct(c.share)}</span>
                    </div>`).join('')}
                </div>
              </div>
              <div class="note" style="margin-top:14px">
                ${icon('sparkle')}
                <div><b style="color:var(--text)">${fmt.pct(o.aiShare)} from AI assistants.</b> ${(d.engines || []).length ? `${esc(d.engines[0].engine)} leads with ${fmt.num(d.engines[0].pageviews)} visits.` : ''} Track and grow this in AI visibility.</div>
              </div>` : emptyState('No traffic yet', 'Install the tracker to start collecting visits.')}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-side">
        <div class="card">
          <div class="card-head"><h3>${icon('file')}Top pages</h3><span class="hint">${(d.pages || []).length} pages</span></div>
          <div class="table-wrap">
            ${topPages.length ? `<table>
              <thead><tr><th>Page</th><th class="num">Views</th><th class="num">Bounce</th></tr></thead>
              <tbody>${topPages.map((p) => `<tr>
                <td><div class="path-cell"><span class="dot-src" style="background:${chColor(p.topChannel, p.color)}"></span><div style="min-width:0"><div class="p">${esc(p.path)}</div><div class="t">${esc(p.title || '')}</div></div></div></td>
                <td class="num">${fmt.num(p.pageviews)}</td>
                <td class="num">${fmt.pct(p.bounceRate)}</td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No pageviews yet')}
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3><span class="live-dot"></span>Live now</h3>
            <span class="hint">last ${(d.realtime && d.realtime.windowMinutes) || 5} min</span>
          </div>
          <div class="spark-bars" id="live-spark">${(d.realtime?.perMinute || []).map((v) => `<i class="${v ? 'hot' : ''}" style="height:${Math.max(2, Math.min(34, v * 9))}px"></i>`).join('')}</div>
          <div class="live-feed" id="live-feed">
            ${(d.realtime?.feed || []).slice(0, 8).map((f) => `
              <div class="live-row">
                <span class="flag">${esc(f.country || '··')}</span>
                <span class="p">${esc(f.path)}</span>
                <span class="s">${esc(f.source || 'Direct')}</span>
                <span class="ago">${fmt.ago(f.ts)}</span>
              </div>`).join('') || `<div class="empty" style="padding:26px 16px">${icon('eye')}<span>No active visitors</span></div>`}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('source')}Top referrers</h3><span class="hint">external domains</span></div>
          <div class="card-body">
            ${referrers.length ? bars(referrers, { nameKey: 'key', color: 'var(--referral)', tagKey: 'channel' }) : emptyState('No external referrers')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('clock')}Traffic by hour</h3><span class="hint">local time</span></div>
          <div class="card-body">${heatmap(d.heatmap || Array.from({ length: 7 }, () => Array(24).fill(0)))}</div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('sparkle')}AI assistant referrals</h3><span class="hint">${fmt.pct(o.aiShare)} of traffic</span></div>
          <div class="table-wrap">
            ${engines.length ? `<table>
              <thead><tr><th>Engine</th><th class="num">Visits</th><th class="num">Share</th><th>Top landing page</th></tr></thead>
              <tbody>${engines.map((e) => `<tr>
                <td class="strong">${esc(e.engine)}</td>
                <td class="num">${fmt.num(e.pageviews)}</td>
                <td class="num">${fmt.pct(e.share || 0)}</td>
                <td><span class="p" style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(e.topPage)}</span></td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No AI referrals yet', 'These appear when ChatGPT, Perplexity or Claude send visitors.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('bot')}AI crawlers</h3><span class="hint">${fmt.num(d.crawlers?.total || 0)} hits</span></div>
          <div class="table-wrap">
            ${(d.crawlers?.bots || []).length ? `<table>
              <thead><tr><th>Bot</th><th class="num">Hits</th><th class="num">Pages</th><th class="num">Last seen</th></tr></thead>
              <tbody>${d.crawlers.bots.slice(0, 6).map((b) => `<tr>
                <td class="strong">${esc(b.bot)}</td>
                <td class="num">${fmt.num(b.hits)}</td>
                <td class="num">${fmt.num(b.pages)}</td>
                <td class="num">${fmt.ago(b.lastSeen)}</td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No AI crawler hits', 'Being crawled is the first step to being cited.')}
          </div>
        </div>
      </div>`;
  }

  function viewSources() {
    const d = state.data;
    const channels = d.channels || [];
    const sources = d.sources || [];
    const referrers = d.referrers || [];
    const engines = d.engines || [];
    const queries = d.queries || [];
    const campaigns = d.campaigns || [];
    const total = sources.reduce((a, s) => a + s.pageviews, 0) || 1;

    return `
      ${pageHead('Sources', `Where every visit came from · ${esc(d.range.label)}`)}
      <div class="grid g-4">
        ${channels.slice(0, 4).map((c) => `<div class="card kpi">
          <div class="kpi-label"><span class="dot-src" style="background:${chColor(c.channel, c.color)};width:7px;height:7px"></span>${esc(c.label)}</div>
          <div class="kpi-main"><span class="kpi-value">${fmt.num(c.pageviews)}</span><span class="kpi-unit">${fmt.pct(c.share)}</span></div>
          <div class="kpi-spark">${sparkline((d.series || []).map((s) => s[c.channel] || 0), chColor(c.channel, c.color))}</div>
        </div>`).join('') || '<div class="card"><div class="empty">No channels yet</div></div>'}
      </div>

      <div style="height:12px"></div>
      <div class="card">
        <div class="card-head"><h3>${icon('source')}All sources</h3><span class="hint">classified server-side</span></div>
        <div class="table-wrap">
          ${sources.length ? `<table>
            <thead><tr><th>Source</th><th>Channel</th><th class="num">Visitors</th><th class="num">Pageviews</th><th class="num">Sessions</th><th class="num">Share</th></tr></thead>
            <tbody>${sources.slice(0, 30).map((s) => `<tr>
              <td class="strong">${esc(s.key)}</td>
              <td>${channelBadge(s.channel)}</td>
              <td class="num">${fmt.num(s.visitors)}</td>
              <td class="num">${fmt.num(s.pageviews)}</td>
              <td class="num">${fmt.num(s.sessions)}</td>
              <td class="num"><div class="share-cell"><span>${fmt.pct(s.share)}</span><span class="share-bar"><i style="width:${Math.min(100, (s.pageviews / total) * 100 * 2)}%"></i></span></div></td>
            </tr>`).join('')}</tbody>
          </table>` : emptyState('No source data yet')}
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('sparkle')}AI assistants</h3><span class="hint">answer-engine referrals</span></div>
          <div class="table-wrap">
            ${engines.length ? `<table>
              <thead><tr><th>Engine</th><th class="num">Visits</th><th class="num">Visitors</th><th class="num">Top page</th></tr></thead>
              <tbody>${engines.map((e) => `<tr>
                <td class="strong">${esc(e.engine)}</td>
                <td class="num">${fmt.num(e.pageviews)}</td>
                <td class="num">${fmt.num(e.visitors)}</td>
                <td><span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(e.topPage)}</span></td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No AI referrals yet')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('globe')}Referrer domains</h3><span class="hint">${referrers.length} domains</span></div>
          <div class="table-wrap">
            ${referrers.length ? `<table>
              <thead><tr><th>Domain</th><th>Channel</th><th class="num">Visits</th><th class="num">Share</th></tr></thead>
              <tbody>${referrers.slice(0, 12).map((r) => `<tr>
                <td class="strong">${esc(r.key)}</td>
                <td>${channelBadge(r.channel)}</td>
                <td class="num">${fmt.num(r.pageviews)}</td>
                <td class="num">${fmt.pct(r.share)}</td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No external referrers')}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('search')}Search queries</h3><span class="hint">when the referrer exposes them</span></div>
          <div class="table-wrap">
            ${queries.length ? `<table>
              <thead><tr><th>Query</th><th>Engine</th><th class="num">Visits</th><th>Landing</th></tr></thead>
              <tbody>${queries.slice(0, 12).map((q) => `<tr>
                <td class="strong">${esc(q.key)}</td>
                <td><span style="color:var(--text-3)">${esc(q.engine)}</span></td>
                <td class="num">${fmt.num(q.pageviews)}</td>
                <td><span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(q.landing)}</span></td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No search queries captured', 'Google and Bing usually expose the phrase in the referrer.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('target')}Campaigns</h3><span class="hint">utm_campaign</span></div>
          <div class="table-wrap">
            ${campaigns.length ? `<table>
              <thead><tr><th>Campaign</th><th>Source</th><th>Medium</th><th class="num">Visits</th></tr></thead>
              <tbody>${campaigns.slice(0, 12).map((c) => `<tr>
                <td class="strong">${esc(c.key)}</td>
                <td style="color:var(--text-3)">${esc(c.source)}</td>
                <td>${channelBadge(c.channel)}</td>
                <td class="num">${fmt.num(c.pageviews)}</td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No campaigns yet', 'Build UTM links in SEO audit → UTM builder.')}
          </div>
        </div>
      </div>`;
  }

  function viewPages() {
    const d = state.data;
    const pages = [...(d.pages || [])];
    const { key, dir } = state.pagesSort;
    pages.sort((a, b) => {
      const av = a[key] || 0;
      const bv = b[key] || 0;
      if (typeof av === 'string') return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });

    const th = (label, sortKey, cls) => `<th class="${cls || ''}"><button data-sort="${sortKey}" style="display:inline-flex;align-items:center;gap:4px;font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit">
      ${esc(label)}${key === sortKey ? `<span style="color:var(--accent)">${dir < 0 ? '↓' : '↑'}</span>` : ''}</button></th>`;

    return `
      ${pageHead('Pages', `Page-level performance and attribution · ${esc(d.range.label)}`)}
      <div class="card">
        <div class="card-head"><h3>${icon('file')}All pages</h3><span class="hint">${pages.length} pages · click a column to sort</span></div>
        <div class="table-wrap">
          ${pages.length ? `<table>
            <thead><tr>
              ${th('Page', 'path')}
              ${th('Views', 'pageviews', 'num')}
              ${th('Visitors', 'visitors', 'num')}
              ${th('Entries', 'entries', 'num')}
              ${th('Bounce', 'bounceRate', 'num')}
              ${th('Avg. time', 'avgDuration', 'num')}
              ${th('Scroll', 'avgScroll', 'num')}
              <th>Top source</th>
            </tr></thead>
            <tbody>${pages.map((p) => `<tr>
              <td><div class="path-cell"><span class="dot-src" style="background:${chColor(p.topChannel, p.color)}"></span><div style="min-width:0"><div class="p">${esc(p.path)}</div><div class="t">${esc(p.title || '')}</div></div></div></td>
              <td class="num">${fmt.num(p.pageviews)}</td>
              <td class="num">${fmt.num(p.visitors)}</td>
              <td class="num">${fmt.num(p.entries)}</td>
              <td class="num">${fmt.pct(p.bounceRate)}</td>
              <td class="num">${fmt.dur(p.avgDuration)}</td>
              <td class="num">${p.avgScroll}%</td>
              <td>${channelBadge(p.topChannel)}</td>
            </tr>`).join('')}</tbody>
          </table>` : emptyState('No pages tracked yet')}
        </div>
      </div>`;
  }

  function viewAudience() {
    const d = state.data;
    const a = d.audience || {};
    const countries = a.countries || [];
    const devices = a.devices || [];
    const browsers = a.browsers || [];
    const os = a.os || [];
    const langs = a.languages || [];
    const cities = a.cities || [];
    const screens = a.screens || [];

    return `
      ${pageHead('Audience', `Who is visiting · ${esc(d.range.label)}`)}
      <div class="grid g-main">
        <div class="card">
          <div class="card-head"><h3>${icon('globe')}Countries</h3><span class="hint">${countries.length} regions</span></div>
          <div class="table-wrap">
            ${countries.length ? `<table>
              <thead><tr><th>Country</th><th class="num">Visitors</th><th class="num">Views</th><th class="num">Share</th></tr></thead>
              <tbody>${countries.map((c) => `<tr>
                <td class="strong"><span class="bar-tag" style="margin-right:7px">${esc(c.key)}</span></td>
                <td class="num">${fmt.num(c.visitors)}</td>
                <td class="num">${fmt.num(c.pageviews)}</td>
                <td class="num">${fmt.pct(c.share)}</td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No geo data', 'Country comes from your CDN header or the visitor timezone.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('users')}Devices</h3><span class="hint">${fmt.pct(devices.reduce((x, y) => x + y.share, 0))} classified</span></div>
          <div class="card-body">
            ${devices.length ? `
              <div class="donut-wrap">
                ${donut(devices.map((x, i) => ({ pageviews: x.pageviews, color: ['var(--accent)', 'var(--ai)', 'var(--social)'][i % 3] })), devices.reduce((x, y) => x + y.pageviews, 0))}
                <div class="donut-legend">
                  ${devices.map((x, i) => `<div class="donut-legend-row"><i style="background:${['var(--accent)', 'var(--ai)', 'var(--social)'][i % 3]}"></i><span class="lbl">${esc(x.key)}</span><span class="val">${fmt.num(x.pageviews)}</span><span class="pct">${fmt.pct(x.share)}</span></div>`).join('')}
                </div>
              </div>` : emptyState('No device data')}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-3">
        <div class="card"><div class="card-head"><h3>Browsers</h3></div><div class="card-body">${browsers.length ? bars(browsers, { color: 'var(--email)' }) : emptyState('No data')}</div></div>
        <div class="card"><div class="card-head"><h3>Operating systems</h3></div><div class="card-body">${os.length ? bars(os, { color: 'var(--ai)' }) : emptyState('No data')}</div></div>
        <div class="card"><div class="card-head"><h3>Languages</h3></div><div class="card-body">${langs.length ? bars(langs, { color: 'var(--referral)' }) : emptyState('No data')}</div></div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>Cities</h3><span class="hint">top 12</span></div>
          <div class="table-wrap">
            ${cities.length ? `<table><thead><tr><th>City</th><th class="num">Visitors</th><th class="num">Views</th></tr></thead>
              <tbody>${cities.map((c) => `<tr><td class="strong">${esc(c.key)}</td><td class="num">${fmt.num(c.visitors)}</td><td class="num">${fmt.num(c.pageviews)}</td></tr>`).join('')}</tbody></table>` : emptyState('No city data', 'Provided by Vercel, Cloudflare or your own geo header.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Screen sizes</h3><span class="hint">viewport</span></div>
          <div class="card-body">${screens.length ? bars(screens, { color: 'var(--social)' }) : emptyState('No data')}</div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ AI */

  function viewAI() {
    const d = state.data;
    const o = d.overview;
    const engines = d.engines || [];
    const bots = d.crawlers?.bots || [];
    const crawled = d.crawlers?.pages || [];
    const crawlTotal = d.crawlers?.total || 0;
    const aiVisits = engines.reduce((a, e) => a + e.pageviews, 0);
    const ratio = aiVisits ? Math.round((crawlTotal / aiVisits) * 10) / 10 : crawlTotal ? '∞' : '0';

    return `
      ${pageHead('AI visibility', 'How language models discover, read and cite you — AEO &amp; GEO')}
      <div class="grid g-kpi">
        ${kpiCard({ label: 'AI referrals', value: fmt.num(aiVisits), delta: o.delta?.aiShare, spark: (d.series || []).map((s) => s.ai || 0), color: 'var(--ai)', iconName: 'sparkle' })}
        ${kpiCard({ label: 'Share of traffic', value: fmt.pct(o.aiShare), spark: (d.series || []).map((s) => s.ai || 0), color: 'var(--ai)', iconName: 'trend' })}
        ${kpiCard({ label: 'AI crawler hits', value: fmt.num(crawlTotal), spark: (d.series || []).map((s) => s.pageviews || 0), color: 'var(--accent)', iconName: 'bot' })}
        ${kpiCard({ label: 'Pages crawled', value: fmt.num(crawled.length), spark: (d.series || []).map((s) => s.pageviews || 0), color: 'var(--referral)', iconName: 'file' })}
        ${kpiCard({ label: 'Crawl : referral', value: String(ratio), unit: 'ratio', spark: (d.series || []).map((s) => s.ai || 0), color: 'var(--email)', iconName: 'target' })}
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('sparkle')}Answer engines sending traffic</h3><span class="hint">${engines.length} engines</span></div>
          <div class="table-wrap">
            ${engines.length ? `<table>
              <thead><tr><th>Engine</th><th class="num">Visits</th><th class="num">Visitors</th><th>Top landing page</th></tr></thead>
              <tbody>${engines.map((e) => `<tr>
                <td class="strong">${esc(e.engine)}</td>
                <td class="num">${fmt.num(e.pageviews)}</td>
                <td class="num">${fmt.num(e.visitors)}</td>
                <td><span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(e.topPage)}</span></td>
              </tr>`).join('')}</tbody>
            </table>` : emptyState('No AI referrals yet', 'ChatGPT, Perplexity, Claude, Gemini and Copilot are detected automatically.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('bot')}Crawler activity</h3><span class="hint">${fmt.num(crawlTotal)} hits</span></div>
          <div class="table-wrap">
            ${bots.length ? `<table>
              <thead><tr><th>Bot</th><th class="num">Hits</th><th class="num">Pages</th><th class="num">Last seen</th></tr></thead>
              <tbody>${bots.map((b) => `<tr><td class="strong">${esc(b.bot)}</td><td class="num">${fmt.num(b.hits)}</td><td class="num">${fmt.num(b.pages)}</td><td class="num">${fmt.ago(b.lastSeen)} ago</td></tr>`).join('')}</tbody>
            </table>` : emptyState('No AI crawler hits', 'Add robots.txt rules that allow GPTBot, ClaudeBot and PerplexityBot.')}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-side">
        <div class="card">
          <div class="card-head"><h3>${icon('file')}Most crawled pages</h3><span class="hint">what models are reading</span></div>
          <div class="table-wrap">
            ${crawled.length ? `<table><thead><tr><th>Page</th><th class="num">Hits</th></tr></thead>
              <tbody>${crawled.map((p) => `<tr><td><span class="path-cell"><span class="p">${esc(p.path)}</span></span></td><td class="num">${fmt.num(p.hits)}</td></tr>`).join('')}</tbody></table>`
              : emptyState('No crawl data yet')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('target')}Crawl → referral funnel</h3></div>
          <div class="card-body">
            <div class="bar-list">
              <div class="bar-row">
                <div class="bar-top"><span class="bar-name">Crawler hits</span><span class="bar-num">${fmt.num(crawlTotal)}</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:100%;background:var(--accent)"></div></div>
              </div>
              <div class="bar-row">
                <div class="bar-top"><span class="bar-name">AI referrals</span><span class="bar-num">${fmt.num(aiVisits)}</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:${crawlTotal ? Math.max(2, (aiVisits / crawlTotal) * 100) : 2}%;background:var(--ai)"></div></div>
              </div>
            </div>
            <div class="note" style="margin-top:14px">${icon('alert')}
              <div>Heavy crawling with few referrals means models read you but do not cite you. Fix the GEO checks below — llms.txt, entity clarity and citable facts move this fastest.</div>
            </div>
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      ${auditCard('GEO / AEO site audit', 'Scan the live page for answer-engine and generative-engine readiness.')}

      <div style="height:12px"></div>
      <div class="card">
        <div class="card-head"><h3>${icon('code')}llms.txt generator</h3><span class="hint">markdown map for LLM crawlers</span></div>
        <div class="card-body">
          <div class="note">${icon('sparkle')}
            <div>Publish <code style="font-family:var(--mono);font-size:11px">/llms.txt</code> at your domain root. It gives retrieval pipelines a cheap, canonical index of your best pages — the highest-leverage GEO artifact.</div>
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn btn-primary" data-action="llms">${icon('code')}Generate llms.txt</button>
            <span class="hint" style="color:var(--text-3);font-size:11.5px">Built from your 30-day top pages</span>
          </div>
          <div id="llms-out" style="margin-top:12px"></div>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------------- SEO */

  function viewSEO() {
    const d = state.data;
    const queries = d.queries || [];
    return `
      ${pageHead('SEO audit', 'Technical, on-page and answer-engine readiness — scored with the fixes that matter')}
      ${auditCard('Run a site audit', 'Fetches the page exactly as a crawler sees it, then scores SEO, AEO, GEO and technical health.')}

      <div style="height:12px"></div>
      <div class="grid g-side">
        <div class="card">
          <div class="card-head"><h3>${icon('search')}Queries driving traffic</h3><span class="hint">${queries.length} phrases</span></div>
          <div class="table-wrap">
            ${queries.length ? `<table><thead><tr><th>Query</th><th>Engine</th><th class="num">Visits</th><th>Landing</th></tr></thead>
              <tbody>${queries.slice(0, 12).map((q) => `<tr><td class="strong">${esc(q.key)}</td><td style="color:var(--text-3)">${esc(q.engine)}</td><td class="num">${fmt.num(q.pageviews)}</td><td><span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">${esc(q.landing)}</span></td></tr>`).join('')}</tbody></table>`
              : emptyState('No query data', 'Search engines only expose the phrase for a share of visits.')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('target')}UTM campaign builder</h3></div>
          <div class="card-body">
            <div class="stack">
              <label class="field"><span>Destination URL</span><input id="utm-url" placeholder="https://${esc(state.site.domain)}/pricing" /></label>
              <div class="grid g-2" style="gap:8px">
                <label class="field"><span>Source</span><input id="utm-source" placeholder="linkedin" /></label>
                <label class="field"><span>Medium</span><input id="utm-medium" placeholder="paid_social" /></label>
              </div>
              <div class="grid g-2" style="gap:8px">
                <label class="field"><span>Campaign</span><input id="utm-campaign" placeholder="launch-q2" /></label>
                <label class="field"><span>Content</span><input id="utm-content" placeholder="hero-cta" /></label>
              </div>
              <button class="btn" data-action="utm-build">${icon('zap')}Build link</button>
              <div id="utm-out"></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function auditCard(title, sub) {
    return `<div class="card">
      <div class="card-head"><h3>${icon('target')}${esc(title)}</h3><span class="hint">${esc(sub)}</span></div>
      <div class="card-body">
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <input id="audit-url" class="btn" style="flex:1;min-width:240px;height:34px;padding:0 11px;background:var(--bg-soft);border-color:var(--border-2);font-family:var(--mono);font-size:12px"
            value="https://${esc(state.site ? state.site.domain : '')}" placeholder="https://example.com" />
          <button class="btn btn-primary" data-action="audit" ${state.auditRunning ? 'disabled' : ''}>
            ${icon('zap')}${state.auditRunning ? 'Auditing…' : 'Run audit'}
          </button>
          <span class="hint" style="color:var(--text-3);font-size:11.5px">~5–15s</span>
        </div>
        <div id="audit-results" style="margin-top:14px">${state.audit ? renderAudit(state.audit) : ''}</div>
      </div>
    </div>`;
  }

  function renderAudit(audit) {
    if (!audit) return '';
    if (!audit.ok) {
      return `<div class="note warn">${icon('alert')}<div><b>Could not fetch ${esc(audit.url)}</b><br>${esc(audit.error || 'Unknown error')}</div></div>`;
    }

    const filter = state.auditFilter;
    const groups = [
      { id: 'seo', label: 'SEO' },
      { id: 'aeo', label: 'AEO' },
      { id: 'geo', label: 'GEO' },
      { id: 'tech', label: 'Technical' },
    ];
    const checks = audit.checks.filter((c) => filter === 'all' || (filter === 'issues' ? c.status !== 'pass' : c.status === 'pass'));
    const failing = audit.checks.filter((c) => c.status !== 'pass').sort((a, b) => b.weight - a.weight);

    const rows = groups.map((g) => {
      const list = checks.filter((c) => c.group === g.id);
      if (!list.length) return '';
      return `<div class="check-group">
        <div class="nav-label" style="padding:10px 16px 4px">${g.label} · ${audit.scores[g.id]}/100</div>
        ${list.map((c) => `<div class="check-row" data-status="${c.status}">
          <span class="check-icon ${c.status}">${icon(c.status === 'pass' ? 'check' : c.status === 'warn' ? 'alert' : 'x')}</span>
          <div class="check-body">
            <div class="lbl">${esc(c.label)}<span class="badge" style="font-family:var(--mono);font-size:9.5px">${c.status}</span></div>
            <div class="det">${esc(c.detail)}</div>
            ${c.status !== 'pass' ? `<div class="fix">${esc(c.fix)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>`;
    }).join('');

    return `
      <div class="score-grid">
        ${ring(audit.scores.seo, 'SEO', 'crawlability & on-page', 'var(--accent)')}
        ${ring(audit.scores.aeo, 'AEO', 'answer extraction', 'var(--ai)')}
        ${ring(audit.scores.geo, 'GEO', 'generative citation', 'var(--referral)')}
        ${ring(audit.scores.tech, 'Technical', 'delivery & speed', 'var(--email)')}
      </div>
      <div class="row" style="margin:14px 0 6px;gap:6px;flex-wrap:wrap">
        <span class="badge">${esc(audit.url)}</span>
        <span class="badge">${audit.extracted.wordCount} words</span>
        <span class="badge">${audit.extracted.schemaTypes.length} schema types</span>
        <span class="badge">${audit.extracted.responseMs}ms</span>
        <span class="badge">${audit.extracted.llmsTxt ? 'llms.txt ✓' : 'no llms.txt'}</span>
        <span class="spacer"></span>
        <div class="seg" style="height:26px">
          <button data-audit-filter="issues" class="${filter === 'issues' ? 'active' : ''}">Issues (${audit.checks.filter((c) => c.status !== 'pass').length})</button>
          <button data-audit-filter="all" class="${filter === 'all' ? 'active' : ''}">All</button>
          <button data-audit-filter="pass" class="${filter === 'pass' ? 'active' : ''}">Passing</button>
        </div>
      </div>
      ${failing.length && filter !== 'pass' ? `<div class="note warn" style="margin-bottom:10px">${icon('zap')}
        <div><b>Fix first:</b> ${failing.slice(0, 3).map((c) => esc(c.label)).join(' · ')}</div></div>` : ''}
      <div class="card" style="background:var(--panel-2);box-shadow:none">${rows || emptyState('Nothing here', 'Switch the filter to see other checks.')}</div>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" data-action="audit-download">${icon('download')}Download report</button>
        <span class="hint" style="color:var(--text-3);font-size:11.5px">Audited ${fmt.dateTime(audit.fetchedAt)} · ${audit.checks.length} checks</span>
      </div>`;
  }

  /* ------------------------------------------------------------- settings */

  function viewSettings() {
    const site = state.site;
    const origin = location.origin;
    const snippet = site
      ? `<script defer src="${origin}/t.js" data-site="${site.key}"></script>`
      : '';

    return `
      ${pageHead('Settings', 'Workspace, tracking installation and data controls')}
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('layers')}Connection</h3><span class="hint">runtime</span></div>
          <div class="card-body">
            <dl class="kv">
              <dt>Database</dt><dd>${state.mode === 'supabase' ? 'Supabase (Postgres)' : 'Local SQLite'}</dd>
              <dt>Auth</dt><dd>${state.authEnabled ? 'Supabase Auth' : 'Open (local mode)'}</dd>
              <dt>Storage</dt><dd>${state.mode === 'supabase' ? 'Supabase Storage' : 'Direct download'}</dd>
              <dt>Tracker</dt><dd>${origin}/t.js</dd>
              <dt>Signed in as</dt><dd>${esc(state.user?.email || 'local')}</dd>
            </dl>
            ${state.mode === 'sqlite' ? `<div class="note warn" style="margin-top:12px">${icon('alert')}
              <div>Running locally. Add <code style="font-family:var(--mono)">SUPABASE_URL</code>, <code style="font-family:var(--mono)">SUPABASE_SERVICE_KEY</code> and <code style="font-family:var(--mono)">SUPABASE_ANON_KEY</code> to switch to Supabase — see README.</div>
            </div>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>${icon('code')}Install the tracker</h3><span class="hint">one line</span></div>
          <div class="card-body">
            ${site ? `
              <div class="code-block">${esc(snippet)}<button class="copy-btn" data-copy="${esc(snippet)}">${icon('copy')}Copy</button></div>
              <div class="note" style="margin-top:10px">${icon('zap')}
                <div>Paste before <code style="font-family:var(--mono);font-size:11px">&lt;/body&gt;</code>. Works with any stack, CMS or framework. SPA route changes are tracked automatically.</div>
              </div>
              <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
                <button class="btn btn-sm" data-action="copy-snippet">${icon('copy')}Copy snippet</button>
                <button class="btn btn-sm" data-action="widget">${icon('code')}Live badge</button>
              </div>` : emptyState('Add a site first')}
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="card">
        <div class="card-head">
          <h3>${icon('globe')}Sites</h3>
          <button class="btn btn-sm" data-action="add-site">${icon('plus')}Add site</button>
        </div>
        <div class="table-wrap">
          ${state.sites.length ? `<table>
            <thead><tr><th>Domain</th><th>Name</th><th>Site key</th><th class="num">Events</th><th class="num">Last seen</th><th></th></tr></thead>
            <tbody>${state.sites.map((s) => `<tr>
              <td class="strong">${esc(s.domain)}</td>
              <td>${esc(s.name)}</td>
              <td><span style="font-family:var(--mono);font-size:10.5px;color:var(--text-3)">${esc(s.key)}</span></td>
              <td class="num">${fmt.num(s.events || 0)}</td>
              <td class="num">${s.last_seen ? fmt.ago(s.last_seen) + ' ago' : '—'}</td>
              <td style="text-align:right"><button class="btn btn-sm btn-ghost" data-delete-site="${s.id}">${icon('x')}</button></td>
            </tr>`).join('')}</tbody>
          </table>` : emptyState('No sites yet', 'Add a domain to start collecting traffic.')}
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><h3>${icon('code')}Custom events API</h3></div>
          <div class="card-body">
            <div class="code-block">${esc(`sourcelens.track('signup', {
  plan: 'pro',
  source: 'pricing_page'
})`)}</div>
            <div class="note" style="margin-top:10px">${icon('sparkle')}
              <div>Use it for signups, checkout steps and any conversion that is not a pageview. Props are stored as JSON.</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('download')}Data &amp; retention</h3></div>
          <div class="card-body stack">
            <div class="note">${icon('eye')}
              <div>No cookies, no IP storage. Visitors are counted with a salted daily hash, so repeat visits are visible for one day and never beyond.</div>
            </div>
            <div class="row" style="gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm" data-action="export">${icon('download')}Export 30 days (CSV)</button>
              <button class="btn btn-sm" data-action="seed">${icon('zap')}Load demo data</button>
            </div>
            <p style="font-size:11.5px;color:var(--text-3);line-height:1.6">Exports are written to Supabase Storage and returned as a 24-hour signed URL when storage is configured; otherwise they download directly.</p>
          </div>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------------- audit */

  async function runAudit() {
    const url = ($('#audit-url') || {}).value;
    if (!url) return;
    state.auditRunning = true;
    const button = $('[data-action="audit"]');
    if (button) {
      button.disabled = true;
      button.innerHTML = `${icon('refresh')}Auditing…`;
    }
    const results = $('#audit-results');
    if (results) results.innerHTML = `<div class="stack"><div class="skeleton" style="height:60px"></div><div class="skeleton" style="height:120px"></div></div>`;

    try {
      const audit = await api(`/api/audit?url=${encodeURIComponent(url)}&site=${state.site ? state.site.id : ''}`);
      state.audit = audit;
      state.auditRunning = false;
      if (results) results.innerHTML = renderAudit(audit);
      toast(`Audit complete — SEO ${audit.scores.seo}, AEO ${audit.scores.aeo}, GEO ${audit.scores.geo}`);
    } catch (err) {
      state.auditRunning = false;
      if (results) results.innerHTML = `<div class="note warn">${icon('alert')}<div>${esc(err.message)}</div></div>`;
      toast(err.message, 'err');
    }
  }

  async function loadLatestAudit() {
    if (!state.site) return;
    try {
      const { audit } = await api(`/api/audit/latest?site=${state.site.id}`);
      if (audit) {
        state.audit = audit;
        const box = $('#audit-results');
        if (box) box.innerHTML = renderAudit(audit);
      }
    } catch (e) { /* no previous audit */ }
  }

  /* --------------------------------------------------------------- export */

  async function exportCsv() {
    if (!state.site) return;
    try {
      const res = await fetch(`/api/export?site=${state.site.id}&range=${state.range}`, { credentials: 'same-origin' });
      const type = res.headers.get('content-type') || '';
      if (type.includes('application/json')) {
        const data = await res.json();
        if (data.signedUrl) {
          window.open(data.signedUrl, '_blank', 'noopener');
          toast(`Export ready — ${data.rows} rows in Supabase Storage`);
          return;
        }
      }
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.site.domain}-${state.range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded');
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  /* ---------------------------------------------------------------- sites */

  function addSiteModal() {
    openModal('Add a site', `
      <label class="field"><span>Domain</span>
        <input id="new-site-domain" placeholder="example.com" autocomplete="off" />
        <span class="help">Bare domain — no https:// and no trailing slash.</span>
      </label>
      <label class="field"><span>Display name</span>
        <input id="new-site-name" placeholder="My site" autocomplete="off" />
      </label>
    `, `<button class="btn" data-close="modal">Cancel</button>
        <button class="btn btn-primary" data-action="create-site">${icon('plus')}Add site</button>`);
  }

  async function createSite() {
    const domain = ($('#new-site-domain') || {}).value || '';
    const name = ($('#new-site-name') || {}).value || '';
    if (!domain.trim()) {
      toast('Enter a domain', 'err');
      return;
    }
    try {
      const { site } = await api('/api/sites', { method: 'POST', body: JSON.stringify({ domain, name }) });
      closeModal();
      await loadSites();
      state.site = state.sites.find((s) => s.id === site.id) || site;
      state.cache.clear();
      toast(`Added ${site.domain}`);
      paintSite();
      loadData();
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  async function deleteSite(id) {
    try {
      await api(`/api/sites/${id}`, { method: 'DELETE' });
      await loadSites();
      if (state.site && state.site.id === Number(id)) state.site = state.sites[0] || null;
      state.cache.clear();
      toast('Site removed');
      loadData();
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  /* ----------------------------------------------------------------- live */

  function updateLivePill() {
    const pill = $('#live-pill');
    const count = state.data?.realtime?.active || 0;
    if (state.route === 'overview' && state.site) {
      pill.hidden = false;
      $('#live-count').textContent = count;
    } else {
      pill.hidden = true;
    }
  }

  function startLivePolling() {
    stopLivePolling();
    state.liveTimer = setInterval(async () => {
      if (state.route !== 'overview' || !state.site || document.hidden) return;
      try {
        const data = await api(`/api/stats/realtime?site=${state.site.id}`);
        const rt = data.realtime;
        $('#live-count').textContent = rt.active;
        const feed = $('#live-feed');
        if (feed) {
          feed.innerHTML = (rt.feed || []).slice(0, 8).map((f) => `<div class="live-row">
            <span class="flag">${esc(f.country || '··')}</span>
            <span class="p">${esc(f.path)}</span>
            <span class="s">${esc(f.source || 'Direct')}</span>
            <span class="ago">${fmt.ago(f.ts)}</span>
          </div>`).join('') || `<div class="empty" style="padding:26px 16px">${icon('eye')}<span>No active visitors</span></div>`;
        }
        const spark = $('#live-spark');
        if (spark) {
          spark.innerHTML = (rt.perMinute || []).map((v) => `<i class="${v ? 'hot' : ''}" style="height:${Math.max(2, Math.min(34, v * 9))}px"></i>`).join('');
        }
      } catch (e) { /* silent */ }
    }, 20000);
  }

  function stopLivePolling() {
    if (state.liveTimer) clearInterval(state.liveTimer);
    state.liveTimer = null;
  }

  /* --------------------------------------------------------------- events */

  function wireEvents() {
    /* nav + palette */
    window.addEventListener('hashchange', routeFromHash);

    $('#theme-btn').addEventListener('click', toggleTheme);

    $('#search-trigger').addEventListener('click', openPalette);
    $('#palette-input').addEventListener('input', (e) => renderPalette(e.target.value));
    $('#palette').addEventListener('click', (e) => {
      const item = e.target.closest('[data-palette-index]');
      if (item) runPaletteIndex(Number(item.dataset.paletteIndex));
      if (e.target.dataset.close === 'palette') closePalette();
    });

    $('#site-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = $('#site-menu');
      menu.hidden = !menu.hidden;
      if (!menu.hidden) renderSiteMenu();
    });

    $('#user-card').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = $('#user-menu');
      menu.hidden = !menu.hidden;
    });

    $('#user-menu').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'theme') toggleTheme();
      if (action === 'logout') logout();
      $('#user-menu').hidden = true;
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#site-switch')) $('#site-menu').hidden = true;
      if (!e.target.closest('#user-card') && !e.target.closest('#user-menu')) $('#user-menu').hidden = true;
      const close = e.target.closest('[data-close]');
      if (close) {
        if (close.dataset.close === 'modal') closeModal();
        if (close.dataset.close === 'palette') closePalette();
      }
    });

    $('#modal').addEventListener('submit', (e) => e.preventDefault());

    /* view delegation */
    $('#view').addEventListener('click', async (e) => {
      const target = e.target.closest('[data-range],[data-metric],[data-action],[data-sort],[data-audit-filter],[data-delete-site],[data-copy]');
      if (!target) return;

      if (target.dataset.range) return setRange(target.dataset.range);

      if (target.dataset.metric) {
        state.metric = target.dataset.metric;
        render();
        return;
      }

      if (target.dataset.sort) {
        const key = target.dataset.sort;
        if (state.pagesSort.key === key) state.pagesSort.dir *= -1;
        else state.pagesSort = { key, dir: -1 };
        render();
        return;
      }

      if (target.dataset.auditFilter) {
        state.auditFilter = target.dataset.auditFilter;
        const box = $('#audit-results');
        if (box && state.audit) box.innerHTML = renderAudit(state.audit);
        return;
      }

      if (target.dataset.deleteSite) return deleteSite(target.dataset.deleteSite);

      if (target.dataset.copy) return copy(target.dataset.copy);

      const action = target.dataset.action;
      if (action === 'refresh') return loadData(true);
      if (action === 'export') return exportCsv();
      if (action === 'add-site') return addSiteModal();
      if (action === 'create-site') return createSite();
      if (action === 'audit') return runAudit();
      if (action === 'llms') return generateLlms();
      if (action === 'utm-build') return buildUtm();
      if (action === 'copy-snippet') {
        const site = state.site;
        return copy(`<script defer src="${location.origin}/t.js" data-site="${site.key}"></script>`, 'Snippet copied');
      }
      if (action === 'widget') {
        const site = state.site;
        return openModal('Live visitor badge', `
          <p style="font-size:12.5px;color:var(--text-2)">Embed this iframe anywhere — docs, a status page or your marketing site footer.</p>
          <div class="code-block">&lt;iframe src="${location.origin}/embed?key=${site.key}" width="230" height="56" style="border:0;overflow:hidden" title="Live visitors"&gt;&lt;/iframe&gt;<button class="copy-btn" data-copy='&lt;iframe src="${location.origin}/embed?key=${site.key}" width="230" height="56" style="border:0"&gt;&lt;/iframe&gt;'>${icon('copy')}Copy</button></div>
          <div class="note">${icon('eye')}<div>It polls a public, read-only counter endpoint that exposes only the active visitor count for that site key.</div></div>
        `);
      }
      if (action === 'seed') {
        target.disabled = true;
        try {
          const res = await api('/api/demo/seed', { method: 'POST' });
          toast(`Loaded ${fmt.num(res.total)} demo events`);
          state.cache.clear();
          await loadSites();
          loadData(true);
        } catch (err) {
          toast(err.message, 'err');
        } finally {
          target.disabled = false;
        }
        return;
      }
      if (action === 'audit-download') {
        const blob = new Blob([JSON.stringify(state.audit, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sourcelens-audit-${(state.site ? state.site.domain : 'report')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Audit report downloaded');
      }
    });

    /* audit input enter */
    $('#view').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'audit-url') runAudit();
    });

    /* site menu */
    $('#site-menu').addEventListener('click', (e) => {
      const item = e.target.closest('[data-site-id]');
      if (item) {
        selectSite(item.dataset.siteId);
        $('#site-menu').hidden = true;
      }
      if (e.target.closest('[data-action="add-site"]')) {
        $('#site-menu').hidden = true;
        addSiteModal();
      }
    });

    /* keyboard */
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#palette').hidden ? openPalette() : closePalette();
        return;
      }
      if (e.key === 'Escape') {
        closePalette();
        closeModal();
        return;
      }
      if ($('#palette').hidden === false) {
        const items = state.paletteMatches || [];
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const current = items.findIndex((_, i) => $$('.palette-item')[i]?.classList.contains('active'));
          let next = current + (e.key === 'ArrowDown' ? 1 : -1);
          if (next < 0) next = items.length - 1;
          if (next >= items.length) next = 0;
          $$('.palette-item').forEach((node, i) => node.classList.toggle('active', i === next));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const index = $$('.palette-item').findIndex((n) => n.classList.contains('active'));
          runPaletteIndex(index < 0 ? 0 : index);
        }
      }
      if (e.shiftKey && e.key.toLowerCase() === 'd' && !mod) toggleTheme();
    });

    /* auth */
    $('#auth-form').addEventListener('submit', submitAuth);
    $('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login'));
  }

  function renderSiteMenu() {
    const menu = $('#site-menu');
    menu.innerHTML = `
      ${state.sites.map((s) => `<button class="site-menu-item ${state.site && state.site.id === s.id ? 'active' : ''}" data-site-id="${s.id}">
        <span class="site-favicon">${esc((s.domain || 'S')[0].toUpperCase())}</span>
        <span class="site-meta"><b>${esc(s.name)}</b><span>${esc(s.domain)} · ${fmt.num(s.events || 0)} events</span></span>
        ${state.site && state.site.id === s.id ? `<svg class="check"><use href="#i-check"/></svg>` : ''}
      </button>`).join('')}
      <div class="site-menu-sep"></div>
      <button class="site-menu-add" data-action="add-site">${icon('plus')}Add site</button>`;
  }

  /* ----------------------------------------------------------------- llms */

  async function generateLlms() {
    if (!state.site) return;
    const box = $('#llms-out');
    if (box) box.innerHTML = `<div class="skeleton" style="height:120px"></div>`;
    try {
      const res = await fetch(`/api/llms-txt?site=${state.site.id}`, { credentials: 'same-origin' });
      const text = await res.text();
      if (box) {
        box.innerHTML = `<div class="code-block" style="max-height:260px;overflow:auto">${esc(text)}<button class="copy-btn" data-copy="${esc(text)}">${icon('copy')}Copy</button></div>
          <div class="row" style="margin-top:8px;gap:8px">
            <button class="btn btn-sm" data-copy="${esc(text)}">${icon('copy')}Copy markdown</button>
            <a class="btn btn-sm" href="/api/llms-txt?site=${state.site.id}" download="llms.txt">${icon('download')}Download</a>
          </div>`;
      }
    } catch (err) {
      if (box) box.innerHTML = `<div class="note warn">${icon('alert')}<div>${esc(err.message)}</div></div>`;
    }
  }

  /* ------------------------------------------------------------------ utm */

  function buildUtm() {
    const base = ($('#utm-url') || {}).value || `https://${state.site.domain}/`;
    const params = new URLSearchParams();
    const map = { utm_source: 'utm-source', utm_medium: 'utm-medium', utm_campaign: 'utm-campaign', utm_content: 'utm-content' };
    for (const [key, id] of Object.entries(map)) {
      const value = ($('#' + id) || {}).value;
      if (value) params.set(key, value);
    }
    let url;
    try {
      url = new URL(base);
    } catch (e) {
      toast('Enter a valid URL', 'err');
      return;
    }
    params.forEach((v, k) => url.searchParams.set(k, v));
    const out = url.toString();
    $('#utm-out').innerHTML = `<div class="code-block">${esc(out)}<button class="copy-btn" data-copy="${esc(out)}">${icon('copy')}Copy</button></div>`;
  }

  /* ----------------------------------------------------------------- init */

  function init() {
    applyTheme();
    setAuthMode('login');
    wireEvents();
    boot().catch((err) => {
      console.error(err);
      showAuth(err.message);
    });
    startLivePolling();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
