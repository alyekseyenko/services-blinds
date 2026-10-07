import { describe, expect, it } from "vitest";
import {
  parseMeasurementPriceEuro,
  sumMeasurementLinePrices,
} from "@/lib/measurements/measurementPriceTotal";

describe("measurementPriceTotal", () => {
  it("interpreta preços com vírgula ou €", () => {
    expect(parseMeasurementPriceEuro("99,5")).toBe(99.5);
    expect(parseMeasurementPriceEuro("120 €")).toBe(120);
  });

  it("soma quando todas as linhas têm preço", () => {
    expect(sumMeasurementLinePrices(["100", "50,5"])).toBe(150.5);
  });

  it("devolve null se alguma linha não tem preço", () => {
    expect(sumMeasurementLinePrices(["100", ""])).toBeNull();
    expect(sumMeasurementLinePrices(["100", null])).toBeNull();
  });

  it("devolve null sem linhas", () => {
    expect(sumMeasurementLinePrices([])).toBeNull();
  });

  it("devolve null se o valor não for array", () => {
    expect(sumMeasurementLinePrices(null)).toBeNull();
    expect(sumMeasurementLinePrices("10,20")).toBeNull();
  });
});
