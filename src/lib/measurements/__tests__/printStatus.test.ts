import { describe, expect, it } from "vitest";
import {
  filterSheetsByPrintState,
  formatMeasurementPrintLabel,
  isMeasurementSheetPrinted,
} from "@/lib/measurements/printStatus";

describe("printStatus", () => {
  it("por imprimir quando não há data", () => {
    expect(isMeasurementSheetPrinted(null)).toBe(false);
    expect(formatMeasurementPrintLabel(null)).toBe("Por imprimir");
  });

  it("mostra impressa com data e nome", () => {
    const label = formatMeasurementPrintLabel("2026-11-25T12:00:00.000Z", "Ana");
    expect(label.startsWith("Impressa")).toBe(true);
    expect(label).toContain("Ana");
  });

  it("filtra a lista por estado de impressão", () => {
    const items = [{ printedAt: null }, { printedAt: "2026-11-25T12:00:00.000Z" }];
    expect(filterSheetsByPrintState(items, "por-imprimir")).toHaveLength(1);
    expect(filterSheetsByPrintState(items, "impressas")).toHaveLength(1);
    expect(filterSheetsByPrintState(items, "todas")).toHaveLength(2);
  });
});
