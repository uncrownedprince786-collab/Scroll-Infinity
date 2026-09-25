import { describe, it, expect } from "vitest";
import { rankDiscoveryCandidates, type CandidateRef, type ExistingKeys } from "./discovery-rank";

const noneExisting: ExistingKeys = { slugs: new Set(), names: new Set() };

describe("rankDiscoveryCandidates", () => {
  it("ranks candidates by how many entities reference them", () => {
    const refs: CandidateRef[] = [
      { label: "Tokyo", topicSlugs: ["geography"] },
      { label: "Tokyo", topicSlugs: ["history"] },
      { label: "Ottawa", topicSlugs: ["geography"] },
    ];
    const out = rankDiscoveryCandidates(refs, noneExisting, 10);
    expect(out.map((c) => c.title)).toEqual(["Tokyo", "Ottawa"]);
    // Topics are the union of every referrer's topics.
    expect(new Set(out[0].topics)).toEqual(new Set(["geography", "history"]));
  });

  it("excludes candidates that already exist by slug or name", () => {
    const refs: CandidateRef[] = [
      { label: "Tokyo", topicSlugs: ["geography"] },
      { label: "Paris", topicSlugs: ["geography"] },
    ];
    const existing: ExistingKeys = {
      slugs: new Set(["tokyo"]),
      names: new Set(["paris"]),
    };
    const out = rankDiscoveryCandidates(refs, existing, 10);
    expect(out).toHaveLength(0);
  });

  it("respects the limit and drops trivial labels", () => {
    const refs: CandidateRef[] = [
      { label: "Alpha", topicSlugs: [] },
      { label: "Beta", topicSlugs: [] },
      { label: "Gamma", topicSlugs: [] },
      { label: "x", topicSlugs: [] }, // too short
      { label: "  ", topicSlugs: [] }, // empty
    ];
    expect(rankDiscoveryCandidates(refs, noneExisting, 2)).toHaveLength(2);
    expect(rankDiscoveryCandidates(refs, noneExisting, 0)).toHaveLength(0);
  });

  it("treats labels differing only by slug as the same candidate", () => {
    const refs: CandidateRef[] = [
      { label: "São Paulo", topicSlugs: ["geography"] },
      { label: "Sao Paulo", topicSlugs: ["history"] },
    ];
    const out = rankDiscoveryCandidates(refs, noneExisting, 10);
    expect(out).toHaveLength(1);
    expect(new Set(out[0].topics)).toEqual(new Set(["geography", "history"]));
  });
});
