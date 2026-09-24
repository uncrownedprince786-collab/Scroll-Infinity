import type { VerificationState } from "@/lib/types";

/** Locale-stable number formatting. Returns an em dash for missing values. */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Human "time ago" for freshness indicators. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export const verificationLabel: Record<VerificationState, string> = {
  verified: "Verified",
  supported: "Sourced",
  conflicting: "Conflicting",
  unverified: "Unverified",
  stale: "Stale",
  rejected: "Rejected",
};

/** One-line explanation of what each verification state means. */
export const verificationHint: Record<VerificationState, string> = {
  verified: "Corroborated across multiple sources.",
  supported: "Backed by a single reliable source.",
  conflicting: "Sources currently disagree on this value.",
  unverified: "Extracted but not yet validated.",
  stale: "Not refreshed within the freshness window.",
  rejected: "Failed validation and is not published.",
};
