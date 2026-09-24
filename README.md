# Scroll Infinity

A continuously updated, source-backed knowledge platform. Explore entities and
topics, see the key facts with provenance and freshness, and track how they
change over time.

> **Not** a content farm, a generic AI site, or a keyword machine. The goal is
> useful, searchable coverage that compounds in value. See [`brain.md`](./brain.md)
> for the governing philosophy and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
> design.

## Stack

Next.js 16 (App Router, server-rendered) · React 19 · TypeScript · Tailwind
CSS v4 · Drizzle ORM · Neon PostgreSQL · Vercel. Data from **Wikipedia** and
**Wikidata** via a single SSRF-safe fetch layer.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local     # then fill in DATABASE_URL (Neon Postgres)

# 3. Create the database schema
npm run db:migrate

# 4. Ingest the seed dataset (Wikipedia + Wikidata)
npm run ingest

# 5. Run
npm run dev                    # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (parsers, normalization, quality gate) |
| `npm run db:generate` | Generate SQL migration from the Drizzle schema |
| `npm run db:migrate` | Apply migrations |
| `npm run ingest` | Seed topics/sources and ingest entities |

## Project structure

See [`ARCHITECTURE.md`](./ARCHITECTURE.md). In short: `src/app` (routes),
`src/components` (brand, layout, ui), `src/db` (schema + client),
`src/lib` (config, types, sources, ingest, repo, seo), `scripts` (ingest),
`drizzle` (migrations).

## Data & attribution

Content is derived from [Wikipedia](https://en.wikipedia.org) (CC BY-SA) and
[Wikidata](https://www.wikidata.org) (CC0). Every fact carries source
provenance and a retrieval timestamp; historical observations are preserved
rather than overwritten. We never fabricate data.

## Environment

`DATABASE_URL` and `NEXT_PUBLIC_SITE_URL` are required; see `.env.example`.
Secrets live only in `.env.local` (git-ignored) and in the host's encrypted
environment — never committed.
