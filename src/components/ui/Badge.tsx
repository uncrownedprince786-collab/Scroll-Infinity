import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import type { VerificationState } from "@/lib/types";
import { verificationHint, verificationLabel } from "@/lib/format";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "verified"
  | "supported"
  | "caution"
  | "danger";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  dot = false,
  title,
  className,
  children,
}: BadgeProps) {
  return (
    <span className={cx("badge", `badge--${tone}`, className)} title={title}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const VERIFICATION_TONE: Record<VerificationState, BadgeTone> = {
  verified: "verified",
  supported: "supported",
  conflicting: "caution",
  unverified: "neutral",
  stale: "caution",
  rejected: "danger",
};

/** Verification pill: tone + label + explanatory tooltip for a fact's state. */
export function VerificationBadge({
  state,
  className,
}: {
  state: VerificationState;
  className?: string;
}) {
  return (
    <Badge
      tone={VERIFICATION_TONE[state]}
      dot
      title={verificationHint[state]}
      className={className}
    >
      {verificationLabel[state]}
    </Badge>
  );
}
