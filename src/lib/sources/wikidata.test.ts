import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseWikidataEntity, type WbGetEntitiesResponse } from "./wikidata";
import type { AttributeValue } from "@/lib/types";

function load(name: string): WbGetEntitiesResponse {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as WbGetEntitiesResponse;
}

function byKey(attrs: AttributeValue[]): Record<string, AttributeValue> {
  return Object.fromEntries(attrs.map((a) => [a.key, a]));
}

const AT = "2026-09-24T00:00:00.000Z";

describe("parseWikidataEntity (Japan / Q17)", () => {
  const labels: Record<string, string> = {
    Q17: "Japan",
    Q1490: "Tokyo",
    Q48: "Asia",
    Q5287: "Japanese",
    Q8146: "Japanese yen",
    Q39231: "Mount Fuji",
    Q712226: "square kilometre",
    Q577: "year",
  };
  const facts = parseWikidataEntity(load("japan.wikidata.json"), "Q17", (id) => labels[id], AT);
  const k = byKey(facts.attributes);

  it("reads label, description and aliases", () => {
    expect(facts.label).toBe("Japan");
    expect(facts.description).toBe("island country in East Asia");
    expect(facts.aliases).toContain("State of Japan");
    expect(facts.aliases).toContain("Land of the Rising Sun");
  });

  it("prefers the preferred-rank capital (Tokyo) over historical ones", () => {
    expect(k.capital.value).toBe("Tokyo");
    expect(k.capital.kind).toBe("entity");
  });

  it("prefers the preferred-rank population and formats it", () => {
    expect(k.population.numeric).toBe(123802000);
    expect(k.population.value).toBe("123,802,000");
    expect(k.population.unit).toBeUndefined(); // dimensionless
    expect(k.population.kind).toBe("quantity");
  });

  it("maps entity-valued facts through the resolver", () => {
    expect(k.country.value).toBe("Japan");
    expect(k.continent.value).toBe("Asia");
    expect(k.currency.value).toBe("Japanese yen");
    expect(k["official-language"].value).toBe("Japanese");
    expect(k["highest-point"].value).toBe("Mount Fuji");
  });

  it("parses quantities with resolved units", () => {
    expect(k.area.numeric).toBeCloseTo(377972.28);
    expect(k.area.unit).toBe("square kilometre");
    expect(k["life-expectancy"].numeric).toBeCloseTo(83.98488);
    expect(k["life-expectancy"].unit).toBe("year");
  });

  it("picks the preferred-rank inception and formats a full date", () => {
    // Q17 has a preferred P571 of 1947-05-03 (modern state), chosen over the
    // legendary -0660 founding — this is exactly what rank preference is for.
    expect(k.inception.value).toBe("1947-05-03");
    expect(k.inception.kind).toBe("date");
  });

  it("stamps provenance and verification", () => {
    expect(k.population.verification).toBe("supported");
    expect(k.population.provenance[0]).toMatchObject({
      source: "wikidata",
      sourceName: "Wikidata",
      url: "https://www.wikidata.org/wiki/Q17",
      license: "CC0",
      retrievedAt: AT,
    });
    expect(k.population.observedAt).toBe(AT);
  });
});

describe("parseWikidataEntity (Sun / Q525)", () => {
  const labels: Record<string, string> = {
    Q712226: "square kilometre",
    Q828224: "kilometre",
    Q115359865: "×10^24 kg",
  };
  const facts = parseWikidataEntity(load("sun.wikidata.json"), "Q525", (id) => labels[id], AT);
  const k = byKey(facts.attributes);

  it("reads label and alias", () => {
    expect(facts.label).toBe("Sun");
    expect(facts.aliases).toContain("the Sun");
  });

  it("chooses preferred-rank values over placeholder normal-rank data", () => {
    expect(k.mass.numeric).toBe(1988475); // not the junk normal-rank "+1"
    expect(k.radius.numeric).toBe(695700); // not "+1"
    expect(k.radius.unit).toBe("kilometre");
  });

  it("parses area", () => {
    expect(k.area.numeric).toBe(6082000000000);
    expect(k.area.unit).toBe("square kilometre");
  });

  it("omits properties the entity does not have", () => {
    expect(k.capital).toBeUndefined();
    expect(k.population).toBeUndefined();
  });
});
