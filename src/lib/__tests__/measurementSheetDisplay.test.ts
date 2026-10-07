import { describe, expect, it } from "vitest";
import {
  chunkMeasurementGroupDetailEntries,
  getMeasurementGroupDetailEntries,
  partitionMeasurementGroupDetailEntries,
} from "@/lib/measurementSheetDisplay";
import type { MeasurementSheetGroup } from "@/lib/schemas/measurementSheet";

describe("getMeasurementGroupDetailEntries", () => {
  it("inclui material, tecido, referência e observações", () => {
    const group: MeasurementSheetGroup = {
      productType: "ESTORE_INTERIOR",
      productLabel: "Estore Interior",
      materialLabel: "Rolo",
      fabricLabel: "Blackout",
      referenceLabel: "REF-22",
      activationLabel: "Manual",
      observations: "Atenção ao caixilho",
      rows: [],
    };
    const labels = getMeasurementGroupDetailEntries(group).map((e) => e.label);
    expect(labels).toContain("Modelo");
    expect(labels).toContain("Tecido");
    expect(labels).toContain("Referência");
    expect(labels).toContain("Observações");
  });
});

describe("partitionMeasurementGroupDetailEntries", () => {
  it("separa observações para linha completa", () => {
    const entries = [
      { label: "Montagem", value: "Completo" },
      { label: "Material", value: "Alumínio" },
      { label: "Observações", value: "Teste longo" },
    ];
    const { gridEntries, observations } = partitionMeasurementGroupDetailEntries(entries);
    expect(gridEntries).toHaveLength(2);
    expect(observations?.value).toBe("Teste longo");
  });

  it("agrupa em linhas de 2 colunas", () => {
    const entries = [
      { label: "A", value: "1" },
      { label: "B", value: "2" },
      { label: "C", value: "3" },
    ];
    expect(chunkMeasurementGroupDetailEntries(entries, 2)).toEqual([
      [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
      ],
      [{ label: "C", value: "3" }],
    ]);
  });
});
