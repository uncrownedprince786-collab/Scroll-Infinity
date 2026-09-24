import type { SVGProps } from "react";
import { cx } from "@/components/ui/cx";

export interface MarkProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Rendered width & height in pixels. Crisp down to 16px. */
  size?: number | string;
}

/**
 * The Scroll Infinity mark: a continuous stroke that draws the left lobe of an
 * infinity, crosses at the centre, then breaks the symmetry — the tail
 * straightens and accelerates into a forward-pointing arrowhead. It reads as a
 * path that loops and keeps going, not a static ∞ glyph. Monochrome; inherits
 * `currentColor` so it recolours with context.
 */
export function Mark({ size = 24, className, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* left lobe → centre crossing → forward tail to the arrow tip */}
      <path d="M11 12C8.2 8.5 3.8 8.5 3.8 12C3.8 15.5 8.2 15.5 11 12C13.6 9.3 16.9 10.4 20.4 12" />
      {/* forward arrowhead — the onward motion */}
      <path d="M17.9 9.7 20.7 12 17.9 14.3" />
    </svg>
  );
}
