import { describe, it, expect } from "vitest";
import {
  citiesMatch,
  normalizeLocationKey,
  resolveCityKeyFromOpportunity,
  resolveCityKeyFromRaw,
} from "../geo";

describe("geo city helpers", () => {
  it("normalizes accents and case", () => {
    expect(normalizeLocationKey("Óbidos")).toBe("obidos");
    expect(normalizeLocationKey("LISBOA")).toBe("lisboa");
  });

  it("matches cities regardless of formatting", () => {
    expect(citiesMatch("Lisboa", "lisboa")).toBe(true);
    expect(citiesMatch("Óbidos", "obidos")).toBe(true);
    expect(citiesMatch("Porto", "Lisboa")).toBe(false);
  });

  it("resolves city key from opportunity address fields", () => {
    expect(
      resolveCityKeyFromOpportunity({ addressCity: "LISBOA" })
    ).toEqual({ key: "lisboa", display: "Lisboa" });

    expect(
      resolveCityKeyFromOpportunity({ address: "Rua A, Nazaré, Portugal" })
    ).toEqual({ key: "nazare", display: "Nazaré" });
  });

  it("title-cases display names", () => {
    expect(resolveCityKeyFromRaw("sao martinho do porto")).toEqual({
      key: "sao martinho do porto",
      display: "Sao Martinho Do Porto",
    });
  });
});
