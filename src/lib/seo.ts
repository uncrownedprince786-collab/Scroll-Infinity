import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/config";
import type { Entity, Topic } from "@/lib/types";

/**
 * Consistent per-page metadata: canonical URL, Open Graph, and Twitter card.
 * `path` is site-relative; metadataBase (set in the root layout) resolves it.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const images = opts.images?.length ? opts.images : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: siteConfig.name,
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      ...(images ? { images } : {}),
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// --- JSON-LD builders (spec sec. 23). Only describe what the page shows. ----

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    slogan: siteConfig.tagline,
    logo: absoluteUrl("/icon.svg"),
  };
}

export function entityJsonLd(entity: Entity) {
  const sameAs = entity.sources
    .filter((s) => s.source === "wikipedia" || s.source === "wikidata")
    .map((s) => s.url);
  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: entity.name,
    description: entity.description,
    url: absoluteUrl(`/entity/${entity.slug}`),
    ...(entity.primaryImage ? { image: entity.primaryImage.url } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    dateModified: entity.updatedAt,
  };
}

export function topicJsonLd(topic: Topic, entityUrls: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.name,
    description: topic.description,
    url: absoluteUrl(`/topics/${topic.slug}`),
    ...(entityUrls.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: entityUrls.length,
            itemListElement: entityUrls.map((u, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: u,
            })),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
