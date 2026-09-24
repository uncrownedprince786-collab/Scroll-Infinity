import type { ButtonHTMLAttributes, ComponentProps } from "react";
import Link from "next/link";
import { cx } from "@/components/ui/cx";

type Variant = "primary" | "ghost";

function buttonClass(variant: Variant, sm?: boolean, className?: string) {
  return cx("btn", `btn--${variant}`, sm && "btn--sm", className);
}

export function Button({
  variant = "primary",
  sm,
  className,
  children,
  ...props
}: { variant?: Variant; sm?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, sm, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  sm,
  className,
  children,
  ...props
}: { variant?: Variant; sm?: boolean } & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, sm, className)} {...props}>
      {children}
    </Link>
  );
}
