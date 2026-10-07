import { describe, expect, it } from "vitest";
import {
  appendMeasurementSheetDeParam,
  measurementSheetBackHref,
  parseMeasurementSheetBackContext,
} from "@/lib/measurements/sheetPageBack";

describe("sheetPageBack", () => {
  it("resolve contexto e links", () => {
    expect(parseMeasurementSheetBackContext("oportunidade")).toBe("oportunidade");
    expect(measurementSheetBackHref("oportunidade")).toBeNull();
    expect(measurementSheetBackHref("lista")).toBe("/admin/medicoes");
    expect(appendMeasurementSheetDeParam("/medicoes/x", "lista")).toBe(
      "/medicoes/x?de=lista"
    );
  });
});
