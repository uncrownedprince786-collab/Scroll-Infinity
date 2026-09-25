// Central configuration. Only values prefixed with NEXT_PUBLIC_ are exposed to
// the client. `serverConfig` is server-only — never import it into a client
// component.

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const DEFAULT_SITE_URL = "https://scrollinfinityhq.vercel.app";

export const siteConfig = {
  name: "Scroll Infinity",
  shortName: "Scroll Infinity",
  tagline: "A living universe of information.",
  description:
    "Scroll Infinity is a continuously updated, source-backed knowledge platform. Explore entities and topics, see the key facts, and track how they change over time.",
  url: stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL),
  locale: "en_US",
} as const;

/**
 * Returns an absolute URL for a site-relative path.
 */
export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${clean}`;
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    // Fail fast and visibly (spec sec. 15) rather than silently misbehaving.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Parse a positive-integer env var, clamped to [0, max], with a fallback. */
function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

// Server-only configuration. Accessed lazily so importing this module never
// throws in environments where the variable is legitimately absent.
export const serverConfig = {
  databaseUrl(): string {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  userAgentContact: process.env.SOURCE_USER_AGENT_CONTACT || siteConfig.url,
  ingestSecret: process.env.INGEST_SECRET || "",
} as const;

// Bounds for one scheduled ingest run (spec sec. 36–38). Each run keeps work
// small and predictable: refresh the stalest known entities and discover a few
// new ones, rather than re-crawling everything. Tunable via env, clamped so a
// bad value can never make a single run unbounded.
// Defaults are conservative so one run comfortably fits Vercel's function
// timeout (Hobby caps at 60s). The loop is timeout-resilient regardless: each
// entity commits independently and the refresh pass is ordered by staleness, so
// a run cut short simply resumes where it left off. Raise via env on Pro.
export const ingestConfig = {
  refreshLimit: positiveInt(process.env.INGEST_REFRESH_LIMIT, 8, 100),
  discoverLimit: positiveInt(process.env.INGEST_DISCOVER_LIMIT, 4, 50),
} as const;
