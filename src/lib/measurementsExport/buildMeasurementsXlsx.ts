import ExcelJS from "exceljs";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { COMPANY_LABEL } from "@/lib/branding";
import {
  getMeasurementGroupDetailEntries,
  measurementLineColumnPlan,
  measurementLineColumnValue,
} from "@/lib/measurementSheetDisplay";

function formatVisitDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function buildMeasurementsXlsx(sheet: MeasurementSheet): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_LABEL;
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Medições", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  ws.columns = [
    { width: 5 },
    { width: 18 },
    { width: 6 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 22 },
    { width: 10 },
  ];

  const titleRow = ws.addRow(["Ficha Técnica de Medição", "", "", "", "", "", "", "", ""]);
  titleRow.font = { bold: true, size: 16 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, 9);

  ws.addRow([COMPANY_LABEL]);
  ws.addRow([]);
  ws.addRow(["Cliente", sheet.clientName, "", "NSI", sheet.nsi || "—"]);
  ws.addRow(["Morada", sheet.address, "", "Serviço", sheet.serviceLabel || "—"]);
  ws.addRow([
    "Técnico",
    sheet.technicianName || "—",
    "",
    "Data da visita",
    formatVisitDate(sheet.visitDateIso),
  ]);
  if (sheet.remeasureLabel?.trim()) {
    ws.addRow(["Retificação de medidas", sheet.remeasureLabel.trim()]);
  }
  ws.addRow([]);

  let totalUnits = 0;

  for (const group of sheet.groups) {
    const plan = measurementLineColumnPlan(group);
    const headerLabels = plan.columns.map((col) => col.header);
    const colCount = headerLabels.length;

    const sub = ws.addRow([group.productLabel]);
    sub.font = { bold: true, size: 12 };
    ws.mergeCells(sub.number, 1, sub.number, colCount);

    for (const detail of getMeasurementGroupDetailEntries(group)) {
      const detailRow = ws.addRow([detail.label, detail.value]);
      detailRow.getCell(1).font = { bold: true };
      ws.mergeCells(detailRow.number, 2, detailRow.number, colCount);
    }

    const header = ws.addRow(headerLabels);
    header.font = { bold: true };
    header.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8E8" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    for (const row of group.rows) {
      totalUnits += row.qty;
      const dataRow = ws.addRow(
        plan.columns.map((col) =>
          measurementLineColumnValue(row, col.key, plan.openingIsPrimary)
        )
      );
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    ws.addRow([]);
  }

  const totalRow = ws.addRow(["", "", `Total unidades: ${totalUnits}`]);
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
