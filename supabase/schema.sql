-- SourceLens — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Security model: the Node server holds the service_role key and is the only
-- client of these tables. RLS is enabled with no policies, so the anon and
-- authenticated roles can read nothing directly. Browsers only ever talk to
-- the SourceLens server.

-- ---------------------------------------------------------------- sites ----
create table if not exists public.sites (
  id          bigint generated always as identity primary key,
  domain      text   not null unique,
  name        text   not null,
  key         text   not null unique,
  owner_id    text,
  timezone    text,
  created_at  bigint not null
);

create index if not exists sites_owner_idx on public.sites (owner_id);

-- --------------------------------------------------------------- events ----
create table if not exists public.events (
  id           bigint generated always as identity primary key,
  site_id      bigint  not null references public.sites (id) on delete cascade,
  ts           bigint  not null,
  type         text    not null,
  path         text    not null,
  title        text,
  referrer     text,
  ref_domain   text,
  source       text,
  channel      text,
  engine       text,
  query        text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  country      text,
  region       text,
  city         text,
  device       text,
  browser      text,
  os           text,
  screen       text,
  lang         text,
  visitor      text,
  session      text,
  bot          integer not null default 0,
  bot_name     text,
  duration     integer not null default 0,
  scroll       integer not null default 0,
  props        text
);

create index if not exists events_site_ts_idx    on public.events (site_id, ts desc);
create index if not exists events_site_bot_idx   on public.events (site_id, bot, ts desc);
create index if not exists events_site_chan_idx  on public.events (site_id, channel, ts desc);
create index if not exists events_session_idx    on public.events (session, ts);
create index if not exists events_visitor_idx    on public.events (site_id, visitor, ts);

-- --------------------------------------------------------------- audits ----
create table if not exists public.audits (
  id         bigint generated always as identity primary key,
  site_id    bigint references public.sites (id) on delete cascade,
  url        text   not null,
  created_at bigint not null,
  seo        integer not null default 0,
  aeo        integer not null default 0,
  geo        integer not null default 0,
  payload    jsonb  not null
);

create index if not exists audits_site_idx on public.audits (site_id, created_at desc);

-- ------------------------------------------------------------ aggregates ----
-- One round trip for the site switcher (event counts + last seen).
create or replace function public.site_overview(p_owner text default null)
returns table (
  id bigint,
  domain text,
  name text,
  key text,
  owner_id text,
  timezone text,
  created_at bigint,
  events bigint,
  last_seen bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         s.domain,
         s.name,
         s.key,
         s.owner_id,
         s.timezone,
         s.created_at,
         coalesce(count(e.id) filter (where e.bot = 0), 0) as events,
         max(e.ts) as last_seen
    from public.sites s
    left join public.events e on e.site_id = s.id
   where p_owner is null or s.owner_id = p_owner
   group by s.id
   order by s.created_at asc;
$$;

revoke all on function public.site_overview(text) from public, anon, authenticated;
grant execute on function public.site_overview(text) to service_role;

-- --------------------------------------------------------------- storage ----
-- Private bucket for CSV exports and audit artifacts, served via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('exports', 'exports', false, 52428800)
on conflict (id) do nothing;

-- ------------------------------------------------------------ lock down ----
alter table public.sites  enable row level security;
alter table public.events enable row level security;
alter table public.audits enable row level security;

-- No policies are created on purpose: only the service_role key (used by the
-- SourceLens server) can read or write. Do not add permissive policies unless
-- you intend to expose these tables to client-side keys.

-- ------------------------------------------------------------- retention ----
-- Optional: schedule a daily cleanup of raw events older than 365 days.
-- (Supabase Dashboard → Database → Cron, or pg_cron.)
-- delete from public.events where ts < (extract(epoch from now()) * 1000 - 365 * 86400000);
