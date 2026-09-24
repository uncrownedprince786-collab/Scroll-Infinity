import { Container } from "@/components/layout/Container";
import { SearchField } from "@/components/ui/SearchField";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container as="section" className="section">
      <div className="empty" style={{ marginTop: "var(--space-8)" }}>
        <div className="empty__title">This page does not exist</div>
        <p style={{ maxWidth: "34rem", marginInline: "auto" }}>
          The page may have moved, or the entity has not been added to the index
          yet. Try a search, or start from a topic.
        </p>
        <div style={{ maxWidth: "26rem", margin: "var(--space-5) auto 0" }}>
          <SearchField label="Search Scroll Infinity" />
        </div>
        <div className="cta__actions" style={{ marginTop: "var(--space-5)" }}>
          <ButtonLink href="/topics">Browse topics</ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Go home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
