import Link from "next/link";
import { cx } from "@/components/ui/cx";

export interface Crumb {
  label: string;
  href?: string;
}

/** Semantic breadcrumb trail. The last item is the current page. */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cx("breadcrumbs", className)}>
      <ol className="breadcrumbs__list">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="breadcrumbs__item">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="breadcrumbs__link">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="breadcrumbs__current"
                  aria-current={last ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!last && (
                <span className="breadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
