import { describe, it, expect } from "vitest";
import { assessQuality } from "./quality";

const longIntro = "x".repeat(200);

describe("assessQuality", () => {
  it("marks a thin entity as not indexable (candidate)", () => {
    const r = assessQuality({
      description: "Short",
      longDescription: "",
      attributeCount: 0,
      hasImage: false,
      aliasCount: 0,
      topicCount: 0,
    });
    expect(r.indexable).toBe(false);
    expect(r.pageState).toBe("candidate");
    expect(r.reasons.some((x) => x.includes("Intro too short"))).toBe(true);
    expect(r.reasons.some((x) => x.includes("No topics"))).toBe(true);
  });

  it("marks a rich entity as indexable with a full score", () => {
    const r = assessQuality({
      description: "A country in East Asia region",
      longDescription: longIntro,
      attributeCount: 5,
      hasImage: true,
      aliasCount: 2,
      topicCount: 2,
    });
    expect(r.indexable).toBe(true);
    expect(r.pageState).toBe("indexable");
    expect(r.qualityScore).toBe(100);
    expect(r.reasons).toContain("Meets indexable criteria");
  });

  it("accepts one attribute when an image is present", () => {
    const r = assessQuality({
      description: "A sufficiently long description here",
      longDescription: longIntro,
      attributeCount: 1,
      hasImage: true,
      aliasCount: 0,
      topicCount: 1,
    });
    expect(r.indexable).toBe(true);
  });

  it("accepts an image-rich concept page with a long intro and no attributes", () => {
    const r = assessQuality({
      description: "A sufficiently long description here",
      longDescription: "z".repeat(320),
      attributeCount: 0,
      hasImage: true,
      aliasCount: 1,
      topicCount: 1,
    });
    expect(r.indexable).toBe(true);
    expect(r.pageState).toBe("indexable");
  });

  it("rejects one attribute without an image", () => {
    const r = assessQuality({
      description: "A sufficiently long description here",
      longDescription: longIntro,
      attributeCount: 1,
      hasImage: false,
      aliasCount: 0,
      topicCount: 1,
    });
    expect(r.indexable).toBe(false);
    expect(r.reasons.some((x) => x.includes("Too few attributes"))).toBe(true);
  });

  it("classifies a medium-length page as draft", () => {
    const r = assessQuality({
      description: "Has a real description",
      longDescription: "y".repeat(150),
      attributeCount: 0,
      hasImage: false,
      aliasCount: 0,
      topicCount: 1,
    });
    expect(r.indexable).toBe(false);
    expect(r.pageState).toBe("draft");
  });

  it("caps the attribute contribution at 25", () => {
    const r = assessQuality({
      description: "A description that is clearly long enough",
      longDescription: longIntro,
      attributeCount: 20,
      hasImage: false,
      aliasCount: 0,
      topicCount: 1,
    });
    // 30 (desc) + 30 (long) + 25 (attr cap) = 85
    expect(r.qualityScore).toBe(85);
  });
});
