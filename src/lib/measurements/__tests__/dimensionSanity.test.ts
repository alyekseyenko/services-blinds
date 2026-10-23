import { describe, expect, it } from "vitest";
import { getDimensionSanityWarnings } from "@/lib/measurements/dimensionSanity";
import { emptyMeasurementRow } from "@/lib/measurements/rowPayload";

describe("getDimensionSanityWarnings", () => {
  it("avisa medidas baixas em modo store", () => {
    const row = { ...emptyMeasurementRow(), height: "120", width: "1500" };
    const warnings = getDimensionSanityWarnings(row, "store");
    expect(warnings.some((w) => w.includes("abaixo de 250 mm"))).toBe(true);
  });

  it("avisa medidas altas em modo store", () => {
    const row = { ...emptyMeasurementRow(), height: "1500", width: "12000" };
    const warnings = getDimensionSanityWarnings(row, "store");
    expect(warnings.some((w) => w.includes("acima de 5000 mm"))).toBe(true);
  });

  it("não avisa medidas normais", () => {
    const row = { ...emptyMeasurementRow(), height: "1500", width: "1200" };
    expect(getDimensionSanityWarnings(row, "store")).toEqual([]);
  });

  it("avisa profundidade alta em skylight", () => {
    const row = {
      ...emptyMeasurementRow(),
      height: "800",
      width: "600",
      skylightExteriorHeight: "850",
      skylightExteriorWidth: "650",
      depth: "1200",
    };
    const warnings = getDimensionSanityWarnings(row, "skylight");
    expect(warnings.some((w) => w.includes("Profundidade acima de 1000 mm"))).toBe(true);
  });

  it("usa vão em modo opening", () => {
    const row = {
      ...emptyMeasurementRow(),
      openingHeight: "100",
      openingWidth: "1200",
    };
    const warnings = getDimensionSanityWarnings(row, "opening");
    expect(warnings.some((w) => w.includes("Altura do vão"))).toBe(true);
  });
});
