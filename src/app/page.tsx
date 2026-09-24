import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { SearchField } from "@/components/ui/SearchField";
import { Stat } from "@/components/ui/Stat";
import { EntityCard } from "@/components/ui/EntityCard";
import { TopicCard } from "@/components/ui/TopicCard";
import { ChangeRow } from "@/components/ui/ChangeRow";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { formatNumber, relativeTime } from "@/lib/format";
import {
  getRecentChanges,
  getRecentlyUpdated,
  getStats,
  listTopics,
} from "@/lib/repo";

export const revalidate = 1800;

export default async function HomePage() {
  const [stats, topics, recent, changes] = await Promise.all([
    getStats(),
    listTopics(),
    getRecentlyUpdated(6),
    getRecentChanges(6),
  ]);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd()} />

      {/* Hero */}
      <Container as="section" className="hero">
        <div className="hero__inner">
          <p className="eyebrow">A living universe of information</p>
          <h1 className="hero__title">
            Explore what we know — and how it changes.
          </h1>
          <p className="hero__lede">
            Scroll Infinity organizes public knowledge into clear, source-backed
            pages: the key facts, where they come from, and how they move over
            time.
          </p>
          <div className="hero__search">
            <SearchField
              size="lg"
              label="Search Scroll Infinity"
              placeholder="Search entities and topics…"
            />
          </div>
          <p className="hero__hint">
            Start with a <Link href="/topics">topic</Link> or see{" "}
            <Link href="/latest">what changed recently</Link>.
          </p>
        </div>
      </Container>

      {/* Live summary */}
      {stats.entities > 0 && (
        <Container as="section" className="section section--tight">
          <Reveal>
            <div className="stat-row">
              <Stat value={formatNumber(stats.entities)} label="Entities" />
              <Stat
                value={formatNumber(stats.verifiedFacts)}
                label="Sourced facts"
              />
              <Stat value={formatNumber(stats.topics)} label="Topics" />
              <Stat
                value={formatNumber(stats.observations)}
                label="Observations"
                desc={
                  stats.lastUpdatedAt
                    ? `Updated ${relativeTime(stats.lastUpdatedAt)}`
                    : undefined
                }
              />
            </div>
          </Reveal>
        </Container>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <Container as="section" className="section">
          <Reveal>
            <div className="section-head">
              <h2 className="section-head__title">Explore by topic</h2>
              <Link href="/topics" className="section-head__link">
                All topics →
              </Link>
            </div>
            <div className="card-grid card-grid--topics">
              {topics.map((topic) => (
                <TopicCard key={topic.slug} topic={topic} />
              ))}
            </div>
          </Reveal>
        </Container>
      )}

      {/* Recently updated */}
      {recent.length > 0 && (
        <Container as="section" className="section">
          <Reveal>
            <div className="section-head">
              <h2 className="section-head__title">Recently updated</h2>
              <Link href="/latest" className="section-head__link">
                See latest →
              </Link>
            </div>
            <div className="card-grid">
              {recent.map((entity) => (
                <EntityCard key={entity.slug} entity={entity} />
              ))}
            </div>
          </Reveal>
        </Container>
      )}

      {/* Recent changes */}
      {changes.length > 0 && (
        <Container as="section" className="section">
          <Reveal>
            <div className="section-head">
              <h2 className="section-head__title">Changed recently</h2>
              <Link href="/latest" className="section-head__link">
                Full change log →
              </Link>
            </div>
            <div className="change-list">
              {changes.map((change, i) => (
                <ChangeRow key={`${change.entitySlug}-${i}`} change={change} />
              ))}
            </div>
          </Reveal>
        </Container>
      )}

      {/* CTA */}
      <Container as="section" className="section">
        <Reveal>
          <div className="cta">
            <h2 className="cta__title">Keep exploring</h2>
            <p className="cta__lede">
              Every page links onward — to related entities, topics, and the
              sources behind each fact.
            </p>
            <div className="cta__actions">
              <ButtonLink href="/topics">Browse topics</ButtonLink>
              <ButtonLink href="/search" variant="ghost">
                Search everything
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </>
  );
}
