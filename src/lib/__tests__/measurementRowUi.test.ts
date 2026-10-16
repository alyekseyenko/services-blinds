import { describe, expect, it } from "vitest";
import {
  formatMeasurementRowCollapsedSummary,
  isMeasurementLineCollapsed,
} from "@/lib/measurements/measurementRowUi";

describe("measurementRowUi", () => {
  it("deteta linha recolhida", () => {
    expect(isMeasurementLineCollapsed({ lineCollapsed: "true" } as never)).toBe(true);
    expect(isMeasurementLineCollapsed({ lineCollapsed: "" } as never)).toBe(false);
  });

  it("resume divisão e medidas no cabeçalho", () => {
    const text = formatMeasurementRowCollapsedSummary({
      qty: 2,
      width: "1200",
      height: "1500",
      divisionCode: "SALA",
      notes: "",
      fixation: "",
      controls: "",
      price: "",
    });
    expect(text).toContain("SALA");
    expect(text).toContain("1500 × 1200");
    expect(text.indexOf("1200")).toBeLessThan(text.indexOf("SALA"));
  });
});
