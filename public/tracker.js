/*!
 * SourceLens tracker v1.0 — cookieless, ~4 KB, no dependencies.
 * Install: <script defer src="https://your-host/t.js" data-site="sl_xxx"></script>
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  if (!script) return;

  var cfg = {
    site: script.getAttribute('data-site') || '',
    host: script.getAttribute('data-host') || script.src.replace(/\/t\.js.*$/, ''),
    trackLocal: script.getAttribute('data-local') === 'true',
    respectDnt: script.getAttribute('data-dnt') !== 'false',
    scroll: script.getAttribute('data-scroll') !== 'false'
  };

  var LOCALS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/;
  if (!cfg.trackLocal && LOCALS.test(location.hostname)) return;
  if (cfg.respectDnt && (navigator.doNotTrack === '1' || window.doNotTrack === '1')) return;

  try {
    if (localStorage.getItem('sourcelens_optout') === '1') return;
  } catch (e) {}

  var SESSION_KEY = 'sourcelens_sid';
  var sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = rand(8) + '-' + rand(8);
    try { sessionStorage.setItem(SESSION_KEY, sid); } catch (e) {}
  }

  var ENDPOINT = cfg.host + '/api/collect';
  var lastPath = '';
  var pageStart = Date.now();
  var maxScroll = 0;
  var sentEngage = false;
  var scrollMarks = {};

  function rand(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function utm() {
    var out = {};
    try {
      var q = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        var v = q.get(k);
        if (v) out[k.replace('utm_', '')] = v.slice(0, 160);
      });
    } catch (e) {}
    return out;
  }

  function base(type) {
    return {
      site: cfg.site,
      domain: location.hostname,
      type: type,
      path: location.pathname + location.search,
      url: location.href,
      title: document.title,
      referrer: document.referrer || '',
      session: sid,
      ts: Date.now(),
      screen: screen.width + 'x' + screen.height,
      lang: (navigator.language || '').slice(0, 24),
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })(),
      utm: utm()
    };
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && (payload.type === 'engage' || payload.type === 'pageview')) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
    } catch (e) {}
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) {}
  }

  function trackEngage() {
    if (sentEngage || !lastPath) return;
    var duration = Date.now() - pageStart;
    if (duration < 400) return;
    sentEngage = true;
    var payload = base('engage');
    payload.path = lastPath;
    payload.duration = Math.min(duration, 30 * 60 * 1000);
    payload.scroll = Math.round(maxScroll);
    send(payload);
  }

  function pageview() {
    if (lastPath === location.pathname + location.search) return;
    trackEngage();
    lastPath = location.pathname + location.search;
    pageStart = Date.now();
    maxScroll = 0;
    sentEngage = false;
    scrollMarks = {};
    send(base('pageview'));
  }

  function track(name, props) {
    var payload = base('event');
    payload.props = { name: name, data: props || {} };
    payload.title = name;
    send(payload);
  }

  /* scroll depth */
  if (cfg.scroll) {
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? Math.min(100, Math.round((window.scrollY / h) * 100)) : 100;
      if (pct > maxScroll) maxScroll = pct;
      [25, 50, 75, 100].forEach(function (mark) {
        if (pct >= mark && !scrollMarks[mark]) {
          scrollMarks[mark] = true;
          track('scroll_depth', { depth: mark, path: lastPath });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* outbound + downloads */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;
    var sameHost = false;
    try { sameHost = new URL(href).hostname === location.hostname; } catch (err) {}
    if (sameHost) return;
    var isFile = /\.(pdf|zip|dmg|exe|csv|xlsx?|docx?|pptx?|mp4|mp3|epub)$/i.test(href);
    var payload = base(isFile ? 'download' : 'outbound');
    payload.props = { href: href.slice(0, 500), text: (a.textContent || '').trim().slice(0, 120) };
    send(payload);
  }, true);

  /* SPA support */
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(pageview, 0);
      return r;
    };
  });
  window.addEventListener('popstate', function () { setTimeout(pageview, 0); });

  /* lifecycle */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') trackEngage();
    else if (sentEngage) { pageStart = Date.now(); sentEngage = false; }
  });
  window.addEventListener('pagehide', trackEngage);

  window.sourcelens = {
    track: track,
    pageview: pageview,
    session: sid,
    optOut: function () { try { localStorage.setItem('sourcelens_optout', '1'); } catch (e) {} }
  };

  pageview();
})();
