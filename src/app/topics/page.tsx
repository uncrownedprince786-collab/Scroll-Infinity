import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TopicCard } from "@/components/ui/TopicCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { listTopics } from "@/lib/repo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Topics",
  description:
    "Browse Scroll Infinity by topic — maps into a growing universe of source-backed entities.",
  path: "/topics",
});

export default async function TopicsPage() {
  const topics = await listTopics();

  return (
    <Container>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
        ])}
      />
      <div className="page-crumbs">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Topics" }]} />
      </div>

      <header className="page-head">
        <p className="eyebrow">Explore</p>
        <h1 className="page-head__title">Topics</h1>
        <p className="page-head__lede">
          Each topic is a map into the information universe — the entities,
          facts, and changes that belong together.
        </p>
      </header>

      <section className="section section--tight">
        {topics.length > 0 ? (
          <div className="card-grid card-grid--topics">
            {topics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__title">No topics yet</div>
            <p>The index is warming up. Check back shortly.</p>
          </div>
        )}
      </section>
    </Container>
  );
}
