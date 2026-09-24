import type { ElementType, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface CardProps {
  as?: ElementType;
  pad?: boolean;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Surface card. `interactive` adds the hover lift; `pad` adds inner padding. */
export function Card({
  as: Comp = "div",
  pad = false,
  interactive = false,
  className,
  children,
}: CardProps) {
  return (
    <Comp
      className={cx(
        "card",
        pad && "card--pad",
        interactive && "card--interactive",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
