// Wikidata adapter. The parser is pure (unit-tested against saved fixtures)
// and takes a label resolver so referenced items and units can be rendered as
// English text; the fetcher batches the second label lookup and funnels every
// request through the allow-listed fetchJson (spec sec. 41).

import { fetchJson } from "@/lib/sources/base";
import type { FetchResult } from "@/lib/sources/base";
import { isValidWikidataId } from "@/lib/slug";
import {
  formatWikidataTime,
  parseWikidataQuantity,
  unitEntityId,
  type WikidataQuantityValue,
  type WikidataTimeValue,
} from "@/lib/normalize";
import type { AttributeValue, SourceRef } from "@/lib/types";

export interface WikidataFacts {
  attributes: AttributeValue[];
  aliases: string[];
  label?: string;
  description?: string;
}

type MappedKind = "entity" | "quantity" | "date";

interface PropSpec {
  key: string;
  label: string;
  kind: MappedKind;
  /** For entity-valued lists (e.g. official languages), how many to join. */
  join?: number;
}

// Property → attribute map (spec sec. adapter). Only properties present on an
// entity produce attributes.
const PROPERTY_MAP: Record<string, PropSpec> = {
  P17: { key: "country", label: "Country", kind: "entity" },
  P36: { key: "capital", label: "Capital", kind: "entity" },
  P30: { key: "continent", label: "Continent", kind: "entity" },
  P37: { key: "official-language", label: "Official language", kind: "entity", join: 3 },
  P38: { key: "currency", label: "Currency", kind: "entity" },
  P1082: { key: "population", label: "Population", kind: "quantity" },
  P2046: { key: "area", label: "Area", kind: "quantity" },
  P571: { key: "inception", label: "Inception", kind: "date" },
  P2044: { key: "elevation", label: "Elevation", kind: "quantity" },
  P2048: { key: "height", label: "Height", kind: "quantity" },
  P2067: { key: "mass", label: "Mass", kind: "quantity" },
  P2386: { key: "diameter", label: "Diameter", kind: "quantity" },
  P2120: { key: "radius", label: "Radius", kind: "quantity" },
  P2043: { key: "length", label: "Length", kind: "quantity" },
  P610: { key: "highest-point", label: "Highest point", kind: "entity" },
  P2250: { key: "life-expectancy", label: "Life expectancy", kind: "quantity" },
};

// --- Wikidata JSON shapes (only the fields we read) ------------------------

interface Snak {
  snaktype: string;
  datavalue?: { type: string; value: unknown };
}

interface Statement {
  rank: "preferred" | "normal" | "deprecated";
  mainsnak: Snak;
}

interface WbEntity {
  id?: string;
  missing?: string;
  labels?: Record<string, { language: string; value: string }>;
  descriptions?: Record<string, { language: string; value: string }>;
  aliases?: Record<string, Array<{ language: string; value: string }>>;
  claims?: Record<string, Statement[]>;
}

export interface WbGetEntitiesResponse {
  entities?: Record<string, WbEntity>;
  success?: number;
}

type LabelResolver = (qid: string) => string | undefined;

/**
 * Statements worth reading: drop deprecated and non-value snaks, and prefer
 * `preferred`-ranked statements when any exist (this is how Wikidata marks the
 * current/authoritative value — e.g. the latest census population, or the real
 * mass over placeholder data).
 */
function activeStatements(statements: Statement[]): Statement[] {
  const active = statements.filter(
    (s) => s.rank !== "deprecated" && s.mainsnak?.snaktype === "value" && !!s.mainsnak.datavalue,
  );
  const preferred = active.filter((s) => s.rank === "preferred");
  return preferred.length > 0 ? preferred : active;
}

function entityIdOf(datavalue: { value: unknown } | undefined): string | undefined {
  const v = datavalue?.value as { id?: unknown } | undefined;
  return v && typeof v.id === "string" ? v.id : undefined;
}

function buildAttribute(
  spec: PropSpec,
  active: Statement[],
  resolve: LabelResolver,
  provenance: SourceRef[],
  observedAt: string,
): AttributeValue | null {
  const base = {
    key: spec.key,
    label: spec.label,
    verification: "supported" as const,
    provenance,
    observedAt,
  };

  if (spec.kind === "entity") {
    const limit = spec.join ?? 1;
    const labels: string[] = [];
    for (const st of active) {
      const id = entityIdOf(st.mainsnak.datavalue);
      const label = id ? resolve(id) : undefined;
      if (label) labels.push(label);
      if (labels.length >= limit) break;
    }
    // A raw Q-id is not display-ready, so omit unresolved entity values.
    if (labels.length === 0) return null;
    return { ...base, value: labels.join(", "), numeric: null, kind: "entity" };
  }

  if (spec.kind === "quantity") {
    const value = active[0].mainsnak.datavalue!.value as WikidataQuantityValue;
    const { numeric, unitLabel } = parseWikidataQuantity(value);
    const unitId = unitEntityId(value.unit);
    const unit = unitLabel ?? (unitId ? resolve(unitId) : undefined);
    const numStr = numeric != null ? numeric.toLocaleString("en-US") : String(value.amount ?? "");
    const display = unit ? `${numStr} ${unit}` : numStr;
    if (!display) return null;
    return { ...base, value: display, numeric: numeric ?? null, unit, kind: "quantity" };
  }

  // date
  const value = active[0].mainsnak.datavalue!.value as WikidataTimeValue;
  const formatted = formatWikidataTime(value);
  if (!formatted) return null;
  return { ...base, value: formatted, numeric: null, kind: "date" };
}

/**
 * Parse a wbgetentities response into attributes, aliases, label and
 * description. `resolve` maps referenced item / unit Q-ids to English labels.
 * `retrievedAt` stamps provenance and observedAt; it defaults to now so the
 * function stays convenient, but callers pass the real fetch time.
 */
export function parseWikidataEntity(
  json: WbGetEntitiesResponse,
  qid: string,
  resolve: LabelResolver,
  retrievedAt: string = new Date().toISOString(),
): WikidataFacts {
  const empty: WikidataFacts = { attributes: [], aliases: [] };
  const entity = json?.entities?.[qid];
  if (!entity || entity.missing !== undefined) return empty;

  const label = entity.labels?.en?.value;
  const description = entity.descriptions?.en?.value;
  const aliases = (entity.aliases?.en ?? [])
    .map((a) => a?.value)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const provenance: SourceRef[] = [
    {
      source: "wikidata",
      sourceName: "Wikidata",
      url: `https://www.wikidata.org/wiki/${qid}`,
      retrievedAt,
      license: "CC0",
    },
  ];

  const attributes: AttributeValue[] = [];
  const claims = entity.claims ?? {};
  for (const [property, spec] of Object.entries(PROPERTY_MAP)) {
    const statements = claims[property];
    if (!statements?.length) continue;
    const active = activeStatements(statements);
    if (active.length === 0) continue;
    const attr = buildAttribute(spec, active, resolve, provenance, retrievedAt);
    if (attr) attributes.push(attr);
  }

  return { attributes, aliases, label, description };
}

/** Q-ids of referenced items and units that need English labels resolved. */
function collectReferencedIds(entity: WbEntity): string[] {
  const ids = new Set<string>();
  const claims = entity.claims ?? {};
  for (const [property, spec] of Object.entries(PROPERTY_MAP)) {
    const statements = claims[property];
    if (!statements?.length) continue;
    for (const st of activeStatements(statements)) {
      const dv = st.mainsnak.datavalue;
      if (!dv) continue;
      if (spec.kind === "entity") {
        const id = entityIdOf(dv);
        if (id && isValidWikidataId(id)) ids.add(id);
      } else if (spec.kind === "quantity") {
        const uid = unitEntityId((dv.value as WikidataQuantityValue).unit);
        if (uid && isValidWikidataId(uid)) ids.add(uid);
      }
    }
  }
  return [...ids];
}

const WBGET = "https://www.wikidata.org/w/api.php";

/**
 * Fetch a Wikidata entity, resolve the labels of everything it references, and
 * parse it. Never throws: on an invalid id or a failed request it returns
 * empty facts plus a FetchResult the pipeline can record.
 */
export async function fetchWikidataEntity(qid: string): Promise<{
  facts: WikidataFacts;
  aliases: string[];
  label?: string;
  description?: string;
  fetch: FetchResult;
}> {
  const empty: WikidataFacts = { attributes: [], aliases: [] };
  if (!isValidWikidataId(qid)) {
    const failed: FetchResult = {
      ok: false,
      status: 0,
      url: `${WBGET}?ids=${qid}`,
      text: "",
      contentHash: "",
      retrievedAt: new Date().toISOString(),
      bytes: 0,
      error: `Invalid Wikidata id: ${qid}`,
    };
    return { facts: empty, aliases: [], fetch: failed };
  }

  const url =
    `${WBGET}?action=wbgetentities&format=json&ids=${qid}` +
    `&props=labels%7Cdescriptions%7Caliases%7Cclaims&languages=en`;
  const { data, fetch } = await fetchJson<WbGetEntitiesResponse>(url);
  const entity = data?.entities?.[qid];
  if (!data || !entity || entity.missing !== undefined) {
    return { facts: empty, aliases: [], fetch };
  }

  const labels = await fetchLabels(collectReferencedIds(entity));
  const facts = parseWikidataEntity(data, qid, (id) => labels.get(id), fetch.retrievedAt);
  return {
    facts,
    aliases: facts.aliases,
    label: facts.label,
    description: facts.description,
    fetch,
  };
}

/** Batched label lookup (wbgetentities caps ids at 50 per request). */
async function fetchLabels(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    if (chunk.length === 0) continue;
    const url =
      `${WBGET}?action=wbgetentities&format=json` +
      `&ids=${chunk.join("%7C")}&props=labels&languages=en`;
    const { data } = await fetchJson<WbGetEntitiesResponse>(url);
    const entities = data?.entities;
    if (!entities) continue;
    for (const [id, ent] of Object.entries(entities)) {
      const label = ent.labels?.en?.value;
      if (label) out.set(id, label);
    }
  }
  return out;
}
