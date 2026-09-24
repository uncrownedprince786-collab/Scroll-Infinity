/**
 * Renders a JSON-LD structured-data block. Server component; `data` must be a
 * plain, page-supported object (spec sec. 23 — never mark up hidden or
 * unsupported information).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
