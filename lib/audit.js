'use strict';

/**
 * Site auditor: SEO, AEO (answer-engine optimization) and GEO
 * (generative-engine optimization) in one pass.
 *
 * Everything is fetched server-side and parsed without third-party libraries so
 * the audit reflects exactly what a crawler — or an LLM's retrieval pipeline —
 * receives. No JavaScript is executed, which is the point: if the content is
 * not in the raw HTML, an AI crawler cannot read it.
 */

const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent'];

const AUDIT_UA = 'Mozilla/5.0 (compatible; SourceLensAudit/1.0; +https://sourcelens.local/audit)';

/* ------------------------------------------------------------------ fetch */

async function fetchWithTimeout(url, { timeout = 12000, headers = {} } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': AUDIT_UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        ...headers,
      },
    });
    const buf = await res.arrayBuffer();
    const ms = Date.now() - started;
    const encoding = res.headers.get('content-encoding') || '';
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      headers: res.headers,
      body: Buffer.from(buf).toString('utf8'),
      bytes: buf.byteLength,
      ms,
      encoding,
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, url, headers: new Headers(), body: '', bytes: 0, ms: Date.now() - started, encoding: '', error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ parse */

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…');
}

function stripToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<template[\s\S]*?<\/template>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function parseAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  return attrs;
}

function metaTags(html) {
  const out = [];
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = parseAttrs(m[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key) out.push({ key, content: attrs.content || '', attrs });
  }
  return out;
}

function linkTags(html) {
  const out = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) out.push(parseAttrs(m[0]));
  return out;
}

function collectJsonLd(html) {
  const blocks = [];
  const types = new Set();
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    try {
      const data = JSON.parse(raw);
      blocks.push(data);
      walkTypes(data, types);
    } catch {
      // tolerate trailing commas / minor syntax slips that browsers also reject
      try {
        const repaired = raw.replace(/,\s*([}\]])/g, '$1');
        const data = JSON.parse(repaired);
        blocks.push(data);
        walkTypes(data, types);
      } catch {
        blocks.push({ __invalid: true });
      }
    }
  }
  return { blocks, types: [...types] };
}

function walkTypes(node, types) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkTypes(n, types));
    return;
  }
  if (typeof node !== 'object') return;
  const t = node['@type'];
  if (typeof t === 'string') types.add(t);
  if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
  if (node['@graph']) walkTypes(node['@graph'], types);
  for (const key of ['mainEntity', 'itemListElement', 'hasPart', 'author', 'publisher', 'about']) {
    if (node[key]) walkTypes(node[key], types);
  }
}

function headings(html) {
  const out = [];
  const re = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) out.push({ level: Number(m[1][1]), text: stripToText(m[2]).replace(/\s+/g, ' ').trim() });
  return out;
}

function paragraphs(html) {
  const out = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = stripToText(m[1]).replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

function links(html, baseUrl) {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = parseAttrs(m[1]);
    const href = attrs.href || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    let abs;
    try {
      abs = new URL(href, baseUrl);
    } catch {
      continue;
    }
    let host = '';
    try {
      host = new URL(baseUrl).hostname.replace(/^www\./, '');
    } catch {
      /* ignore */
    }
    const targetHost = abs.hostname.replace(/^www\./, '');
    out.push({
      href: abs.href,
      host: targetHost,
      text: stripToText(m[2]).replace(/\s+/g, ' ').trim().slice(0, 120),
      internal: targetHost === host,
      rel: attrs.rel || '',
    });
  }
  return out;
}

function images(html) {
  const list = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = parseAttrs(m[0]);
    list.push({ src: attrs.src || '', alt: attrs.alt, loading: attrs.loading || '', width: attrs.width, height: attrs.height });
  }
  return list;
}

/* -------------------------------------------------------------- robots.txt */

function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'disallow' || key === 'allow') && current) {
      current.rules.push({ type: key, path: value });
    } else if (key === 'sitemap' && current) {
      current.rules.push({ type: 'sitemap', path: value });
    }
  }
  const sitemaps = [];
  const re = /^\s*sitemap\s*:\s*(\S+)/gim;
  let m;
  while ((m = re.exec(String(text || '')))) sitemaps.push(m[1]);

  function statusFor(botName) {
    const name = botName.toLowerCase();
    const group = groups.find((g) => g.agents.some((a) => a === name));
    const wildcard = groups.find((g) => g.agents.includes('*'));
    const active = group || wildcard;
    if (!active) return { allowed: true, rule: 'no rule' };
    const blocksAll = active.rules.some((r) => r.type === 'disallow' && (r.path === '/' || r.path === '/*'));
    if (blocksAll) return { allowed: false, rule: `Disallow: ${active.rules.find((r) => r.type === 'disallow' && (r.path === '/' || r.path === '/*')).path}` };
    return { allowed: true, rule: group ? 'explicitly allowed' : 'wildcard allows' };
  }

  return { groups, sitemaps, statusFor };
}

/* ------------------------------------------------------------------ audit */

function check(id, group, label, status, weight, detail, fix) {
  return { id, group, label, status, weight, detail, fix };
}

function verdict(value, good, warn) {
  if (good(value)) return 'pass';
  if (warn && warn(value)) return 'warn';
  return 'fail';
}

async function auditSite(rawUrl) {
  const started = Date.now();
  let target;
  try {
    target = new URL(rawUrl.match(/^https?:\/\//i) ? rawUrl : 'https://' + rawUrl);
  } catch {
    throw new Error('Enter a valid URL, e.g. https://example.com');
  }
  target.hash = '';

  const page = await fetchWithTimeout(target.href);
  if (!page.ok || !page.body) {
    return {
      url: target.href,
      fetchedAt: Date.now(),
      ok: false,
      error: page.error || `HTTP ${page.status}`,
      scores: { seo: 0, aeo: 0, geo: 0, overall: 0 },
      checks: [],
      extracted: {},
      elapsedMs: Date.now() - started,
    };
  }

  const html = page.body;
  const finalUrl = page.url || target.href;
  const origin = new URL(finalUrl).origin;

  const [robotsRes, llmsRes, sitemapRes] = await Promise.all([
    fetchWithTimeout(origin + '/robots.txt', { timeout: 8000 }),
    fetchWithTimeout(origin + '/llms.txt', { timeout: 8000 }),
    fetchWithTimeout(origin + '/sitemap.xml', { timeout: 8000 }),
  ]);

  const robots = parseRobots(robotsRes.ok ? robotsRes.body : '');
  const hasLlms = llmsRes.ok && /llms\.txt|# |## /i.test(llmsRes.body.slice(0, 4000)) && !/^\s*<!doctype html>/i.test(llmsRes.body.slice(0, 200));
  const hasSitemap = sitemapRes.ok && /<(urlset|sitemapindex)/i.test(sitemapRes.body.slice(0, 2000));
  const sitemapHasLastmod = hasSitemap && /<lastmod>/i.test(sitemapRes.body);

  const metas = metaTags(html);
  const meta = (key) => metas.find((m) => m.key === key)?.content || '';
  const linksAll = linkTags(html);
  const canonical = linksAll.find((l) => (l.rel || '').toLowerCase().includes('canonical'))?.href || '';
  const alternateCount = linksAll.filter((l) => (l.rel || '').toLowerCase().includes('alternate') && l.hreflang).length;

  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim());
  const description = meta('description');
  const robotsMeta = meta('robots').toLowerCase();
  const hs = headings(html);
  const ps = paragraphs(html);
  const text = stripToText(html);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const jsonLd = collectJsonLd(html);
  const linkList = links(html, finalUrl);
  const internalLinks = linkList.filter((l) => l.internal);
  const externalLinks = linkList.filter((l) => !l.internal);
  const imgs = images(html);
  const imgsWithAlt = imgs.filter((i) => i.alt && i.alt.trim().length > 0).length;
  const altCoverage = imgs.length ? Math.round((imgsWithAlt / imgs.length) * 100) : 100;

  const h1s = hs.filter((h) => h.level === 1);
  const h2s = hs.filter((h) => h.level === 2);
  const questionHeadings = hs.filter((h) => h.level <= 3 && (/^(who|what|why|how|when|where|which|can|is|are|do|does|should|will)\b/i.test(h.text) || h.text.endsWith('?')));
  const firstParagraph = ps[0] || '';
  const firstParaWords = firstParagraph.split(/\s+/).filter(Boolean).length;
  const avgParaWords = ps.length ? Math.round(ps.reduce((a, p) => a + p.split(/\s+/).length, 0) / ps.length) : 0;
  const hasLists = /<ul\b|<ol\b|<table\b|<dl\b/i.test(html);
  const hasTable = /<table\b/i.test(html);
  const numbersInContent = (text.match(/\b\d+(\.\d+)?%?\b/g) || []).length;
  const first100 = words.slice(0, 100).join(' ');
  const hasDefinition = /\b(is|are|means|refers to|defined as)\b/i.test(first100);
  const dateModified = meta('article:modified_time') || meta('og:updated_time') || findDateInJsonLd(jsonLd.blocks);
  const freshDays = dateModified ? Math.round((Date.now() - new Date(dateModified).getTime()) / 86400e3) : null;
  const sameAs = findSameAs(jsonLd.blocks);
  const orgSchema = jsonLd.types.some((t) => ['Organization', 'Person', 'LocalBusiness', 'Corporation'].includes(t));
  const articleSchema = jsonLd.types.some((t) => ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'HowTo'].includes(t));
  const faqSchema = jsonLd.types.some((t) => ['FAQPage', 'QAPage'].includes(t));
  const authorName = findAuthor(jsonLd.blocks);
  const lang = (html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] || '').toLowerCase();
  const viewport = meta('viewport');
  const hasOgImage = Boolean(meta('og:image'));
  const hasOgTitle = Boolean(meta('og:title'));
  const twitterCard = Boolean(meta('twitter:card'));

  const aiPolicy = {};
  for (const bot of AI_BOTS) aiPolicy[bot] = robots.statusFor(bot);
  const allowedAiBots = AI_BOTS.filter((b) => aiPolicy[b].allowed);
  const blockedAiBots = AI_BOTS.filter((b) => !aiPolicy[b].allowed);
  const serverRendered = wordCount >= 300;

  const checks = [
    /* ------------------------------------------------------------ SEO */
    check('title', 'seo', 'Title tag', verdict(title.length, (v) => v >= 30 && v <= 65, (v) => v > 0 && v <= 75), 10,
      title ? `${title.length} characters` : 'Missing',
      title ? (title.length < 30 ? 'Expand the title to 30–65 characters with the primary keyword near the front.' : title.length > 65 ? 'Trim the title to under 65 characters so Google does not truncate it.' : 'Good length and structure.')
        : 'Add a unique <title> of 30–65 characters containing your primary keyword.'),
    check('description', 'seo', 'Meta description', verdict(description.length, (v) => v >= 70 && v <= 160, (v) => v > 0 && v <= 180), 8,
      description ? `${description.length} characters` : 'Missing',
      description ? (description.length < 70 ? 'Write a fuller description (70–160 chars) that states the outcome for the reader.' : description.length > 160 ? 'Shorten to 160 characters so it is not cut off in results.' : 'Good length.')
        : 'Add a 70–160 character description that answers the page topic in one sentence.'),
    check('h1', 'seo', 'Single H1 heading', h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn', 8,
      h1s.length ? `${h1s.length} H1 found` : 'No H1 found',
      h1s.length === 1 ? 'One clear H1.' : h1s.length === 0 ? 'Add exactly one H1 that names the page topic.' : 'Use a single H1; move the rest to H2.'),
    check('headings', 'seo', 'Heading structure', h2s.length >= 2 ? 'pass' : h2s.length === 1 ? 'warn' : 'fail', 6,
      `${hs.length} headings total, ${h2s.length} H2`,
      h2s.length >= 2 ? 'Scannable section structure.' : 'Break the page into H2 sections — one idea per section.'),
    check('canonical', 'seo', 'Canonical URL', canonical ? 'pass' : 'warn', 5,
      canonical || 'Not set',
      canonical ? 'Canonical resolves to ' + canonical : 'Add <link rel="canonical"> to consolidate duplicate URLs.'),
    check('social', 'seo', 'Open Graph / social cards', hasOgTitle && hasOgImage && twitterCard ? 'pass' : hasOgTitle || hasOgImage ? 'warn' : 'fail', 6,
      `og:title ${hasOgTitle ? '✓' : '✗'} · og:image ${hasOgImage ? '✓' : '✗'} · twitter:card ${twitterCard ? '✓' : '✗'}`,
      'Set og:title, og:description, og:image (1200×630) and twitter:card=summary_large_image.'),
    check('schema', 'seo', 'Structured data', jsonLd.types.length >= 2 ? 'pass' : jsonLd.types.length === 1 ? 'warn' : 'fail', 10,
      jsonLd.types.length ? jsonLd.types.join(', ') : 'No JSON-LD found',
      jsonLd.types.length >= 2 ? 'Rich entity signals present.' : 'Add JSON-LD for Organization + Article/Product/FAQ so search and AI engines can parse the entity.'),
    check('internal-links', 'seo', 'Internal linking', verdict(internalLinks.length, (v) => v >= 8, (v) => v >= 3), 6,
      `${internalLinks.length} internal / ${externalLinks.length} external`,
      internalLinks.length >= 8 ? 'Healthy internal link graph.' : 'Add contextual internal links to your money pages and supporting content.'),
    check('alt', 'seo', 'Image alt coverage', altCoverage >= 90 ? 'pass' : altCoverage >= 60 ? 'warn' : 'fail', 5,
      `${altCoverage}% of ${imgs.length} images have alt text`,
      'Describe every meaningful image in alt text; leave decorative images with alt="".'),
    check('lang', 'seo', 'Language declared', lang ? 'pass' : 'warn', 3, lang || 'Missing <html lang>',
      'Add lang="en" (or your locale) to <html> so engines serve the right audience.'),
    check('noindex', 'seo', 'Indexable', /noindex/.test(robotsMeta) ? 'fail' : 'pass', 10,
      robotsMeta || 'no robots meta (indexable)',
      /noindex/.test(robotsMeta) ? 'Remove noindex — this page is currently excluded from search and AI indexes.' : 'Page is indexable.'),
    check('content-depth', 'seo', 'Content depth', verdict(wordCount, (v) => v >= 600, (v) => v >= 250), 7,
      `${wordCount} words`,
      wordCount >= 600 ? 'Substantial body copy.' : 'Expand to at least 600 words of substantive, original coverage of the topic.'),

    /* ------------------------------------------------------------ AEO */
    check('answer-first', 'aeo', 'Answer-first opening', verdict(firstParaWords, (v) => v >= 25 && v <= 90, (v) => v > 0 && v <= 130), 12,
      firstParagraph ? `${firstParaWords} words in the first paragraph` : 'No paragraph found',
      'Lead with a 25–90 word paragraph that answers the page question outright — this is the snippet engines lift.'),
    check('question-headings', 'aeo', 'Question-form headings', questionHeadings.length >= 2 ? 'pass' : questionHeadings.length === 1 ? 'warn' : 'fail', 10,
      `${questionHeadings.length} question headings`,
      'Phrase H2/H3s as real questions ("How does X work?") so answer engines can match intent directly.'),
    check('faq-schema', 'aeo', 'FAQ / Q&A schema', faqSchema ? 'pass' : 'fail', 10,
      faqSchema ? 'FAQPage found' : 'No FAQPage schema',
      'Add FAQPage JSON-LD with 3–6 genuine questions and 40–60 word answers.'),
    check('scannable', 'aeo', 'Scannable structure', hasLists ? 'pass' : 'fail', 8,
      hasLists ? (hasTable ? 'Lists and tables present' : 'Lists present') : 'No lists or tables',
      'Use bullets and tables for steps, specs and comparisons — engines quote structured blocks.'),
    check('paragraph-length', 'aeo', 'Paragraph brevity', verdict(avgParaWords, (v) => v > 0 && v <= 70, (v) => v <= 110), 6,
      `${avgParaWords} words average per paragraph`,
      'Keep paragraphs under ~70 words: one idea per paragraph is easier to extract verbatim.'),
    check('definition', 'aeo', 'Definition clarity', hasDefinition ? 'pass' : 'warn', 8,
      hasDefinition ? 'Contains an "X is…" definition in the opening' : 'No explicit definition sentence',
      'State "X is …" in the first 100 words so the entity is unambiguous.'),
    check('summary', 'aeo', 'Key-takeaways block', /(key takeaways|tl;?dr|in short|summary|at a glance)/i.test(text) ? 'pass' : 'warn', 6,
      /(key takeaways|tl;?dr|in short|summary|at a glance)/i.test(text) ? 'Summary block found' : 'No summary block',
      'Add a short "Key takeaways" list near the top — the single highest-yield AEO element.'),

    /* ------------------------------------------------------------ GEO */
    check('llms-txt', 'geo', 'llms.txt', hasLlms ? 'pass' : 'fail', 12,
      hasLlms ? 'Published at /llms.txt' : 'Not found',
      'Publish /llms.txt: a markdown map of your key pages that LLM crawlers can read cheaply.'),
    check('ai-crawlers', 'geo', 'AI crawler access', blockedAiBots.length === 0 ? 'pass' : blockedAiBots.length <= 3 ? 'warn' : 'fail', 14,
      `${allowedAiBots.length}/${AI_BOTS.length} AI crawlers allowed${blockedAiBots.length ? ' · blocked: ' + blockedAiBots.join(', ') : ''}`,
      'Allow GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended in robots.txt — blocking them removes you from AI answers.'),
    check('server-rendered', 'geo', 'Server-rendered content', serverRendered ? 'pass' : wordCount >= 100 ? 'warn' : 'fail', 12,
      `${wordCount} words in raw HTML`,
      'LLM crawlers do not execute JavaScript. Render the core content in HTML or serve prerendered pages.'),
    check('entity', 'geo', 'Entity & authorship', orgSchema && authorName ? 'pass' : orgSchema || authorName ? 'warn' : 'fail', 8,
      `${orgSchema ? 'Organization ✓' : 'Organization ✗'} · ${authorName ? 'author: ' + authorName : 'no author'}`,
      'Declare an Organization/Person entity with name, url, logo and sameAs links to your verified profiles.'),
    check('sameas', 'geo', 'sameAs authority links', sameAs.length >= 2 ? 'pass' : sameAs.length === 1 ? 'warn' : 'fail', 6,
      sameAs.length ? sameAs.slice(0, 4).join(', ') : 'No sameAs links',
      'Link your Organization to Wikipedia, LinkedIn, X, Crunchbase via sameAs — it is how models disambiguate you.'),
    check('freshness', 'geo', 'Content freshness', freshDays === null ? 'warn' : freshDays <= 365 ? 'pass' : 'warn', 7,
      freshDays === null ? 'No dateModified found' : `Updated ${freshDays} days ago`,
      'Publish dateModified in Article schema and refresh pages quarterly — retrieval systems favour recent sources.'),
    check('citations', 'geo', 'Outbound citations', externalLinks.length >= 3 ? 'pass' : externalLinks.length >= 1 ? 'warn' : 'fail', 6,
      `${externalLinks.length} external links`,
      'Cite 3+ authoritative external sources. Models weight claims that are attributable.'),
    check('citable-data', 'geo', 'Citable facts & figures', numbersInContent >= 8 ? 'pass' : numbersInContent >= 3 ? 'warn' : 'fail', 7,
      `${numbersInContent} numeric facts detected`,
      'Include concrete numbers, benchmarks and named examples — quotable specifics get cited, vague prose does not.'),
    check('sitemap', 'geo', 'XML sitemap', hasSitemap ? (sitemapHasLastmod ? 'pass' : 'warn') : 'fail', 6,
      hasSitemap ? (sitemapHasLastmod ? 'Sitemap with lastmod' : 'Sitemap without lastmod') : 'No sitemap at /sitemap.xml',
      'Serve a sitemap.xml with <lastmod> so crawlers know what changed and when.'),

    /* ------------------------------------------------------------ TECH */
    check('https', 'tech', 'HTTPS', finalUrl.startsWith('https://') ? 'pass' : 'fail', 10, finalUrl.startsWith('https://') ? 'Secure' : 'Plain HTTP',
      'Serve over HTTPS with a valid certificate.'),
    check('speed', 'tech', 'Server response', verdict(page.ms, (v) => v < 800, (v) => v < 2000), 8, `${page.ms} ms to first byte`,
      page.ms < 800 ? 'Fast response.' : 'Target under 800 ms: cache HTML at the edge or add a CDN.'),
    check('compression', 'tech', 'Compression', page.encoding ? 'pass' : 'warn', 5, page.encoding || 'No content-encoding',
      'Enable gzip or brotli compression on HTML responses.'),
    check('viewport', 'tech', 'Mobile viewport', viewport ? 'pass' : 'fail', 6, viewport || 'Missing',
      'Add <meta name="viewport" content="width=device-width, initial-scale=1">.'),
    check('hreflang', 'tech', 'International targeting', alternateCount > 0 ? 'pass' : 'warn', 3, `${alternateCount} hreflang tags`,
      alternateCount > 0 ? 'hreflang present.' : 'Add hreflang only if you serve multiple locales.'),
    check('page-weight', 'tech', 'HTML payload', page.bytes < 500_000 ? 'pass' : page.bytes < 1_500_000 ? 'warn' : 'fail', 5, `${Math.round(page.bytes / 1024)} KB`,
      page.bytes < 500_000 ? 'Lean document.' : 'Reduce inline scripts and payload size.'),
  ];

  const scores = scoreGroups(checks);

  return {
    url: finalUrl,
    requestedUrl: target.href,
    fetchedAt: Date.now(),
    ok: true,
    status: page.status,
    scores,
    checks,
    extracted: {
      title,
      description,
      h1: h1s.map((h) => h.text),
      h2: h2s.slice(0, 12).map((h) => h.text),
      wordCount,
      images: imgs.length,
      altCoverage,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      schemaTypes: jsonLd.types,
      invalidSchemaBlocks: jsonLd.blocks.filter((b) => b && b.__invalid).length,
      canonical,
      robotsMeta,
      lang,
      dateModified,
      author: authorName,
      sameAs,
      llmsTxt: hasLlms,
      sitemap: hasSitemap,
      robotsSitemaps: robots.sitemaps,
      aiPolicy,
      responseMs: page.ms,
      bytes: page.bytes,
      encoding: page.encoding,
      questionHeadings: questionHeadings.slice(0, 10).map((h) => h.text),
      firstParagraph: firstParagraph.slice(0, 400),
    },
    elapsedMs: Date.now() - started,
  };
}

function scoreGroups(checks) {
  const groups = ['seo', 'aeo', 'geo', 'tech'];
  const out = {};
  let totalWeight = 0;
  let totalScore = 0;
  for (const g of groups) {
    const list = checks.filter((c) => c.group === g);
    const weight = list.reduce((a, c) => a + c.weight, 0);
    const earned = list.reduce((a, c) => a + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
    out[g] = weight ? Math.round((earned / weight) * 100) : 0;
    if (g !== 'tech') {
      totalWeight += weight;
      totalScore += earned;
    }
  }
  out.overall = totalWeight ? Math.round((totalScore / totalWeight) * 100) : 0;
  return out;
}

function findDateInJsonLd(blocks) {
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.dateModified || node.datePublished) found.push(node.dateModified || node.datePublished);
    for (const v of Object.values(node)) if (typeof v === 'object') walk(v);
  };
  blocks.forEach(walk);
  return found.sort().pop() || '';
}

function findSameAs(blocks) {
  const out = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.sameAs) (Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs]).forEach((v) => typeof v === 'string' && out.add(v));
    for (const v of Object.values(node)) if (typeof v === 'object') walk(v);
  };
  blocks.forEach(walk);
  return [...out];
}

function findAuthor(blocks) {
  let name = '';
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.author) {
      const a = Array.isArray(node.author) ? node.author[0] : node.author;
      if (typeof a === 'string') name = a;
      else if (a && typeof a === 'object' && a.name) name = a.name;
    }
    for (const v of Object.values(node)) if (typeof v === 'object') walk(v);
  };
  blocks.forEach(walk);
  return name;
}

/* -------------------------------------------------------- llms.txt builder */

function buildLlmsTxt({ name, domain, description, pages = [], extra }) {
  const site = name || domain;
  const lines = [];
  lines.push(`# ${site}`);
  lines.push('');
  lines.push(`> ${description || `${site} — key pages and canonical sources for language models.`}`);
  lines.push('');
  if (extra) {
    lines.push(extra.trim());
    lines.push('');
  }
  lines.push('## Key pages');
  lines.push('');
  const seen = new Set();
  for (const page of pages) {
    const path = page.path || page.url || '/';
    if (seen.has(path)) continue;
    seen.add(path);
    const label = page.title || path;
    lines.push(`- [${label}](https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}): ${page.description || label}`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push(`- Canonical host: https://${domain.replace(/^https?:\/\//, '')}`);
  lines.push('- Content may be quoted with attribution and a link to the source page.');
  lines.push('- Prefer the newest published version of any page.');
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  auditSite,
  buildLlmsTxt,
  parseRobots,
  AI_BOTS,
  fetchWithTimeout,
};
