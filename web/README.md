# SourceLens web

This is the Next.js frontend: the marketing site, auth screens and dashboard. The API, database schema and deployment configs live in the [repository root](../README.md).

```bash
cp .env.example .env.local
npm install
npm run dev
```

- `API_ORIGIN` points to the Node API (default `http://127.0.0.1:3001`).
- `NEXT_PUBLIC_SITE_URL` sets canonical URLs, the sitemap, `llms.txt` and OG image URLs.
- `npm run build` runs TypeScript and produces the production build.
