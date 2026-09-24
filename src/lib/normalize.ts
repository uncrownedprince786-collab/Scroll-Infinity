// Pure value-normalisation helpers shared by the source adapters and the
// ingest pipeline. Everything here is deterministic and free of I/O so it can
// be unit-tested in isolation (spec sec. 20/13).

/** Raw shape of a Wikidata `quantity` datavalue. */
export interface WikidataQuantityValue {
  amount: string; // e.g. "+695700" or "-413" — leading sign is significant
  unit: string; // "1" (dimensionless) or a full entity URI
  upperBound?: string;
  lowerBound?: string;
}

/** Raw shape of a Wikidata `time` datavalue. */
export interface WikidataTimeValue {
  time: string; // e.g. "+1868-01-03T00:00:00Z" or "-0660-02-11T00:00:00Z"
  precision: number; // 9=year, 10=month, 11=day (finer values unused here)
  timezone?: number;
  before?: number;
  after?: number;
  calendarmodel?: string;
}

// Human labels for the units the mapped properties actually use. This is a
// fast, offline fallback; the Wikidata adapter still resolves anything missing
// here through the live label API.
const COMMON_UNITS: Record<string, string> = {
  Q828224: "kilometre",
  Q11573: "metre",
  Q174728: "centimetre",
  Q174789: "millimetre",
  Q712226: "square kilometre",
  Q25343: "square metre",
  Q11570: "kilogram",
  Q41803: "gram",
  Q11574: "second",
  Q7727: "minute",
  Q25235: "hour",
  Q573: "day",
  Q577: "year",
  Q11579: "kelvin",
};

/** Extract a Q-id from a Wikidata unit URI. Returns null for dimensionless. */
export function unitEntityId(unit: string | undefined): string | null {
  if (!unit || unit === "1") return null;
  const match = unit.match(/Q\d+$/);
  return match ? match[0] : null;
}

/**
 * Parse a Wikidata quantity into a numeric value and a human unit label.
 * The leading "+" is stripped; "-" is preserved. Dimensionless quantities
 * (unit "1") return no unit label. Unknown units also return no label so the
 * caller can resolve them against a live label lookup.
 */
export function parseWikidataQuantity(value: WikidataQuantityValue): {
  numeric: number | null;
  unitLabel?: string;
} {
  const raw = typeof value?.amount === "string" ? value.amount.replace(/^\+/, "") : "";
  const parsed = raw === "" ? Number.NaN : Number(raw);
  const numeric = Number.isFinite(parsed) ? parsed : null;
  const qid = unitEntityId(value?.unit);
  const unitLabel = qid ? COMMON_UNITS[qid] : undefined;
  return { numeric, unitLabel };
}

/**
 * Format a Wikidata time by precision: year only when precision <= 9, month
 * for precision 10, full date otherwise. BCE dates (leading "-") are suffixed
 * " BCE" and rendered with a positive year.
 */
export function formatWikidataTime(value: WikidataTimeValue): string {
  const time = typeof value?.time === "string" ? value.time : "";
  const match = time.match(/^([+-])(\d+)-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, sign, yearRaw, month, day] = match;
  const year = parseInt(yearRaw, 10);
  const era = sign === "-" ? " BCE" : "";
  const precision = typeof value.precision === "number" ? value.precision : 11;
  if (precision <= 9) return `${year}${era}`;
  if (precision === 10) return `${year}-${month}${era}`;
  return `${year}-${month}-${day}${era}`;
}

/** Collapse all runs of whitespace/newlines into single spaces and trim. */
export function cleanExtract(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** First sentence of a block of text (naive but adequate for intros). */
export function firstSentence(text: string | undefined): string {
  const clean = cleanExtract(text);
  if (!clean) return "";
  const match = clean.match(/^(.*?[.!?])(\s|$)/);
  return (match ? match[1] : clean).trim();
}

/** Truncate to at most `n` characters, appending an ellipsis when cut. */
export function truncate(text: string | undefined, n: number): string {
  const clean = (text ?? "").trim();
  if (n <= 0) return "";
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n - 1).trimEnd()}…`;
}
