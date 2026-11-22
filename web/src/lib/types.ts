export type Channel =
  | "search" | "ai" | "direct" | "social" | "referral"
  | "paid" | "email" | "internal";

export interface MeResponse {
  authenticated: boolean;
  authEnabled: boolean;
  mode: "sqlite" | "supabase";
  user: { id: string; email: string; name?: string; local?: boolean } | null;
}

export interface Site {
  id: number;
  domain: string;
  name: string;
  key: string;
  owner_id?: string | null;
  timezone?: string | null;
  created_at: number;
  events: number;
  last_seen: number | null;
}

export interface Overview {
  visitors: number;
  sessions: number;
  pageviews: number;
  events: number;
  bounceRate: number;
  avgDuration: number;
  avgScroll: number;
  viewsPerSession: number;
  aiShare: number;
  searchShare: number;
  delta: Record<string, number | null>;
}

export interface SeriesPoint {
  t: number;
  label: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  ai: number;
  search: number;
  direct: number;
  social: number;
  referral: number;
  paid: number;
  email: number;
}

export interface NamedRow {
  key: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  avgDuration?: number;
  avgScroll?: number;
  share?: number;
  channel?: Channel;
  source?: string;
  engine?: string;
  landing?: string;
  color?: string;
}

export interface ChannelRow {
  channel: Channel;
  label: string;
  color: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  share: number;
}

export interface EngineRow {
  engine: string;
  key: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  share: number;
  topPage: string;
}

export interface PageRow {
  path: string;
  title: string;
  pageviews: number;
  visitors: number;
  entries: number;
  bounceRate: number;
  avgDuration: number;
  avgScroll: number;
  topChannel: Channel;
  color: string;
}

export interface Audience {
  countries: NamedRow[];
  cities: NamedRow[];
  devices: NamedRow[];
  browsers: NamedRow[];
  os: NamedRow[];
  languages: NamedRow[];
  screens: NamedRow[];
}

export interface RealtimeFeedItem {
  ts: number;
  path: string;
  title?: string;
  source: string;
  channel: Channel;
  country: string | null;
  device: string | null;
  city: string | null;
}

export interface Realtime {
  active: number;
  pageviews: number;
  perMinute: number[];
  feed: RealtimeFeedItem[];
  windowMinutes: number;
}

export interface Crawlers {
  total: number;
  bots: { bot: string; hits: number; pages: number; lastSeen: number }[];
  pages: { path: string; hits: number }[];
}

export interface StatsPayload {
  range: { key: string; label: string; from: number; to: number; bucket: string };
  overview: Overview;
  series: SeriesPoint[];
  channels: ChannelRow[];
  sources: NamedRow[];
  referrers: NamedRow[];
  engines: EngineRow[];
  queries: NamedRow[];
  campaigns: NamedRow[];
  pages: PageRow[];
  audience: Audience;
  heatmap: number[][];
  realtime: Realtime;
  crawlers: Crawlers;
  recent: unknown[];
  sessionsSample: unknown[];
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface AuditCheck {
  id: string;
  group: "seo" | "aeo" | "geo" | "tech";
  label: string;
  status: CheckStatus;
  detail: string;
  fix: string;
  weight: number;
}

export interface AuditPayload {
  ok: boolean;
  url: string;
  fetchedAt: number;
  scores: { seo: number; aeo: number; geo: number; tech: number; overall: number };
  checks: AuditCheck[];
  extracted: {
    title: string;
    description: string;
    wordCount: number;
    schemaTypes: string[];
    llmsTxt: boolean;
    responseMs: number;
    [key: string]: unknown;
  };
  error?: string;
}
