import Link from "next/link";
import type { RecentChange } from "@/lib/types";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { SourceTag } from "@/components/ui/SourceTag";

/** A single detected change: entity, attribute, previous → new value. */
export function ChangeRow({ change }: { change: RecentChange }) {
  const added = change.previousValue == null;
  return (
    <div className="change-row">
      <div className="change-row__main">
        <Link href={`/entity/${change.entitySlug}`} className="change-row__entity">
          {change.entityName}
        </Link>
        <span className="change-row__attr">{change.attributeLabel}</span>
        <span className="change-row__values">
          {added ? (
            <span className="value-added">{change.newValue ?? "—"}</span>
          ) : (
            <>
              <span className="value-prev">{change.previousValue}</span>
              <span className="value-arrow" aria-hidden="true">
                {"→"}
              </span>
              <span className="value-new">{change.newValue ?? "—"}</span>
            </>
          )}
        </span>
      </div>
      <div className="change-row__meta">
        <SourceTag source={change.source} />
        <FreshnessBadge iso={change.changedAt} />
      </div>
    </div>
  );
}
