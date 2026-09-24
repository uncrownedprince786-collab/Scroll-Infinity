import type { HTMLAttributes } from "react";
import { cx } from "@/components/ui/cx";

export type WordmarkProps = HTMLAttributes<HTMLSpanElement>;

/**
 * The "Scroll Infinity" wordmark. Real text (accessible, scalable), set in the
 * brand sans with deliberate tracking; displayed in caps via CSS while the DOM
 * keeps natural casing for screen readers.
 */
export function Wordmark({ className, ...props }: WordmarkProps) {
  return (
    <span className={cx("wordmark", className)} {...props}>
      Scroll Infinity
    </span>
  );
}
