// Shared source-fetch primitives. Every outbound request in the platform goes
// through here, which is the single choke point for SSRF protection (spec
// sec. 41): only allow-listed HTTPS hosts can ever be contacted.

import { serverConfig, siteConfig } from "@/lib/config";
import { sha256 } from "@/lib/hash";

/** HTTPS hosts the crawler is permitted to contact. */
export const ALLOWED_HOSTS = new Set<string>([
  "en.wikipedia.org",
  "www.wikidata.org",
  "wikidata.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
]);

export function assertAllowedUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Refusing non-HTTPS URL: ${rawUrl}`);
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Host not allow-listed: ${url.hostname}`);
  }
  return url;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  url: string;
  text: string;
  contentHash: string;
  retrievedAt: string;
  bytes: number;
  error?: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  accept?: string;
}

// Descriptive User-Agent — Wikimedia's policy asks automated clients to
// identify themselves with a contact.
const USER_AGENT = `ScrollInfinity/1.0 (+${siteConfig.url}; ${serverConfig.userAgentContact})`;

async function backoff(attempt: number): Promise<void> {
  const ms = Math.min(2000, 200 * 2 ** attempt) + Math.random() * 100;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch an allow-listed URL with a timeout, bounded retries (on 429/5xx and
 * network errors), and a content hash of the response. Never throws for HTTP
 * or network failures — it returns `ok: false` so callers can fail safely
 * (spec sec. 39).
 */
export async function fetchSource(
  rawUrl: string,
  opts: FetchOptions = {},
): Promise<FetchResult> {
  const url = assertAllowedUrl(rawUrl);
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const retries = opts.retries ?? 2;
  const retrievedAt = new Date().toISOString();
  let lastError = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Api-User-Agent": USER_AGENT,
          Accept: opts.accept ?? "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if ((res.status >= 500 || res.status === 429) && attempt < retries) {
          await backoff(attempt);
          continue;
        }
        return {
          ok: false,
          status: res.status,
          url: url.toString(),
          text,
          contentHash: sha256(text),
          retrievedAt,
          bytes: text.length,
          error: lastError,
        };
      }

      return {
        ok: true,
        status: res.status,
        url: url.toString(),
        text,
        contentHash: sha256(text),
        retrievedAt,
        bytes: text.length,
      };
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < retries) await backoff(attempt);
    }
  }

  return {
    ok: false,
    status: 0,
    url: url.toString(),
    text: "",
    contentHash: "",
    retrievedAt,
    bytes: 0,
    error: lastError,
  };
}

/** Convenience wrapper that parses a JSON response. */
export async function fetchJson<T>(
  rawUrl: string,
  opts?: FetchOptions,
): Promise<{ data: T | null; fetch: FetchResult }> {
  const result = await fetchSource(rawUrl, opts);
  if (!result.ok) return { data: null, fetch: result };
  try {
    return { data: JSON.parse(result.text) as T, fetch: result };
  } catch (err) {
    return {
      data: null,
      fetch: {
        ...result,
        ok: false,
        error: `JSON parse failed: ${(err as Error).message}`,
      },
    };
  }
}
