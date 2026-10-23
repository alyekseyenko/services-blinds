import { describe, expect, it } from "vitest";
import {
  measurementMaterialSectionStatus,
  measurementProductSectionShouldDefaultOpen,
  measurementProductSectionSummary,
  measurementWindowsSectionMeta,
} from "@/lib/measurements/groupFormSectionMeta";
import type { MeasurementRow, ProductGroup } from "@/types";

function emptyRow(overrides?: Partial<MeasurementRow>): MeasurementRow {
  return {
    qty: 1,
    width: "",
    height: "",
    fixation: "",
    controls: "",
    notes: "",
    price: "",
    ...overrides,
  };
}

function baseGroup(overrides?: Partial<ProductGroup>): ProductGroup {
  return {
    id: 1,
    type: "ESTORE_EXTERIOR",
    isOpen: true,
    details: {
      material: "",
      otherMaterial: "",
      ral: "",
      activation: "",
      model: "",
      fabric: "",
      reference: "",
      observations: "",
      exteriorInstallType: "COMPLETO",
      customName: "",
    },
    measurements: [emptyRow()],
    ...overrides,
  };
}

describe("groupFormSectionMeta", () => {
  it("secção produto aberta até haver nome ou medidas", () => {
    expect(measurementProductSectionShouldDefaultOpen(baseGroup())).toBe(true);
    expect(
      measurementProductSectionShouldDefaultOpen(
        baseGroup({ details: { ...baseGroup().details, customName: "Varanda" } })
      )
    ).toBe(false);
    expect(
      measurementProductSectionShouldDefaultOpen(
        baseGroup({ measurements: [emptyRow({ width: "1000", height: "1200" })] })
      )
    ).toBe(false);
  });

  it("resume produto com nome e tipo", () => {
    const g = baseGroup({
      details: {
        ...baseGroup().details,
        customName: "Varanda",
      },
    });
    expect(measurementProductSectionSummary(g)).toContain("Varanda");
    expect(measurementProductSectionSummary(g)).toContain("Estore");
  });

  it("avisa material em falta", () => {
    const status = measurementMaterialSectionStatus(baseGroup());
    expect(status.tone).toBe("warning");
  });

  it("conta janelas prontas", () => {
    const meta = measurementWindowsSectionMeta(
      baseGroup({
        measurements: [
          emptyRow({ width: "1000", height: "1200" }),
          emptyRow(),
        ],
      })
    );
    expect(meta.summary).toBe("1/2 prontas");
    expect(meta.statusBadge.tone).toBe("warning");
  });
});
