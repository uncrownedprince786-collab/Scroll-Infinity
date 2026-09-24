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

// Server-only configuration. Accessed lazily so importing this module never
// throws in environments where the variable is legitimately absent.
export const serverConfig = {
  databaseUrl(): string {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  userAgentContact: process.env.SOURCE_USER_AGENT_CONTACT || siteConfig.url,
  ingestSecret: process.env.INGEST_SECRET || "",
} as const;
