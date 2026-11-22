# SourceLens

Traffic-source intelligence you host yourself. SourceLens shows **where every visit actually came from** — organic search, AI assistants (ChatGPT, Perplexity, Claude, Gemini, Copilot), social, referral, paid, email and direct — and scores how well your site can be discovered and cited by answer engines (AEO) and generative engines (GEO).

The project has two parts:

| Part | Location | Stack | Job |
| --- | --- | --- | --- |
| API + tracker | repository root | zero-dependency Node 22, Supabase / `node:sqlite` | ingestion, classification, aggregation, auth, exports, crawler stats |
| Dashboard | `web/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 | the UI you see, typed client for the API |

The Next.js app proxies `/api/*`, `/t.js` and `/embed` to the API, so the browser only talks to one origin. That is also why Supabase auth cookies (`sl_at`, `sl_rt`) keep working: they are httpOnly, set by the Node server, and forwarded through the rewrite.

---

## 1. Run locally (two terminals)

You need **Node 22.5+** (`node:sqlite` needs `--experimental-sqlite`; the server re-execs itself with the flag, so `npm start` just works).

```bash
# terminal 1 — API + ingestion on :3001
npm install            # only needed for the web app; API has no dependencies
PORT=3001 npm start

# terminal 2 — dashboard on :3000
cd web
npm install
API_ORIGIN=http://127.0.0.1:3001 npm run dev
```

Open <http://localhost:3000>. With no Supabase env vars the API runs in **local SQLite mode** with auth disabled, so the dashboard opens straight away.

Seed realistic demo data (30 days, ~45k events, rising AI share):

```bash
curl -X POST http://localhost:3000/api/demo/seed
```

Useful scripts from the repo root:

```bash
npm run seed       # generate demo data
npm run reset      # delete local SQLite data
npm run dev        # API with --watch
```

---

## 2. How the pieces fit

```text
Browser
  │  https://app.example.com/*          (Next.js, port 3000)
  │  https://app.example.com/api/* ─────┐
  │  https://app.example.com/t.js   ─────┤ rewrites
  │  https://app.example.com/embed  ─────┘
  ▼
Node API (port 3001)
  ├── /api/collect       event ingestion (CORS, rate limit, bot detection)
  ├── /api/auth/*        Supabase Auth proxy, httpOnly cookies
  ├── /api/stats*        aggregation from raw events
  ├── /api/audit*        SEO / AEO / GEO crawler + scoring
  ├── /api/export        CSV → Supabase Storage signed URL (or direct download)
  └── store facade       Supabase adapter (production) | SQLite adapter (local)

Your website
  └── <script defer src="https://app.example.com/t.js" data-site="sl_xxx">
        └── POST /api/collect   (cookieless, daily salted visitor hash, sendBeacon)
```

### Why session-level attribution matters

A visitor who lands from Google and then opens `/pricing` generates an *internal* pageview (its referrer is your own domain). If every pageview is treated as its own "source", internal navigation becomes the biggest bucket and hides the real channels. SourceLens attributes every pageview in a session to that session's **entry** channel/source/engine/query. This is done in `lib/stats.js:attributeSessions`.

### Data model

`supabase/schema.sql` creates `sites`, `events`, `audits`, the `site_overview` RPC and a private `exports` storage bucket. RLS is enabled with no policies: only the server's service-role key can touch the tables. Browsers never see that key.

---

## 3. Supabase setup (production)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in **SQL Editor → New query**.
3. Enable Email auth in **Authentication → Providers** and set your site URL / redirect URLs.
4. Set these on the API host:

```dotenv
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>
SUPABASE_ANON_KEY=<anon key>
SUPABASE_STORAGE_BUCKET=exports
SOURCELENS_SALT=<long random string>
ALLOW_AUTO_SITE=false
CORS_ORIGIN=*
ADMIN_TOKEN=<optional, for scripted API access>
PORT=3001
```

5. Set on the **Next.js** host:

```dotenv
API_ORIGIN=https://api.your-domain.com
```

When Supabase vars are present the API switches from SQLite to Postgres automatically; the sidebar chip changes from **SQLite** to **Supabase**.

---

## 4. Deploy

### Frontend → Vercel

Import the repo, set the root directory to `web`, framework preset **Next.js**, and add `API_ORIGIN` pointing to your API host. Build command `npm run build`, output `.next`.

### API → Render / Railway / Fly.io

The root `Dockerfile` builds a zero-dependency Node image (no `npm install` needed for the API).

- **Render**: `render.yaml` is included. Set the Supabase env vars in the dashboard; health check is `/api/health`.
- **Railway**: create a service from the Dockerfile, expose port 3000 (or set `PORT`), add the same env vars.
- **Fly.io**: `fly.toml` is included; `fly deploy` then `fly secrets set SUPABASE_URL=… SUPABASE_SERVICE_KEY=… SUPABASE_ANON_KEY=… SOURCELENS_SALT=…`.

Both hosts must be HTTPS in production so the httpOnly auth cookies are sent with `Secure`.

---

## 5. Install the tracker on your site

Settings → **Install the tracker** gives you the exact snippet:

```html
<script defer src="https://app.your-domain.com/t.js" data-site="sl_xxxxxxxx"></script>
```

It records pageviews, engagement time, scroll depth, outbound clicks and downloads, works with SPAs (patches `pushState`/`replaceState`), respects Do Not Track and an explicit opt-out, and sends with `sendBeacon` where possible. It stores nothing but a session id and a daily salted visitor hash — no cookies, no IP addresses.

Optional: add `window.sourcelens.track('signup', { plan: 'pro' })` for custom events.

---

## 6. Marketing site, SEO, AEO & GEO

The Next.js app is also the public website. `/` is the landing page, and the marketing routes are `/features`, `/pricing`, `/about`, `/changelog`, `/privacy` and `/terms`. Auth lives at `/login` and `/signup`; the dashboard starts at `/overview`.

Everything public is generated as static HTML, so crawlers get fully rendered copy without executing JavaScript.

| File | What it does for discovery |
| --- | --- |
| `src/app/layout.tsx` | Canonical base URL, Open Graph, Twitter cards, robots directives and `Organization` / `WebSite` / `SoftwareApplication` JSON-LD |
| `src/app/page.tsx` | `FAQPage` JSON-LD generated from the landing page's FAQ answers |
| `src/app/robots.ts` | Indexes marketing pages, blocks the app and API, and explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended and other AI crawlers |
| `src/app/sitemap.ts` | Canonical URL list with priorities and change frequencies |
| `src/app/llms.txt/route.ts` | A markdown map for LLM crawlers — the same GEO artifact the product generates for its users |
| `src/app/opengraph-image.tsx` | Dynamically rendered 1200×630 social share image |
| `src/app/manifest.ts` | PWA manifest so the dashboard can be installed |

Set `NEXT_PUBLIC_SITE_URL` on the frontend host to your real domain so canonical tags, the sitemap, `llms.txt` and absolute OG image URLs all point to the right place. The default is `https://sourcelens.app`.

The copy itself is written for extraction: answer-first paragraphs, question-shaped FAQ headings, short citable facts and one clear entity name per page — the same principles the SEO/AEO/GEO audit scores.

---

## 7. Verification

```bash
cd web && npm run build      # type-check + production build
curl http://localhost:3000/api/health
```

The dashboard has been smoke-tested against the API for: overview, sources, pages, audience, AI visibility, SEO audit, settings, llms.txt generation, CSV export, live counter, theme switching, and the ⌘K command palette.
