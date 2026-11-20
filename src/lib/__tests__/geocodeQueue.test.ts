import { describe, expect, it } from "vitest";
import {
  GEOCODE_AUTO_BATCH,
  GEOCODE_MANUAL_BATCH,
  geocodeBatchLimit,
  hasUsableServiceAddress,
  isMissingGps,
  prioritizeMissingGps,
} from "../geocodeQueue";

describe("geocodeQueue", () => {
  it("rejeita morada vazia ou N/A", () => {
    expect(hasUsableServiceAddress("")).toBe(false);
    expect(hasUsableServiceAddress("N/A")).toBe(false);
    expect(hasUsableServiceAddress(" Rua da Escola, Caldas da Rainha ")).toBe(true);
  });

  it("trata coordenadas incompletas como sem GPS", () => {
    expect(isMissingGps(null)).toBe(true);
    expect(isMissingGps(undefined)).toBe(true);
    expect(isMissingGps([39.4, -9.13])).toBe(false);
  });

  it("mete serviços sem GPS à frente do lote", () => {
    const sorted = prioritizeMissingGps([
      { id: "com", coordinates: [39, -9] as [number, number] },
      { id: "sem", coordinates: null },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["sem", "com"]);
  });

  it("usa lote maior no botão manual do que na manutenção automática", () => {
    expect(geocodeBatchLimit(null)).toBe(GEOCODE_AUTO_BATCH);
    expect(geocodeBatchLimit("all")).toBe(GEOCODE_MANUAL_BATCH);
  });
});
