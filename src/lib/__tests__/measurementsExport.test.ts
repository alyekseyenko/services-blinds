import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildMeasurementsXlsx } from "@/lib/measurementsExport/buildMeasurementsXlsx";
import { buildMeasurementsPdf } from "@/lib/measurementsExport/buildMeasurementsPdf";
import { formatMeasurementPdfPageLabel } from "@/lib/measurementsExport/pdfPageFooter";
import { createOnboardingDemoMeasurementSheet } from "@/lib/demo/demoMeasurementSheet";

describe("formatMeasurementPdfPageLabel", () => {
  it("formata paginação em pt-PT", () => {
    expect(formatMeasurementPdfPageLabel(2, 5)).toBe("Pág. 2 de 5");
  });
});

describe("buildMeasurementsPdf", () => {
  it("gera buffer PDF não vazio", async () => {
    const sheet = createOnboardingDemoMeasurementSheet();
    const landscape = await buildMeasurementsPdf(sheet);
    const portrait = await buildMeasurementsPdf(sheet, "portrait");
    expect(landscape.length).toBeGreaterThan(500);
    expect(portrait.length).toBeGreaterThan(500);
    expect(landscape.subarray(0, 4).toString()).toBe("%PDF");
    expect(portrait.subarray(0, 4).toString()).toBe("%PDF");
  });

});

describe("buildMeasurementsXlsx", () => {
  it("gera workbook com cabeçalho e linhas de medição", async () => {
    const sheet = createOnboardingDemoMeasurementSheet();
    const buffer = await buildMeasurementsXlsx(sheet);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const ws = workbook.getWorksheet("Medições");
    expect(ws).toBeTruthy();
    expect(ws?.getCell("A1").value).toBe("Ficha Técnica de Medição");

    expect(ws?.getCell("F1").value).toBe("Dados do cliente");
    expect(ws?.getCell("F2").value).toBe("Cliente");
    expect(ws?.getCell("F3").value).toBe("Morada");

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
