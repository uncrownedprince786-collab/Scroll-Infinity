import type { ElementType, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface ContainerProps {
  /** Element to render. Defaults to `div`. */
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** Centered, max-width content wrapper with responsive side gutters. */
export function Container({ as: Comp = "div", className, children }: ContainerProps) {
  return <Comp className={cx("container", className)}>{children}</Comp>;
}
