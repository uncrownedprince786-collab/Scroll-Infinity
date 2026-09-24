import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { SearchField } from "@/components/ui/SearchField";
import { VerificationBadge } from "@/components/ui/Badge";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { pageMetadata } from "@/lib/seo";
import { logSearchQuery, searchEntities } from "@/lib/repo";

// Query-result pages carry no standalone indexing value.
export const metadata: Metadata = pageMetadata({
  title: "Search",
  description: "Search entities and topics across Scroll Infinity.",
  path: "/search",
  noindex: true,
});

type Params = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Params) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length >= 2 ? await searchEntities(query, 30) : [];
  if (query.length >= 2) await logSearchQuery(query, results.length);

  return (
    <Container>
      <header className="page-head">
        <p className="eyebrow">Search</p>
        <h1 className="page-head__title">Search</h1>
        <div className="hero__search" style={{ marginTop: "var(--space-5)" }}>
          <SearchField
            size="lg"
            defaultValue={query}
            autoFocus
            label="Search Scroll Infinity"
            placeholder="Search entities and topics…"
          />
        </div>
      </header>

      <section className="section section--tight">
        {query.length < 2 ? (
          <div className="empty">
            <div className="empty__title">Start typing</div>
            <p>Search for an entity or topic — try “Japan”, “Mars”, or “DNA”.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            <div className="empty__title">No results for “{query}”</div>
            <p>
              Try a different spelling, or{" "}
              <Link href="/topics">browse topics</Link>.
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--muted)", marginBottom: "var(--space-4)" }}>
              {results.length} result{results.length === 1 ? "" : "s"} for “
              {query}”
            </p>
            <div className="results">
              {results.map((r) => (
                <article className="result" key={r.slug}>
                  <h2 className="result__title">
                    <Link href={`/entity/${r.slug}`}>{r.name}</Link>
                  </h2>
                  {r.description && <p className="result__desc">{r.description}</p>}
                  <div className="result__meta">
                    {r.topicSlugs.slice(0, 3).map((s) => (
                      <Link key={s} href={`/topics/${s}`} className="tag">
                        {s}
                      </Link>
                    ))}
                    <VerificationBadge state={r.verification} />
                    <FreshnessBadge iso={r.updatedAt} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </Container>
  );
}
