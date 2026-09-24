import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** Large tabular number + label, for the homepage live summary. */
export function Stat({
  value,
  label,
  desc,
  className,
}: {
  value: ReactNode;
  label: string;
  desc?: string;
  className?: string;
}) {
  return (
    <div className={cx("stat", className)}>
      <div className="stat__value tnum">{value}</div>
      <div className="stat__label">{label}</div>
      {desc ? <div className="stat__desc">{desc}</div> : null}
    </div>
  );
}
