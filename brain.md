# Scroll Infinity — brain.md

> Read this file before making changes. It is the governing philosophy for the
> project. It is derived from the product owner's specification and is the
> source of truth for intent. Engineering decisions must serve the Mission and
> respect the Principles below.

## Mission

Build Scroll Infinity as a global, continuously growing information platform.
The product discovers useful public information, organizes it into a structured
knowledge system, preserves historical data, detects changes, creates or
updates genuinely useful pages, and makes the information easy for both humans
and search engines to understand.

The long-term goal is a large, trusted, fast, searchable information universe
that compounds in value as its database, historical archive, entity
relationships, search coverage, and returning audience grow.

- Do **not** build a content farm.
- Do **not** build a generic AI website.
- Do **not** build a keyword-stuffing system.
- Do **not** optimize for URL count.
- **Optimize for useful, searchable coverage.**

## 1. Engineering principles

1. Read this brain.md before making changes.
2. Read the existing code before designing a replacement.
3. Preserve the existing architecture unless there is a strong technical reason to change it.
4. Reuse existing components, utilities, libraries and patterns before creating new ones.
5. Follow the YAGNI ladder: Does this need to exist? Is it already in the codebase? Can the standard library/platform do it? Can an installed dependency do it? What is the minimum necessary implementation?
6. Never remove validation, security, accessibility, error handling, observability or data-loss protection merely to reduce code.
7. Avoid speculative abstractions. 8. Avoid premature microservices. 9. Avoid unnecessary dependencies.
10. No fake production data. 11. No hardcoded production content. 12. No unrelated refactors. 13. No secrets committed to the repository. 14. Use environment variables for credentials and source configuration.
15. Production failures must fail safely and visibly. 16. Every significant implementation must be tested before completion.

## 2. Ponytail

Use the Ponytail coding philosophy (DietrichGebert/ponytail): "the best code is
the code you never wrote" — minimal, necessary implementations that reuse
existing infrastructure. Ponytail never means careless code. Always keep:
security, input validation, source restrictions, error handling, accessibility,
data integrity, concurrency protection, and tests. The purpose is to prevent
overengineering, not to remove necessary engineering.

Installing the Ponytail Claude Code plugin (`/plugin marketplace add
DietrichGebert/ponytail` then `/plugin install ponytail@ponytail`) is an
interactive Claude Code operation to run in a terminal session; the philosophy
is followed regardless.

## 3–6. Product identity, logo, UI/UX, motion

- **Brand**: Scroll Infinity — a continuously expanding, living information universe. Explore endlessly; discover continuously. Not an AI startup, crypto product, SaaS dashboard, SEO farm, generic news site, or template marketplace.
- **Logo**: a custom minimal wordmark + symbol combining a continuous scroll path, an infinity loop, and subtle forward movement. Geometric, premium, monochrome-first, works in pure black & white and at 16px. No AI-spark/robot/circuit/neural clichés, no glow/3D/gradient reliance.
- **UI/UX**: premium editorial design + interactive data product. Calm, clear, highly polished: excellent typography, strong spacing, clear hierarchy, large readable numbers, elegant cards only where useful, subtle borders, restrained shadows, clean charts, beautiful tables, source indicators, timestamps, thoughtful empty states, excellent mobile layouts. Avoid glassmorphism excess, neon, purple AI gradients, animated blobs, clutter, dashboard overcrowding.
- **Motion**: subtle reveals, transform+opacity transitions, elegant number/chart transitions, sticky-nav transitions. Never hijack native scroll, no heavy parallax, don't animate everything at once, don't block content, respect `prefers-reduced-motion`, prefer transform/opacity.

## 7–11. Pages

- **Homepage** (entry point, not a dump): header → brand intro → global search → live summary → trending/changing → topic discovery → recently updated → interactive data showcase → popular paths → archive discovery → explore deeper → footer. Each section answers "what can I discover next?"
- **Header**: minimal. Desktop: Logo, Explore, Latest, Topics, Search. Mobile: Logo, Search, Menu. Sticky only where it helps.
- **Search** (first-class): entities, topics, categories, comparisons, attributes, historical records, natural questions. Results show title, factual description, category, freshness, key metric, source indicator. Fast, server-side, indexed. Avoid empty-data results.
- **Topic pages**: maps into the universe — intro, key stats, trending changes, main entities, subcategories, comparisons, historical timeline, recently updated, related topics, sources. Adapt to available data; never force a template the data can't support.
- **Entity pages** (most important SEO landing type): above the fold — name, one-line description, current key info, last-verified timestamp, primary visual, source indicator. Then key facts, current state, what changed, history, comparisons, related entities/topics, relevant questions, sources, methodology. The most important factual answer must be in server-rendered HTML.

## 12. Data visualization

Charts only where they beat text: line (change over time), bar (comparisons),
timeline (events), tables (precise values), small trend indicators, maps where
geographic. Readable on mobile. No decorative charts.

## 13–14. Data archive & raw storage

Preserve historical truth; do not only store the latest value. Every meaningful
observation can retain: source, source URL, retrieval timestamp, raw response
reference, normalized data, parser version, hash/checksum, previous value, new
value, detected change, verification status, confidence, entity relationship.
Model = CURRENT DATA + HISTORICAL SNAPSHOTS + SOURCE PROVENANCE.

Separate operational DB records from raw/archive objects. DB holds current
structured info, relationships, metadata, page/crawl/quality state. Object
storage (e.g. Cloudflare R2 — free tier is a suitable start) holds raw HTML,
snapshots, large responses, manifests. The storage adapter must be replaceable;
do not architect around a vendor-specific interface.

## 15. Source strategy

Priority: official public APIs → official feeds/RSS/Atom → open datasets →
structured knowledge bases → public archives → permitted source websites →
browser automation (last resort). Build adapters, not hardcoded sources.
Candidates: Common Crawl, Wikimedia, Wikidata, GDELT, OpenAlex, Data Commons,
Internet Archive, public gov/open-data, RSS/Atom. Every adapter has: health
state, error count, last success, rate limit, crawl interval, parser version,
trust config, enabled/disabled. Source availability is never assumed permanent.

## 16. Puppeteer

Browser automation is a tool, not the intelligence layer, and is scheduled with
specific targets — never endless random searching. Never bypass robots,
auth walls, CAPTCHAs, paywalls, anti-bot, or access controls; never build
evasion; never hammer a source; respect rate limits and terms.

## 17–20. Discovery, validation, dedup, change detection

- **Discovery** asks: what new info exists, what changed, what entities/relationships/attributes are missing, what sources changed, what pages are incomplete, what search intent is uncovered. Outputs: new/updated entity, new relationship, changed/missing attribute, possible duplicate, candidate topic/page.
- **Validation** (never publish blindly): extract → normalize → validate format → resolve entity → compare existing → compare other sources → store provenance → assign verification state → publish or hold. States: verified, supported, conflicting, unverified, stale, rejected.
- **Deduplication**: canonical entity resolution with aliases across spelling variants, abbreviations, URLs, source ids, languages. Do not create N pages for one entity.
- **Change detection**: track current/previous value, source hash, content hash, timestamp; distinguish material vs cosmetic; only meaningful changes trigger expensive downstream work.

## 21. Page quality gate (HARD RULE)

A page must not become indexable just because a URL can be generated. Before an
indexable page: real user intent exists; enough useful, materially-useful,
reliable information exists; not a duplicate; meaningful relationships; clear
purpose; not a thin template combination; stands on its own; adds value beyond
repeating a source. States: candidate, draft, published, indexable, noindex,
merged, archived. **Database size and page count are not success metrics.**

## 22–25. Programmatic SEO, SEO foundation, sitemaps, internal linking

- **Programmatic SEO** only where the data provides real standalone value along meaningful dimensions (entity, topic, category, location, time, comparison, history, relationship, attribute). No `/entity/value-a`, `/value-b` combinatorial spam.
- **SEO foundation** (every indexable page): unique title & useful description, canonical URL, crawlable server-rendered main content, semantic HTML, descriptive headings, contextual internal links, breadcrumbs, relevant structured data, Open Graph, correct robots, sitemap inclusion when canonical, accurate lastmod. No fake structured data.
- **Sitemaps**: sitemap index, segmented; include only canonical/indexable/valid/successful URLs; meaningful lastmod. Do not dump every record.
- **Internal linking**: relationship-aware, contextual (related/same-category/same-parent/location/period/similar/comparison/history/recently-updated/strong semantic). No giant link clouds.

## 26–27. Search Console & Bing

Connect Google Search Console API once verified (free, quota-limited) and use
impressions/clicks/CTR/position/queries/pages/countries/devices as product
feedback (improve titles/completeness/intent/links/freshness; decide whether new
intents deserve pages; improve existing pages rather than duplicate). Never
manipulate clicks/impressions. Support Bing Webmaster Tools (current REST APIs)
as a secondary, provider-adaptable integration.

## 28–30. Return visitors, traffic, information architecture

- **Return visitors**: latest updates, changed-today, historical timelines, live info, saved entities, followed topics, notifications (later), comparison history. No account required for basic discovery.
- **Traffic**: primarily organic search; secondarily direct/referral/communities/shareable pages/linkable data/embeddable widgets. Create genuinely link-worthy assets. Never manufacture backlinks or spam.
- **Architecture**: a graph, not a pile of URLs — TOPIC → SUBTOPIC → ENTITY → ATTRIBUTES → EVENTS → HISTORY → RELATIONSHIPS → COMPARISONS → RELATED TOPICS. URL structure reflects real hierarchy.

## 31–32. Performance & accessibility

Server-render primary content (Next.js SSR/ISR). Minimize client JS, lazy-load
noncritical media, reserve dimensions (images/ads/charts), avoid layout shift,
avoid heavy animation libs. Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
Accessibility is mandatory: keyboard nav, focus states, semantic HTML, labels,
contrast, reduced motion, screen-reader-friendly interaction, textual context
for tables/charts.

## 33–34. Ads & analytics

Ads never dominate; reserve predictable areas to avoid layout shift; no
deceptive UI; no click encouragement; trust is part of the business model.
Track aggregate product-health events (page_view, search, result_click,
topic/entity_open, comparison_open, share, return_visit, follow, save) and
health metrics without unnecessary personal data; respect privacy laws/consent.

## 35–37. Database, scheduler, crawl priority

- **DB model** (min): sources, source_jobs, source_fetches, raw_archive_objects, entities, entity_aliases, entity_attributes, entity_relationships, observations, observation_history, changes, topics, topic_entities, pages, page_versions, page_quality, page_relationships, crawl_queue, discovery_queue, search_queries, search_performance, sitemaps, system_events. Don't over-normalize blindly; index by real query patterns; protect against races in concurrent crawlers.
- **Scheduler**: one authoritative model; jobs have unique ids, lock/lease, retries, exponential backoff, timeout, max attempts, status, heartbeat, idempotency. A job running twice must not duplicate records/pages.
- **Crawl priority**: by change frequency, importance, traffic, search demand, freshness, source reliability, volatility, page importance, user activity. High-change/high-value → frequent; stale/dead → backoff.

## 38–40. Resources, source failure, archive growth

Start free/low-cost; scale later. Use caching, batching, incremental updates,
conditional requests, dedup, concurrency limits, queueing, compact records,
compression, retention, prioritization. Never re-crawl fully when incremental
exists. No single source is a single point of failure: on failure retain prior
verified info, mark freshness correctly, retry with backoff, use alternatives,
surface health, never invent data. Archive grows with retention tiers (hot /
warm / cold); dedupe raw objects by content hash.

## 41–43. Security, admin, observability

- **Security**: secure cookies, CSRF where relevant, rate limiting, input validation, output encoding, SQL-injection & SSRF protection, crawler domain allowlists, safe redirects, secret management, webhook verification, abuse controls, admin auth, audit logs, safe file handling. Never allow arbitrary user-supplied URLs to make the server an SSRF proxy.
- **Admin/operations** (internal only): source health, crawl/failed jobs, queue size, new/changed entities, page generation, indexable/noindex counts, archive size, DB health, search performance, top pages, recent errors.
- **Observability**: structured events (job id, source, entity id, duration, result, error class, retry count, parser version); never log secrets; alert on crawler failure spikes, DB errors, queue growth, source failures, unusual page creation, unusual traffic, sitemap failures.

## 44–47. Testing, SEO verification, deployment, definition of done

- **Test**: source parsers, normalization, dedup, entity resolution, change detection, page-quality rules, sitemap/canonical/metadata/robots generation, crawl locking, retry logic, DB constraints, critical UI, mobile layout. Use fixtures for source pages.
- **Production SEO verification**: homepage/critical-page status, canonicals, robots.txt, sitemaps/index, metadata, structured data, internal links, 404, redirects, mobile rendering, server-rendered content, page speed, no accidental noindex/duplicate URLs, no broken source links, no placeholder content.
- **Deployment flow**: inspect → implement → typecheck → lint → test → build → verify → commit → push → deploy → production smoke test. Never say "done" just because local code compiles.
- **Definition of done**: works; existing behavior intact; types/lint/tests/build pass; production & mobile & SEO behavior verified; no secrets; no unnecessary deps; repo clean.

## 48. Product growth loop

DISCOVER → EXTRACT → VALIDATE → RESOLVE → STORE → ARCHIVE → DETECT CHANGE →
UPDATE → QUALIFY → PUBLISH → INTERLINK → INDEX → OBSERVE → LEARN → IMPROVE →
DISCOVER AGAIN. The site should compound: every useful record improves the
graph, every relationship improves navigation, every change improves freshness,
every Search Console signal improves future decisions.

## 49–51. What not to do / success metrics / final standard

- **Never**: mass-generate empty pages, keyword-stuff, copy source content as our own, invent facts/statistics/reviews, create fake freshness, generate useless URLs, manipulate search engines, fake backlinks, spam communities, use misleading titles, hide important content behind JS, slow pages for gimmicks, add impressive-sounding features of little value, expose crawler controls publicly, allow arbitrary external URL fetching, or let one failed source collapse the platform.
- **Success metrics** (not page count): indexed useful pages, organic impressions/clicks, CTR, average position, query coverage, unique entities, verified observations, meaningful updates, return visitors, pages/session, search success, crawl efficiency, source success rate, data freshness, page performance, revenue per 1k sessions. A smaller number of strong pages beats millions of empty pages.
- **Final standard**: fast, beautiful, quiet, useful, credible, searchable, fresh, well-organized, mobile-first, accessible, data-driven, continuously improving. Must scale from a small dataset to millions without redesigning the core. Don't optimize prematurely for enormous scale; build architecture that can scale without unnecessary complexity.

## 52–53. First implementation rule & supervision

Before app code: inspect the repo, use Ponytail, create/update brain.md, create
a concise architecture doc, identify infrastructure, free data sources, and env
vars, implement the smallest complete vertical slice, verify end-to-end, then
expand. Don't build speculative modules for every future scenario — power comes
from composable adapters and a strong data model. When ambiguous, prefer real
user value, data quality, discoverability, extensibility, lower operational
risk, less code, lower cost, protected UX; choose the simpler working option;
skip impressive-but-low-value features; never trade data integrity for a
shortcut; use the platform natively when possible. Build like a senior engineer:
think first, then write only what is necessary.

---

## Implementation status

See `ARCHITECTURE.md` for the concrete architecture and the current
milestone's scope, decisions, and what is intentionally deferred.
