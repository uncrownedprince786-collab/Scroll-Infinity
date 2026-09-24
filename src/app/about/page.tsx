import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `About ${siteConfig.name} — a living, source-backed knowledge platform.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <Container>
      <div className="page-crumbs">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      </div>
      <header className="page-head">
        <p className="eyebrow">About</p>
        <h1 className="page-head__title">A living universe of information</h1>
      </header>

      <section className="section section--tight">
        <div className="prose">
          <p>
            {siteConfig.name} organizes public knowledge into clear pages that
            answer a simple question well: what do we know about this, where does
            it come from, and how has it changed?
          </p>

          <h2>What it is</h2>
          <p>
            Every page is an entity or a topic. An entity page leads with the key
            facts and a plain-language description, then shows the sources behind
            each fact and any changes detected over time. Topics group related
            entities into maps you can explore.
          </p>

          <h2>How it works</h2>
          <p>
            Information is gathered from trusted public sources, normalized, and
            checked before it is published. Each observation is stored with its
            source, a timestamp, and a checksum, so history is preserved rather
            than overwritten. A quality gate decides whether a page is useful
            enough to publish — a page is never created just because a URL could
            be.
          </p>

          <h2>Principles</h2>
          <ul>
            <li>Facts are never fabricated. Missing data is left out.</li>
            <li>Every fact is attributed to a source you can follow.</li>
            <li>Freshness is shown honestly, including when data is stale.</li>
            <li>No account is required to explore.</li>
          </ul>

          <p>
            For the details, read the{" "}
            <Link href="/methodology">methodology</Link>.
          </p>
        </div>
      </section>
    </Container>
  );
}
