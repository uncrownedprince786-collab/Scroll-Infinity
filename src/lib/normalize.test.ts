import { describe, it, expect } from "vitest";
import {
  cleanExtract,
  firstSentence,
  formatWikidataTime,
  parseWikidataQuantity,
  truncate,
  unitEntityId,
} from "./normalize";

describe("parseWikidataQuantity", () => {
  it("parses a value with a known unit and strips the leading +", () => {
    expect(
      parseWikidataQuantity({ amount: "+695700", unit: "http://www.wikidata.org/entity/Q828224" }),
    ).toEqual({ numeric: 695700, unitLabel: "kilometre" });
  });

  it("treats unit '1' as dimensionless (no label)", () => {
    expect(parseWikidataQuantity({ amount: "+125570246", unit: "1" })).toEqual({
      numeric: 125570246,
      unitLabel: undefined,
    });
  });

  it("keeps decimals and maps square kilometre", () => {
    const r = parseWikidataQuantity({
      amount: "+377972.28",
      unit: "http://www.wikidata.org/entity/Q712226",
    });
    expect(r.numeric).toBeCloseTo(377972.28);
    expect(r.unitLabel).toBe("square kilometre");
  });

  it("preserves negative amounts", () => {
    const r = parseWikidataQuantity({
      amount: "-413",
      unit: "http://www.wikidata.org/entity/Q11573",
    });
    expect(r.numeric).toBe(-413);
    expect(r.unitLabel).toBe("metre");
  });

  it("returns no label for an unknown unit but still parses the number", () => {
    const r = parseWikidataQuantity({
      amount: "+5",
      unit: "http://www.wikidata.org/entity/Q99999999",
    });
    expect(r.numeric).toBe(5);
    expect(r.unitLabel).toBeUndefined();
  });

  it("returns null numeric for an unparseable amount", () => {
    expect(parseWikidataQuantity({ amount: "", unit: "1" }).numeric).toBeNull();
  });
});

describe("unitEntityId", () => {
  it("extracts the Q-id from a unit URI", () => {
    expect(unitEntityId("http://www.wikidata.org/entity/Q828224")).toBe("Q828224");
  });
  it("returns null for dimensionless and empty", () => {
    expect(unitEntityId("1")).toBeNull();
    expect(unitEntityId(undefined)).toBeNull();
  });
});

describe("formatWikidataTime", () => {
  it("formats a full BCE date (precision 11)", () => {
    expect(formatWikidataTime({ time: "-0660-02-11T00:00:00Z", precision: 11 })).toBe(
      "660-02-11 BCE",
    );
  });

  it("formats a full CE date", () => {
    expect(formatWikidataTime({ time: "+1868-01-03T00:00:00Z", precision: 11 })).toBe("1868-01-03");
  });

  it("collapses to the year when precision <= 9", () => {
    expect(formatWikidataTime({ time: "+2020-06-15T00:00:00Z", precision: 9 })).toBe("2020");
    expect(formatWikidataTime({ time: "-0044-03-15T00:00:00Z", precision: 9 })).toBe("44 BCE");
  });

  it("uses year-month at precision 10", () => {
    expect(formatWikidataTime({ time: "+1988-08-00T00:00:00Z", precision: 10 })).toBe("1988-08");
  });

  it("returns empty string for an unparseable time", () => {
    expect(formatWikidataTime({ time: "not-a-date", precision: 11 })).toBe("");
  });
});

describe("text helpers", () => {
  it("firstSentence returns the first sentence", () => {
    expect(firstSentence("Japan is a country. It is in Asia.")).toBe("Japan is a country.");
  });

  it("firstSentence returns the whole string when there is no delimiter", () => {
    expect(firstSentence("Hello world")).toBe("Hello world");
  });

  it("cleanExtract collapses whitespace and newlines", () => {
    expect(cleanExtract("a\n\n  b   c ")).toBe("a b c");
  });

  it("truncate cuts long text and appends an ellipsis", () => {
    const r = truncate("hello world", 5);
    expect(r).toBe("hell…");
    expect(r.length).toBe(5);
  });

  it("truncate leaves short text untouched", () => {
    expect(truncate("hi", 5)).toBe("hi");
    expect(truncate("", 5)).toBe("");
    expect(truncate("anything", 0)).toBe("");
  });
});
