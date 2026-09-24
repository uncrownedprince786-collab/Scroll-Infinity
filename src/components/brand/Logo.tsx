import { Mark } from "./Mark";
import { Wordmark } from "./Wordmark";
import { cx } from "@/components/ui/cx";
import { siteConfig } from "@/lib/config";

export interface LogoProps {
  /** `full` = mark + wordmark lockup; `compact` = mark only. */
  variant?: "full" | "compact";
  className?: string;
  /** Mark size in pixels. */
  markSize?: number;
}

/**
 * Brand lockup. `full` pairs the mark with the wordmark (accessible via the
 * visible text); `compact` is the mark alone with an aria-label. The mark is
 * accent-toned, the wordmark ink. Links are added by the header/footer.
 */
export function Logo({ variant = "full", className, markSize = 26 }: LogoProps) {
  if (variant === "compact") {
    return (
      <span
        className={cx("logo", className)}
        role="img"
        aria-label={siteConfig.name}
      >
        <Mark size={markSize} className="logo__mark" />
      </span>
    );
  }

  return (
    <span className={cx("logo", className)}>
      <Mark size={markSize} className="logo__mark" />
      <Wordmark />
    </span>
  );
}
