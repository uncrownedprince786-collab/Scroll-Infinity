import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { VerificationBadge } from "@/components/ui/Badge";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { SourceTag } from "@/components/ui/SourceTag";
import { ChangeRow } from "@/components/ui/ChangeRow";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, entityJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { getAllIndexableEntities, getEntityBySlug } from "@/lib/repo";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const entities = await getAllIndexableEntities();
  return entities.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntityBySlug(slug);
  if (!entity) return { title: "Not found" };
  return pageMetadata({
    title: entity.name,
    description:
      entity.description ||
      `${entity.name}: key facts, sources, and how they change over time.`,
    path: `/entity/${entity.slug}`,
    images: entity.primaryImage ? [entity.primaryImage.url] : undefined,
  });
}

const NUMERIC = /^[\d.,\s+\-]+$/;

export default async function EntityPage({ params }: Params) {
  const { slug } = await params;
  const entity = await getEntityBySlug(slug);
  if (!entity) notFound();

  return (
    <Container as="article">
      <JsonLd data={entityJsonLd(entity)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
          { name: entity.name, path: `/entity/${entity.slug}` },
        ])}
      />

      <div className="page-crumbs">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Topics", href: "/topics" },
            { label: entity.name },
          ]}
        />
      </div>

      {/* Above the fold */}
      <header className="page-head">
        {entity.topicSlugs.length > 0 && (
          <div className="chips">
            {entity.topicSlugs.map((s) => (
              <Link key={s} href={`/topics/${s}`} className="tag">
                {s}
              </Link>
            ))}
          </div>
        )}
        <h1 className="page-head__title">{entity.name}</h1>
        {entity.description && (
          <p className="page-head__lede">{entity.description}</p>
        )}
        <div className="page-head__meta">
          <VerificationBadge state={entity.verification} />
          <FreshnessBadge iso={entity.lastVerifiedAt} />
          <span style={{ color: "var(--faint)", fontSize: "0.85rem" }}>
            Last verified {formatDate(entity.lastVerifiedAt)}
          </span>
        </div>
      </header>

      {/* Image + intro */}
      {(entity.primaryImage || entity.longDescription) && (
        <div
          className={
            entity.primaryImage ? "entity-hero" : "entity-hero entity-hero--noimg"
          }
        >
          {entity.primaryImage && (
            <div className="entity-hero__media">
              <Image
                src={entity.primaryImage.url}
                alt={entity.primaryImage.alt}
                fill
                sizes="(max-width: 880px) 100vw, 620px"
                className="entity-hero__img"
                priority
              />
            </div>
          )}
          {entity.longDescription && (
            <div className="entity-hero__intro">{entity.longDescription}</div>
          )}
        </div>
      )}

      {/* Key facts */}
      {entity.attributes.length > 0 && (
        <section className="section">
          <h2 className="section-head__title">Key facts</h2>
          <div className="facts" style={{ marginTop: "var(--space-5)" }}>
            {entity.attributes.map((attr) => {
              const isNum =
                typeof attr.numeric === "number" ||
                (NUMERIC.test(attr.value) && attr.value.trim() !== "");
              const value =
                attr.unit && isNum ? `${attr.value} ${attr.unit}` : attr.value;
              return (
                <div className="facts__row" key={attr.key}>
                  <div className="facts__label">{attr.label}</div>
                  <div
                    className={
                      isNum ? "facts__value facts__value--num" : "facts__value"
                    }
                  >
                    {value}
                  </div>
                  <VerificationBadge state={attr.verification} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* What changed */}
      {entity.recentChanges.length > 0 && (
        <section className="section">
          <h2 className="section-head__title">What changed</h2>
          <div className="change-list" style={{ marginTop: "var(--space-5)" }}>
            {entity.recentChanges.map((c, i) => (
              <ChangeRow
                key={`${c.attributeKey}-${i}`}
                change={{
                  entitySlug: entity.slug,
                  entityName: entity.name,
                  attributeKey: c.attributeKey,
                  attributeLabel: c.attributeLabel,
                  previousValue: c.previousValue,
                  newValue: c.newValue,
                  changedAt: c.changedAt,
                  source: c.source,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Related entities */}
      {entity.related.length > 0 && (
        <section className="section">
          <h2 className="section-head__title">Related</h2>
          <div className="related-list" style={{ marginTop: "var(--space-4)" }}>
            {entity.related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/entity/${rel.slug}`}
                className="related-item"
              >
                <strong>{rel.name}</strong>
                <span>{rel.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sources */}
      {entity.sources.length > 0 && (
        <section className="section">
          <h2 className="section-head__title">Sources</h2>
          <div className="source-list" style={{ marginTop: "var(--space-4)" }}>
            {entity.sources.map((src) => (
              <div className="source-list__item" key={`${src.source}-${src.url}`}>
                <SourceTag source={src.source} label={src.sourceName} />
                <a href={src.url} target="_blank" rel="noopener noreferrer nofollow">
                  {src.url.replace(/^https?:\/\//, "")}
                </a>
                {src.license && (
                  <span style={{ color: "var(--faint)", fontSize: "0.8rem" }}>
                    {src.license}
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    color: "var(--faint)",
                    fontSize: "0.8rem",
                  }}
                >
                  Retrieved {formatDate(src.retrievedAt)}
                </span>
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: "var(--space-4)",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            How we verify and preserve facts:{" "}
            <Link href="/methodology">methodology</Link>.
          </p>
        </section>
      )}
    </Container>
  );
}
