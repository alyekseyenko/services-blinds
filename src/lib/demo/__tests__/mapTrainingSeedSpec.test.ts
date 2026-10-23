import { describe, expect, it } from "vitest";
import {
  MAP_TRAINING_SEED_ENTRIES,
  MAP_TRAINING_SEED_MARKER,
  mapTrainingSeedTitleToken,
  opportunityTitleHasMapTrainingSeed,
} from "@/lib/demo/mapTrainingSeedSpec";

describe("mapTrainingSeedSpec", () => {
  it("defines 20 map training pins along the west coast corridor", () => {
    expect(MAP_TRAINING_SEED_ENTRIES).toHaveLength(20);
    const cities = new Set(MAP_TRAINING_SEED_ENTRIES.map((e) => e.city));
    expect(cities.has("Lourinhã")).toBe(true);
    expect(cities.has("Caldas da Rainha")).toBe(true);
    expect(cities.has("Nazaré")).toBe(true);
  });

  it("uses stable title tokens for idempotent seeding", () => {
    expect(mapTrainingSeedTitleToken("caldas-2")).toBe(`[${MAP_TRAINING_SEED_MARKER}-caldas-2]`);
    expect(
      opportunityTitleHasMapTrainingSeed(`Medidas — Cliente Teste [${MAP_TRAINING_SEED_MARKER}-nazare-1]`)
    ).toBe(true);
    expect(opportunityTitleHasMapTrainingSeed("Serviço normal")).toBe(false);
  });

  it("assigns 3–4 entries per main locality", () => {
    const count = (city: string) =>
      MAP_TRAINING_SEED_ENTRIES.filter((e) => e.city === city).length;
    expect(count("Lourinhã")).toBe(4);
    expect(count("Torres Vedras")).toBe(3);
    expect(count("Peniche")).toBe(3);
    expect(count("Caldas da Rainha")).toBe(4);
    expect(count("Óbidos")).toBe(2);
    expect(count("Nazaré")).toBe(4);
  });
});
