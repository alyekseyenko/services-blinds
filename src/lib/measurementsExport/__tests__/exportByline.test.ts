import { describe, expect, it, vi, afterEach } from "vitest";
import { measurementExportByline } from "@/lib/measurementsExport/exportByline";

describe("measurementExportByline", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa o técnico da ficha quando não há env", () => {
    vi.stubEnv("NEXT_PUBLIC_MEASUREMENT_SHEET_EXPORT_BYLINE", "");
    expect(measurementExportByline("João Silva")).toBe("João Silva");
  });

  it("prefere NEXT_PUBLIC_MEASUREMENT_SHEET_EXPORT_BYLINE", () => {
    vi.stubEnv("NEXT_PUBLIC_MEASUREMENT_SHEET_EXPORT_BYLINE", "Maria Costa");
    expect(measurementExportByline("João Silva")).toBe("Maria Costa");
  });
});
