'use strict';

/**
 * Traffic-source classification.
 *
 * Turns a raw referrer / URL / user-agent into a normalized origin:
 *   channel  : search | ai | social | referral | paid | email | direct | internal
 *   source   : human label ("Google", "ChatGPT", "LinkedIn", "Direct")
 *   engine   : AI engine name when channel === 'ai'
 *   query    : the search phrase when the referrer exposes one
 *
 * AI assistants frequently strip the Referer header, so we also honour
 * `utm_source` and the `referrer` query parameter some of them append.
 */

const AI_ENGINES = [
  { name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com', 'chatgpt.livekit'] },
  { name: 'Perplexity', hosts: ['perplexity.ai', 'www.perplexity.ai'] },
  { name: 'Claude', hosts: ['claude.ai', 'anthropic.com'] },
  { name: 'Gemini', hosts: ['gemini.google.com', 'bard.google.com'] },
  { name: 'Copilot', hosts: ['copilot.microsoft.com', 'copilot.cloud.microsoft'] },
  { name: 'Grok', hosts: ['grok.com', 'x.ai'] },
  { name: 'You.com', hosts: ['you.com'] },
  { name: 'Phind', hosts: ['phind.com'] },
  { name: 'Poe', hosts: ['poe.com'] },
  { name: 'Meta AI', hosts: ['meta.ai'] },
  { name: 'DeepSeek', hosts: ['chat.deepseek.com', 'deepseek.com'] },
  { name: 'Le Chat', hosts: ['chat.mistral.ai', 'mistral.ai'] },
  { name: 'Qwen', hosts: ['chat.qwen.ai', 'qwen.ai'] },
  { name: 'Kimi', hosts: ['kimi.moonshot.cn', 'kimi.com'] },
  { name: 'Copilot Chat', hosts: ['bing.com/chat'] },
];

const SEARCH_ENGINES = [
  { name: 'Google', hosts: ['google.com', 'google.co.uk', 'google.de', 'google.fr', 'google.es', 'google.it', 'google.ca', 'google.com.au', 'google.co.in', 'google.co.jp', 'google.com.br', 'google.nl', 'google.se', 'google.ae', 'google.sg'], q: ['q'] },
  { name: 'Bing', hosts: ['bing.com', 'www.bing.com'], q: ['q'] },
  { name: 'DuckDuckGo', hosts: ['duckduckgo.com', 'html.duckduckgo.com'], q: ['q'] },
  { name: 'Yahoo', hosts: ['search.yahoo.com', 'yahoo.com'], q: ['p'] },
  { name: 'Yandex', hosts: ['yandex.ru', 'yandex.com', 'ya.ru'], q: ['text'] },
  { name: 'Baidu', hosts: ['baidu.com', 'www.baidu.com'], q: ['wd', 'word'] },
  { name: 'Brave Search', hosts: ['search.brave.com'], q: ['q'] },
  { name: 'Ecosia', hosts: ['ecosia.org'], q: ['q'] },
  { name: 'Startpage', hosts: ['startpage.com'], q: ['query'] },
  { name: 'Qwant', hosts: ['qwant.com'], q: ['q'] },
  { name: 'Naver', hosts: ['search.naver.com'], q: ['query'] },
  { name: 'Seznam', hosts: ['search.seznam.cz'], q: ['q'] },
  { name: 'Kagi', hosts: ['kagi.com'], q: ['q'] },
  { name: 'Mojeek', hosts: ['mojeek.com'], q: ['q'] },
];

const SOCIAL_NETWORKS = [
  { name: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'] },
  { name: 'X', hosts: ['x.com', 'twitter.com', 't.co'] },
  { name: 'Facebook', hosts: ['facebook.com', 'fb.com', 'm.facebook.com', 'l.facebook.com'] },
  { name: 'Instagram', hosts: ['instagram.com', 'l.instagram.com'] },
  { name: 'Reddit', hosts: ['reddit.com', 'old.reddit.com', 'out.reddit.com'] },
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be', 'm.youtube.com'] },
  { name: 'TikTok', hosts: ['tiktok.com'] },
  { name: 'Pinterest', hosts: ['pinterest.com', 'pin.it'] },
  { name: 'Threads', hosts: ['threads.net', 'threads.com'] },
  { name: 'Mastodon', hosts: ['mastodon.social', 'mastodon.online'] },
  { name: 'Hacker News', hosts: ['news.ycombinator.com'] },
  { name: 'Product Hunt', hosts: ['producthunt.com'] },
  { name: 'Discord', hosts: ['discord.com', 'discord.gg'] },
  { name: 'WhatsApp', hosts: ['wa.me', 'whatsapp.com'] },
  { name: 'Telegram', hosts: ['t.me', 'telegram.org'] },
  { name: 'Slack', hosts: ['slack.com'] },
  { name: 'Bluesky', hosts: ['bsky.app'] },
  { name: 'Quora', hosts: ['quora.com'] },
  { name: 'Medium', hosts: ['medium.com'] },
  { name: 'Substack', hosts: ['substack.com'] },
  { name: 'GitHub', hosts: ['github.com', 'gist.github.com'] },
  { name: 'Dev.to', hosts: ['dev.to'] },
  { name: 'Stack Overflow', hosts: ['stackoverflow.com'] },
];

const PAID_MEDIUMS = new Set([
  'cpc', 'ppc', 'paid', 'paidsearch', 'paid-search', 'paid_search', 'sem',
  'display', 'banner', 'retargeting', 'remarketing', 'paid-social', 'paidsocial',
  'paid_social', 'cpm', 'cpv', 'affiliate', 'affiliates', 'influencer',
]);
const EMAIL_MEDIUMS = new Set(['email', 'newsletter', 'mail', 'e-mail', 'e_mail', 'drip']);
const SOCIAL_MEDIUMS = new Set(['social', 'social-media', 'social_media', 'social-network', 'organic-social', 'organic_social']);
const SEARCH_MEDIUMS = new Set(['organic', 'seo', 'search', 'organic-search', 'organic_search']);
const AI_MEDIUMS = new Set(['ai', 'llm', 'ai-search', 'ai_search', 'generative', 'answer-engine', 'aeo', 'geo']);

const PAID_CLICK_KEYS = ['gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid', 'ttclid', 'li_fat_id', 'twclid', 'epik', 'srsltid', 'yclid', 'dclid'];

const BOT_UA = /(bot|crawler|spider|crawling|scrapy|curl\/|wget|python-requests|python-urllib|go-http-client|headlesschrome|phantomjs|selenium|puppeteer|playwright|lighthouse|pingdom|uptimerobot|gtmetrix|semrush|ahrefs|mj12|dotbot|bytespider|petalbot|amazonbot|facebookexternalhit|slackbot|discordbot|telegrambot|whatsapp|embedly|preview|monitoring|apm|synthetic|google-inspectiontool|chrome-lighthouse)/i;

/**
 * AI crawlers that read a site to feed a model's answers. Tracking these is
 * the leading indicator for GEO: being crawled is the prerequisite for being
 * cited. Names match the documented user agents.
 */
const AI_CRAWLERS = [
  { name: 'GPTBot', ua: /GPTBot/i, vendor: 'OpenAI' },
  { name: 'OAI-SearchBot', ua: /OAI-SearchBot/i, vendor: 'OpenAI' },
  { name: 'ChatGPT-User', ua: /ChatGPT-User/i, vendor: 'OpenAI' },
  { name: 'ClaudeBot', ua: /ClaudeBot/i, vendor: 'Anthropic' },
  { name: 'Claude-User', ua: /Claude-User/i, vendor: 'Anthropic' },
  { name: 'PerplexityBot', ua: /PerplexityBot/i, vendor: 'Perplexity' },
  { name: 'Perplexity-User', ua: /Perplexity-User/i, vendor: 'Perplexity' },
  { name: 'Google-Extended', ua: /Google-Extended/i, vendor: 'Google' },
  { name: 'Gemini-Deep-Research', ua: /Gemini-Deep-Research/i, vendor: 'Google' },
  { name: 'Applebot-Extended', ua: /Applebot-Extended/i, vendor: 'Apple' },
  { name: 'CCBot', ua: /CCBot/i, vendor: 'Common Crawl' },
  { name: 'Bytespider', ua: /Bytespider/i, vendor: 'ByteDance' },
  { name: 'Amazonbot', ua: /Amazonbot/i, vendor: 'Amazon' },
  { name: 'Meta-ExternalAgent', ua: /meta-externalagent/i, vendor: 'Meta' },
  { name: 'cohere-ai', ua: /cohere-ai/i, vendor: 'Cohere' },
  { name: 'MistralAI-User', ua: /MistralAI-User/i, vendor: 'Mistral' },
  { name: 'DuckAssistBot', ua: /DuckAssistBot/i, vendor: 'DuckDuckGo' },
  { name: 'YouBot', ua: /YouBot/i, vendor: 'You.com' },
];

/* ------------------------------------------------------------- utilities */

function hostOf(value) {
  if (!value) return '';
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return String(value).toLowerCase().replace(/^www\./, '').split('/')[0];
  }
}

function paramsOf(value) {
  if (!value) return new URLSearchParams();
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    return url.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function hostMatches(host, candidate) {
  if (!host || !candidate) return false;
  return host === candidate || host.endsWith('.' + candidate);
}

function findIn(list, host) {
  for (const entry of list) {
    for (const h of entry.hosts) {
      if (h.includes('/')) {
        // path-qualified host (e.g. bing.com/chat)
        const [base, ...rest] = h.split('/');
        if (hostMatches(host, base) && (entry.path || '').length >= 0) return entry;
        if (hostMatches(host, base) && rest.length) return entry;
        continue;
      }
      if (hostMatches(host, h)) return entry;
    }
  }
  return null;
}

function detectCrawler(ua) {
  if (!ua) return null;
  for (const bot of AI_CRAWLERS) if (bot.ua.test(ua)) return bot;
  return null;
}

function isBotUA(ua) {
  if (!ua || ua.length < 12) return true;
  if (detectCrawler(ua)) return true;
  return BOT_UA.test(ua);
}

/* ------------------------------------------------------- device / browser */

function parseUA(ua = '') {
  const lower = ua.toLowerCase();
  let os = 'Other';
  if (/windows nt 10/.test(lower)) os = 'Windows 10/11';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/iphone|ipad|ipod/.test(lower)) os = 'iOS';
  else if (/android/.test(lower)) os = 'Android';
  else if (/mac os x|macintosh/.test(lower)) os = 'macOS';
  else if (/cros/.test(lower)) os = 'ChromeOS';
  else if (/linux/.test(lower)) os = 'Linux';

  let browser = 'Other';
  if (/edg\//.test(lower)) browser = 'Edge';
  else if (/opr\/|opera/.test(lower)) browser = 'Opera';
  else if (/samsungbrowser/.test(lower)) browser = 'Samsung Internet';
  else if (/firefox|fxios/.test(lower)) browser = 'Firefox';
  else if (/chrome|crios/.test(lower)) browser = 'Chrome';
  else if (/safari/.test(lower)) browser = 'Safari';

  let device = 'Desktop';
  if (/ipad|tablet/.test(lower)) device = 'Tablet';
  else if (/mobi|iphone|android.*mobile/.test(lower)) device = 'Mobile';
  else if (/android/.test(lower)) device = 'Tablet';

  return { os, browser, device };
}

/* ------------------------------------------------------------ classifier */

/**
 * @param {object} input
 * @param {string} input.referrer   full referrer URL
 * @param {string} input.pageUrl    the page the event happened on
 * @param {string} input.siteDomain the tracked site's domain
 * @param {object} input.utm        {source, medium, campaign, term, content}
 * @param {string} input.landingUrl optional URL carrying click ids
 */
function classify(input) {
  const { referrer = '', pageUrl = '', siteDomain = '', utm = {} } = input;
  const refHost = hostOf(referrer);
  const siteHost = hostOf(siteDomain);
  const pageParams = paramsOf(pageUrl);
  const refParams = paramsOf(referrer);

  const utmSource = (utm.source || pageParams.get('utm_source') || '').toLowerCase().trim();
  const utmMedium = (utm.medium || pageParams.get('utm_medium') || '').toLowerCase().trim();
  const utmCampaign = utm.campaign || pageParams.get('utm_campaign') || '';
  const utmTerm = utm.term || pageParams.get('utm_term') || '';
  const utmContent = utm.content || pageParams.get('utm_content') || '';

  // 1. Paid click identifiers beat everything else.
  const paidClick = PAID_CLICK_KEYS.find((k) => pageParams.has(k) || refParams.has(k));
  if (paidClick) {
    const network = {
      gclid: 'Google Ads', gbraid: 'Google Ads', wbraid: 'Google Ads', dclid: 'Google Ads',
      srsltid: 'Google Shopping', msclkid: 'Microsoft Ads', fbclid: 'Meta Ads',
      ttclid: 'TikTok Ads', li_fat_id: 'LinkedIn Ads', twclid: 'X Ads',
      yclid: 'Yandex Ads', epik: 'Pinterest Ads',
    }[paidClick];
    return {
      channel: 'paid',
      source: network,
      engine: null,
      query: utmTerm || null,
      refDomain: refHost || null,
      utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
      signal: `click-id:${paidClick}`,
    };
  }

  // 2. Explicit campaign medium.
  if (utmMedium && AI_MEDIUMS.has(utmMedium)) {
    const engine = findIn(AI_ENGINES, hostOf(utmSource)) || AI_ENGINES.find((e) => e.name.toLowerCase() === utmSource);
    return base('ai', engine ? engine.name : prettySource(utmSource) || 'AI Assistant', engine ? engine.name : null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'utm:ai');
  }
  if (utmMedium && PAID_MEDIUMS.has(utmMedium)) {
    return base('paid', prettySource(utmSource) || 'Paid campaign', null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'utm:paid');
  }
  if (utmMedium && EMAIL_MEDIUMS.has(utmMedium)) {
    return base('email', prettySource(utmSource) || 'Email', null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'utm:email');
  }
  if (utmMedium && SOCIAL_MEDIUMS.has(utmMedium)) {
    const social = findIn(SOCIAL_NETWORKS, hostOf(utmSource));
    return base('social', social ? social.name : prettySource(utmSource) || 'Social', null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'utm:social');
  }
  if (utmMedium && SEARCH_MEDIUMS.has(utmMedium)) {
    const engine = findIn(SEARCH_ENGINES, hostOf(utmSource));
    return base('search', engine ? engine.name : prettySource(utmSource) || 'Search', null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'utm:search');
  }

  // 3. UTM source naming an AI engine (OpenAI appends utm_source=chatgpt.com).
  if (utmSource) {
    const aiByUtm = findIn(AI_ENGINES, hostOf(utmSource)) || matchByName(AI_ENGINES, utmSource);
    if (aiByUtm) {
      return base('ai', aiByUtm.name, aiByUtm.name, utmSource, utmMedium || 'ai', utmCampaign, utmTerm, utmContent, refHost, 'utm:ai-source');
    }
  }

  // 4. Referrer-based.
  if (refHost) {
    if (siteHost && hostMatches(refHost, siteHost)) {
      return base('internal', 'Internal', null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'internal');
    }
    const ai = findIn(AI_ENGINES, refHost);
    if (ai) {
      const q = refParams.get('q') || refParams.get('query') || null;
      return base('ai', ai.name, ai.name, utmSource, utmMedium, utmCampaign, utmTerm || q || '', utmContent, refHost, 'referrer:ai');
    }
    const search = findIn(SEARCH_ENGINES, refHost);
    if (search) {
      const q = search.q.map((k) => refParams.get(k)).find(Boolean) || null;
      return base('search', search.name, null, utmSource, utmMedium, utmCampaign, utmTerm || q || '', utmContent, refHost, 'referrer:search');
    }
    const social = findIn(SOCIAL_NETWORKS, refHost);
    if (social) {
      return base('social', social.name, null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'referrer:social');
    }
    return base('referral', prettyHost(refHost), null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refHost, 'referrer:other');
  }

  // 5. No referrer but a campaign source → treat as campaign, not direct.
  if (utmSource) {
    return base('referral', prettySource(utmSource), null, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, '', 'utm:source-only');
  }

  return base('direct', 'Direct', null, '', '', '', '', '', '', 'no-referrer');
}

function base(channel, source, engine, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refDomain, signal) {
  return {
    channel,
    source,
    engine,
    query: utmTerm || null,
    refDomain: refDomain || null,
    utmSource: utmSource || '',
    utmMedium: utmMedium || '',
    utmCampaign: utmCampaign || '',
    utmTerm: utmTerm || '',
    utmContent: utmContent || '',
    signal,
  };
}

function matchByName(list, value) {
  const v = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  return list.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '') === v) || null;
}

function prettySource(value) {
  if (!value) return '';
  const clean = String(value).replace(/^www\./, '');
  const known = matchByName([...AI_ENGINES, ...SEARCH_ENGINES, ...SOCIAL_NETWORKS], clean);
  if (known) return known.name;
  return clean
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function prettyHost(host) {
  return host.replace(/^www\./, '');
}

module.exports = {
  classify,
  isBotUA,
  detectCrawler,
  parseUA,
  hostOf,
  AI_ENGINES,
  SEARCH_ENGINES,
  SOCIAL_NETWORKS,
  AI_CRAWLERS,
};
