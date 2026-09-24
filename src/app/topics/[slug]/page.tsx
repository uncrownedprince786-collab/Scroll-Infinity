import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EntityCard } from "@/components/ui/EntityCard";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { breadcrumbJsonLd, pageMetadata, topicJsonLd } from "@/lib/seo";
import {
  getAllTopicSlugs,
  getTopicBySlug,
  listEntitiesByTopic,
  listTopics,
} from "@/lib/repo";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllTopicSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: "Not found" };
  return pageMetadata({
    title: topic.name,
    description:
      topic.description || `Entities and changes across ${topic.name}.`,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: Params) {
  const { slug } = await params;
  const [topic, entities, allTopics] = await Promise.all([
    getTopicBySlug(slug),
    listEntitiesByTopic(slug),
    listTopics(),
  ]);
  if (!topic) notFound();

  const related = allTopics.filter((t) => t.slug !== topic.slug).slice(0, 5);

  return (
    <Container>
      <JsonLd
        data={topicJsonLd(
          topic,
          entities.map((e) => absoluteUrl(`/entity/${e.slug}`)),
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
          { name: topic.name, path: `/topics/${topic.slug}` },
        ])}
      />
      <div className="page-crumbs">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Topics", href: "/topics" },
            { label: topic.name },
          ]}
        />
      </div>

      <header className="page-head">
        <p className="eyebrow">Topic</p>
        <h1 className="page-head__title">{topic.name}</h1>
        <p className="page-head__lede">{topic.description}</p>
        <div className="page-head__meta">
          <span className="topic-card__count">
            <strong>{formatNumber(topic.entityCount)}</strong>{" "}
            {topic.entityCount === 1 ? "entity" : "entities"}
          </span>
        </div>
      </header>

      <section className="section section--tight">
        {entities.length > 0 ? (
          <div className="card-grid">
            {entities.map((entity) => (
              <EntityCard key={entity.slug} entity={entity} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__title">Nothing here yet</div>
            <p>Entities for this topic are being gathered.</p>
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-head__title">Related topics</h2>
          </div>
          <div className="chips">
            {related.map((t) => (
              <Link key={t.slug} href={`/topics/${t.slug}`} className="tag">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
