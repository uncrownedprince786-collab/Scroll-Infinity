import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { VerificationBadge } from "@/components/ui/Badge";
import { pageMetadata } from "@/lib/seo";
import type { VerificationState } from "@/lib/types";
import { verificationHint } from "@/lib/format";

export const metadata: Metadata = pageMetadata({
  title: "Methodology",
  description:
    "How Scroll Infinity sources, verifies, and preserves information — and what it will not do.",
  path: "/methodology",
});

const STATES: VerificationState[] = [
  "verified",
  "supported",
  "conflicting",
  "unverified",
  "stale",
];

export default function MethodologyPage() {
  return (
    <Container>
      <div className="page-crumbs">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Methodology" }]}
        />
      </div>
      <header className="page-head">
        <p className="eyebrow">Methodology</p>
        <h1 className="page-head__title">How we know what we publish</h1>
      </header>

      <section className="section section--tight">
        <div className="prose">
          <h2>Sources</h2>
          <p>
            Information currently comes from two open, machine-readable sources:{" "}
            <a
              href="https://en.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Wikipedia
            </a>{" "}
            (article summaries, licensed CC BY-SA) and{" "}
            <a
              href="https://www.wikidata.org"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Wikidata
            </a>{" "}
            (structured facts, released under CC0). The source layer is built
            from adapters, so new sources can be added over time.
          </p>

          <h2>Verification states</h2>
          <p>
            Every fact carries a state that describes how much we trust it. We do
            not overclaim: a fact confirmed by a single reliable source is marked
            sourced, not verified.
          </p>
          <ul>
            {STATES.map((state) => (
              <li key={state}>
                <VerificationBadge state={state} /> — {verificationHint[state]}
              </li>
            ))}
          </ul>

          <h2>Provenance and history</h2>
          <p>
            Each observation is stored with its source URL, the time it was
            retrieved, the parser version, and a checksum. When a value changes,
            the previous value is kept and the change is recorded — the archive
            preserves history rather than overwriting it.
          </p>

          <h2>The quality gate</h2>
          <p>
            A page becomes public only when it clears a quality gate: it needs a
            real description, enough useful facts, and a clear purpose. Pages are
            never generated just because a URL could exist.
          </p>

          <h2>What we do not do</h2>
          <ul>
            <li>We do not invent facts, statistics, or freshness.</li>
            <li>We do not copy source articles wholesale as our own.</li>
            <li>We do not publish thin, templated, or duplicate pages.</li>
          </ul>
        </div>
      </section>
    </Container>
  );
}
