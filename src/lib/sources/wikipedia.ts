// Wikipedia adapter. The parser is pure (unit-tested against saved fixtures);
// the fetcher is the only part that touches the network, and it does so
// exclusively through the allow-listed fetchJson (spec sec. 41).

import { fetchJson } from "@/lib/sources/base";
import type { FetchResult } from "@/lib/sources/base";

export interface WikipediaImage {
  source: string;
  width?: number;
  height?: number;
}

export interface WikipediaSummary {
  resolvedTitle: string;
  pageid?: number;
  wikibaseItem?: string;
  description?: string;
  extract?: string;
  thumbnail?: WikipediaImage;
  originalimage?: WikipediaImage;
  canonicalUrl?: string;
  timestamp?: string;
}

// Partial shape of the REST summary payload — only the fields we consume.
interface SummaryJson {
  type?: string;
  title?: string;
  titles?: { canonical?: string; normalized?: string; display?: string };
  pageid?: number;
  wikibase_item?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  originalimage?: { source?: string; width?: number; height?: number };
  content_urls?: { desktop?: { page?: string }; mobile?: { page?: string } };
  timestamp?: string;
}

function toImage(img?: {
  source?: string;
  width?: number;
  height?: number;
}): WikipediaImage | undefined {
  if (!img?.source) return undefined;
  return {
    source: img.source,
    width: typeof img.width === "number" ? img.width : undefined,
    height: typeof img.height === "number" ? img.height : undefined,
  };
}

/** Parse a REST `page/summary` response. Returns null for error/empty bodies. */
export function parseWikipediaSummary(json: unknown): WikipediaSummary | null {
  if (!json || typeof json !== "object") return null;
  const j = json as SummaryJson;
  // Error bodies (e.g. 404 not_found) carry a `type` URI and no real title.
  if (typeof j.type === "string" && j.type.includes("/errors/")) return null;

  const resolvedTitle = j.titles?.normalized ?? j.titles?.canonical ?? j.title;
  if (!resolvedTitle) return null;

  return {
    resolvedTitle,
    pageid: typeof j.pageid === "number" ? j.pageid : undefined,
    wikibaseItem: j.wikibase_item || undefined,
    description: j.description || undefined,
    extract: j.extract || undefined,
    thumbnail: toImage(j.thumbnail),
    originalimage: toImage(j.originalimage),
    canonicalUrl: j.content_urls?.desktop?.page || undefined,
    timestamp: j.timestamp || undefined,
  };
}

const REST_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const ACTION_API = "https://en.wikipedia.org/w/api.php";

/**
 * Fetch and parse a Wikipedia summary. If the summary omits the Wikidata id
 * (rare), fall back to the Action API's pageprops before giving up. The
 * returned `fetch` is always the primary summary request so the pipeline can
 * record it.
 */
export async function fetchWikipediaSummary(
  title: string,
): Promise<{ data: WikipediaSummary | null; fetch: FetchResult }> {
  const url = `${REST_SUMMARY}${encodeURIComponent(title)}`;
  const { data, fetch } = await fetchJson<SummaryJson>(url);
  const summary = parseWikipediaSummary(data);
  if (summary && !summary.wikibaseItem) {
    summary.wikibaseItem = await fetchWikibaseItem(title);
  }
  return { data: summary, fetch };
}

interface PagePropsJson {
  query?: {
    pages?: Record<string, { pageprops?: { wikibase_item?: string } }>;
  };
}

/** Action API fallback for the Wikidata id when the summary lacks it. */
async function fetchWikibaseItem(title: string): Promise<string | undefined> {
  const url =
    `${ACTION_API}?action=query&format=json&redirects=1` +
    `&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(title)}`;
  const { data } = await fetchJson<PagePropsJson>(url);
  const pages = data?.query?.pages;
  if (!pages) return undefined;
  for (const page of Object.values(pages)) {
    const id = page?.pageprops?.wikibase_item;
    if (id) return id;
  }
  return undefined;
}
