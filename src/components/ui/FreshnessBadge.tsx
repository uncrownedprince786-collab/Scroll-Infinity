import { cx } from "@/components/ui/cx";
import { formatDate, relativeTime } from "@/lib/format";

/** Freshness indicator: relative time with an exact-date tooltip. */
export function FreshnessBadge({
  iso,
  stale = false,
  className,
}: {
  iso: string;
  stale?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("freshness", stale && "freshness--stale", className)}>
      <span className="freshness__dot" aria-hidden="true" />
      <time dateTime={iso} title={formatDate(iso)}>
        {relativeTime(iso)}
      </time>
    </span>
  );
}
