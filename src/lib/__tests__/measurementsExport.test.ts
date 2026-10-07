import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildMeasurementsXlsx } from "@/lib/measurementsExport/buildMeasurementsXlsx";
import { createOnboardingDemoMeasurementSheet } from "@/lib/onboarding/demoMeasurementSheet";

describe("buildMeasurementsXlsx", () => {
  it("gera workbook com cabeçalho e linhas de medição", async () => {
    const sheet = createOnboardingDemoMeasurementSheet();
    const buffer = await buildMeasurementsXlsx(sheet);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const ws = workbook.getWorksheet("Medições");
    expect(ws).toBeTruthy();
    expect(ws?.getCell("A1").value).toBe("Ficha Técnica de Medição");

    const values: string[] = [];
    ws?.eachRow((row) => {
      const first = row.getCell(1).value;
      if (typeof first === "string" && first.includes("Estore")) {
        values.push(first);
      }
    });
    expect(values.some((v) => v.includes("Estore Exterior"))).toBe(true);
  });
});
