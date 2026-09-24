import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseWikipediaSummary } from "./wikipedia";

function load(name: string): unknown {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("parseWikipediaSummary", () => {
  it("parses the Japan summary fixture", () => {
    const s = parseWikipediaSummary(load("japan.summary.json"));
    expect(s).not.toBeNull();
    expect(s!.resolvedTitle).toBe("Japan");
    expect(s!.pageid).toBe(15573);
    expect(s!.wikibaseItem).toBe("Q17");
    expect(s!.description).toBe("Country in East Asia");
    expect(s!.extract ?? "").toContain("island country in East Asia");
    expect(s!.thumbnail?.source).toContain("Flag_of_Japan");
    expect(s!.thumbnail?.width).toBe(330);
    expect(s!.canonicalUrl).toBe("https://en.wikipedia.org/wiki/Japan");
    expect(typeof s!.timestamp).toBe("string");
  });

  it("parses the Sun summary fixture", () => {
    const s = parseWikipediaSummary(load("sun.summary.json"));
    expect(s).not.toBeNull();
    expect(s!.resolvedTitle).toBe("Sun");
    expect(s!.wikibaseItem).toBe("Q525");
    expect(s!.description).toBe("Star at the centre of the Solar System");
    expect(s!.originalimage?.source).toContain("The_Sun_in_white_light");
  });

  it("returns null for empty or error bodies", () => {
    expect(parseWikipediaSummary(null)).toBeNull();
    expect(parseWikipediaSummary({})).toBeNull();
    expect(
      parseWikipediaSummary({
        type: "https://mediawiki.org/wiki/HyperSwitch/errors/not_found",
        title: "Not found.",
      }),
    ).toBeNull();
  });
});
