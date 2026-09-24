<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Scroll Infinity — working agreement

**Read [`brain.md`](./brain.md) before making changes.** It is the governing
philosophy. Follow the Ponytail YAGNI ladder: reuse before adding, prefer the
platform, write the minimum that works — but never cut validation, security,
accessibility, error handling, or tests.

## Non-negotiables

- **No fabricated data.** Parse only what a source returns; omit missing fields.
- **All outbound fetches go through `src/lib/sources/base.ts`** (host allowlist,
  SSRF protection). Never call `fetch` directly for sources.
- **Secrets only in env** (`.env.local`, host env). Never commit them.
  `.env.example` documents the surface with placeholders.
- **Public reads only serve indexable entities.** The page-quality gate
  (`src/lib/quality.ts`) decides `indexable`/`page_state`; a generatable URL is
  not a page (spec §21).
- **Server-render primary content.** Client JS only where necessary; respect
  `prefers-reduced-motion`; reserve image dimensions (no layout shift).
- **Preserve history.** Ingest appends `observations` and records material
  `changes`; it does not overwrite the archive.

## Definition of done (spec §46–47)

`typecheck` + `lint` + `test` + `build` pass; production, mobile, and SEO
behavior verified; no secrets; no unnecessary deps; repo clean.

## Layout & conventions

Data types live in `src/lib/types.ts` (the shared contract). Reads:
`src/lib/repo` (server-only). Writes/ingest: `src/lib/ingest`. Design tokens:
`src/app/globals.css` (CSS variables). Match existing style: strict TS, named
exports, small focused modules, comments only where they add signal.

