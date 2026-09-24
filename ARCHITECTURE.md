# Scroll Infinity — Architecture

Concise architecture document (see `brain.md` for governing philosophy).

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict).
- **Rendering**: Server Components + SSR/ISR. Primary content is server-rendered
  HTML (spec §11, §31). Client JS only where necessary (mobile menu,
  scroll-aware header, reveal-on-scroll observer).
- **Styling**: Tailwind CSS v4 + a CSS-variable design system (`globals.css`).
  No animation/UI libraries; motion via CSS transform/opacity + a tiny
  IntersectionObserver, `prefers-reduced-motion` respected.
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM (`neon-http`
  driver — one HTTPS request per query, ideal for Vercel serverless).
- **Hosting**: Vercel (`scrollinfinityhq.vercel.app`), auto-deploy from GitHub.
- **Data sources (current)**: Wikipedia (REST summary) + Wikidata (Action API),
  both keyless and via a single SSRF-safe fetch choke point.

## Layout

```
src/
  app/                     # routes (server components) + metadata files
    layout.tsx             # shell: header/footer, fonts, SEO base
    page.tsx               # homepage
    entity/[slug]/         # entity pages (primary SEO landing type)
    topics/ , topics/[slug]/
    search/ , latest/
    about/ , methodology/
    sitemap.ts , robots.ts
    icon.svg , apple-icon.tsx , opengraph-image.tsx
  components/
    brand/                 # Logo, Wordmark, Mark
    layout/                # Header, Footer, Container
    ui/                    # Card, Badge, EntityCard, TopicCard, ChangeRow, ...
    JsonLd.tsx
  db/
    schema.ts              # Drizzle schema (spec §35 subset)
    client.ts              # Neon + Drizzle client
  lib/
    config.ts              # site + server config (env access)
    types.ts               # domain types (the shared contract)
    hash.ts , slug.ts , format.ts , seo.ts
    sources/               # base (fetch + SSRF allowlist), wikipedia, wikidata
    normalize.ts , quality.ts
    ingest/                # pipeline, writes (+ change detection), relationships
    repo/                  # read API the pages render from (server-only)
    data/seed.ts           # curated seed of Wikipedia titles + topics
scripts/ingest.ts          # CLI: seed + ingest + build relationships
drizzle/                   # generated SQL migrations (committed)
```

## Data model (implemented subset of spec §35)

`sources`, `source_fetches` (provenance of each retrieval), `entities`
(+ `page_state`, `indexable`, `quality_score`, `content_hash`),
`entity_aliases`, `entity_attributes` (current values with jsonb `provenance`),
`observations` (append-only archive), `changes` (detected material changes),
`topics`, `topic_entities`, `entity_relationships`, `search_queries`,
`system_events`. Indexed by real query patterns; FKs cascade from `entities`.

The archive principle (spec §13): every ingest appends `observations` and, on a
material value change, writes a `changes` row — so history is preserved, not
overwritten. `content_hash` on entities lets change detection skip no-op work.

## Ingestion pipeline (spec §17–21)

`title → fetch (Wikipedia summary + Wikidata facts) → normalize → resolve →
assess quality → upsert (entity, aliases, attributes+observations+changes,
topics) → build relationships`. Verification states are assigned honestly:
single-source facts are `supported`, not `verified`. The quality gate
(`lib/quality.ts`) decides `indexable`/`page_state`; **public reads only return
indexable entities**, so URL existence never implies a served page (spec §21).

## SEO

Per-page `generateMetadata` (unique title/description, canonical), server-
rendered content, JSON-LD (WebSite+SearchAction, Organization, Thing,
CollectionPage, BreadcrumbList) via `lib/seo.ts`, breadcrumbs, relationship-
aware internal links, `sitemap.ts` (indexable URLs only, real lastmod),
`robots.ts`. No fake structured data.

## Security (spec §41)

- Single fetch choke point with an HTTPS host allowlist (Wikimedia only) →
  no SSRF; entity slugs and Wikidata ids are validated by format.
- Secrets only in env (`DATABASE_URL`, `INGEST_SECRET`), never committed.
- Fail-safe reads: the homepage renders even if the DB is briefly unavailable.

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical base URL |
| `SOURCE_USER_AGENT_CONTACT` | recommended | Contact in crawler User-Agent |
| `INGEST_SECRET` | recommended | Protects the admin re-ingest route |

See `.env.example`. R2 / GSC / Bing vars are listed for future milestones.

## Commands

```
npm run dev         # local dev
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest (parsers, normalize, quality — fixture-based)
npm run db:generate # drizzle: generate SQL from schema
npm run db:migrate  # apply migrations to the database
npm run ingest      # seed + ingest sources into the database
npm run build       # production build
```

## Deferred to later milestones (intentionally, per spec §52)

Cloudflare R2 raw-archive adapter (§14); Puppeteer browser-automation adapter
and the discovery scheduler with locks/backoff (§16, §36); additional source
adapters (OpenAlex, GDELT, Data Commons, Common Crawl — §15); Google Search
Console + Bing feedback loops (§26–27); internal admin/operations surface (§42);
saved entities / followed topics (§28); charts/visualizations beyond tables
(§12); display advertising (§33). Each slots behind an existing adapter or
interface without reshaping the core.
