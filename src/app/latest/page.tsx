import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EntityCard } from "@/components/ui/EntityCard";
import { ChangeRow } from "@/components/ui/ChangeRow";
import { pageMetadata } from "@/lib/seo";
import { getRecentChanges, getRecentlyUpdated } from "@/lib/repo";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: "Latest",
  description:
    "Recently updated entities and the newest detected changes across Scroll Infinity.",
  path: "/latest",
});

export default async function LatestPage() {
  const [recent, changes] = await Promise.all([
    getRecentlyUpdated(12),
    getRecentChanges(24),
  ]);

  return (
    <Container>
      <div className="page-crumbs">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Latest" }]} />
      </div>
      <header className="page-head">
        <p className="eyebrow">Fresh</p>
        <h1 className="page-head__title">Latest</h1>
        <p className="page-head__lede">
          What moved most recently — updated entities and newly detected changes.
        </p>
      </header>

      <section className="section section--tight">
        <div className="section-head">
          <h2 className="section-head__title">Recently updated</h2>
        </div>
        {recent.length > 0 ? (
          <div className="card-grid">
            {recent.map((entity) => (
              <EntityCard key={entity.slug} entity={entity} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__title">Nothing yet</div>
            <p>Updates will appear here as the index grows.</p>
          </div>
        )}
      </section>

      {changes.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-head__title">Recent changes</h2>
          </div>
          <div className="change-list">
            {changes.map((change, i) => (
              <ChangeRow key={`${change.entitySlug}-${i}`} change={change} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
