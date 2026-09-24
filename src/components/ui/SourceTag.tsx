import { cx } from "@/components/ui/cx";

const NAMES: Record<string, string> = {
  wikipedia: "Wikipedia",
  wikidata: "Wikidata",
};

/** Small source indicator ("Wikipedia" / "Wikidata") with a coloured dot. */
export function SourceTag({
  source,
  label,
  className,
}: {
  source: string;
  label?: string;
  className?: string;
}) {
  const key = source.toLowerCase();
  return (
    <span className={cx("source-tag", `source-tag--${key}`, className)}>
      <span className="source-tag__dot" aria-hidden="true" />
      {label ?? NAMES[key] ?? source}
    </span>
  );
}
