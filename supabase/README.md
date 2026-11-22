# Supabase setup — SourceLens

Four steps, about five minutes. No npm dependencies required.

## 1. Create the project

Create a Supabase project (the free tier is enough to start). Note the project ref and region.

## 2. Apply the schema

Open **SQL Editor → New query**, paste the entire contents of [`schema.sql`](./schema.sql), and click **Run**.

It creates:

| Object | Purpose |
| --- | --- |
| `public.sites` | Registered domains and their public site keys |
| `public.events` | Raw pageviews, custom events and crawler hits |
| `public.audits` | Stored SEO / AEO / GEO reports |
| `site_overview(p_owner)` | One round trip for the site switcher (counts + last seen) |
| `exports` storage bucket | Private bucket for CSV exports, served as signed URLs |
| RLS on all three tables | No policies — only the server's `service_role` key can read or write |

The SQL is idempotent (`create table if not exists`, `create index if not exists`), so re-running it is safe.

## 3. Enable email auth

**Authentication → Providers → Email** — enable it. Set **Site URL** to your dashboard origin and add the same URL under **Redirect URLs**.

If you want email confirmation, leave it on and handle the “check your inbox” state that the signup page already shows. For an instant local test, turn confirmation off.

## 4. Configure the app

Copy the example env files and fill them in:

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

In the **root `.env`**:

```dotenv
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key from Project Settings → API>
SUPABASE_ANON_KEY=<anon / publishable key>
SOURCELENS_SALT=<any long random string>
```

> The `service_role` key bypasses RLS. It belongs in the server environment only — never in `web/`, never in the browser, never in a commit.

In **`web/.env.local`**:

```dotenv
API_ORIGIN=http://127.0.0.1:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Verify

```bash
npm run supabase:check
```

The preflight checks credentials, the three tables, the RPC, the storage bucket, the auth endpoint and that anonymous clients cannot read events. Fix anything marked FAIL before continuing.

## 6. Run

```bash
# terminal 1 — API
npm start

# terminal 2 — frontend
cd web && npm run dev
```

The sidebar chip changes from **SQLite** to **Supabase** when the connection is live. Seed a realistic dataset from the dashboard (**Settings → Load demo data**) or with `npm run seed`.

## Switching from local SQLite

Local mode needs no configuration: with no Supabase variables the API uses `data/sourcelens.sqlite` and auth is open. Adding the three variables switches both storage and auth to Supabase automatically. No code changes.

## Production notes

- Serve both hosts over HTTPS so the httpOnly auth cookies are sent with `Secure`.
- Set `ALLOW_AUTO_SITE=false` so unknown tracker domains are rejected.
- Keep `SOURCELENS_SALT` stable across deploys — changing it invalidates repeat-visitor counts.
- Optional retention: schedule a daily `delete from public.events where ts < extract(epoch from now()) * 1000 - 365 * 86400000` with pg_cron.
- CSV exports are written to the private `exports` bucket and returned as 24-hour signed URLs. If storage is unreachable the API falls back to a direct download.
