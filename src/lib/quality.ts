// Page-quality gate (spec sec. 21). Pure and fully unit-tested. This is the
// single place that decides whether an entity is good enough to be served
// publicly: the repository only exposes entities whose pageState is
// published/indexable AND indexable=true, so this gate is the guard that keeps
// thin, low-value pages out of the index.

import type { PageState } from "@/lib/types";

export interface QualityInput {
  description: string;
  longDescription: string;
  attributeCount: number;
  hasImage: boolean;
  aliasCount: number;
  topicCount: number;
}

export interface QualityResult {
  qualityScore: number;
  indexable: boolean;
  pageState: PageState;
  reasons: string[];
}

const MIN_DESC = 20;
const MIN_LONG = 180;
// A page with a strong sourced intro AND a primary image is materially useful
// even without a structured facts table (e.g. concept entities like "DNA").
// Spec sec. 21 asks for "enough useful information", not a fixed template.
const RICH_LONG = 300;
const DRAFT_LONG = 120;
const MIN_SCORE = 55;

export function assessQuality(input: QualityInput): QualityResult {
  const description = input.description ?? "";
  const longDescription = input.longDescription ?? "";
  const descLen = description.length;
  const longLen = longDescription.length;
  const { attributeCount, hasImage, aliasCount, topicCount } = input;

  const reasons: string[] = [];

  // --- Score (capped at 100) ---
  let score = 0;
  if (descLen > 0) score += 30;
  if (longLen >= MIN_LONG) score += 30;
  const attrScore = Math.min(attributeCount, 5) * 5; // +5 each, capped at +25
  score += attrScore;
  if (hasImage) score += 10;
  if (aliasCount >= 1) score += 5;
  score = Math.min(score, 100);

  // --- Indexability checks ---
  const descOk = descLen >= MIN_DESC;
  const longOk = longLen >= MIN_LONG;
  const attrOk =
    attributeCount >= 3 ||
    (hasImage && attributeCount >= 1) ||
    (hasImage && longLen >= RICH_LONG);
  const topicOk = topicCount >= 1;
  const scoreOk = score >= MIN_SCORE;

  if (!descOk) reasons.push(`Description too short (${descLen}/${MIN_DESC})`);
  if (!longOk) reasons.push(`Intro too short (${longLen}/${MIN_LONG})`);
  if (!attrOk) reasons.push(`Too few attributes (${attributeCount})`);
  if (!topicOk) reasons.push("No topics assigned");
  if (!scoreOk) reasons.push(`Quality score below threshold (${score}/${MIN_SCORE})`);

  const indexable = descOk && longOk && attrOk && topicOk && scoreOk;

  let pageState: PageState;
  if (indexable) {
    pageState = "indexable";
    reasons.push("Meets indexable criteria");
  } else if (descLen > 0 && longLen >= DRAFT_LONG) {
    pageState = "draft";
    reasons.push("Draft: has content but fails one or more index gates");
  } else {
    pageState = "candidate";
    reasons.push("Candidate: insufficient content");
  }

  return { qualityScore: score, indexable, pageState, reasons };
}
