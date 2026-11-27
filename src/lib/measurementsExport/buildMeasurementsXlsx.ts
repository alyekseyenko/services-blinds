import ExcelJS from "exceljs";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { COMPANY_LABEL } from "@/lib/branding";
import { measurementExportByline } from "@/lib/measurementsExport/exportByline";
import {
  getMeasurementGroupDetailEntries,
  measurementLineColumnPlan,
  measurementLineColumnValue,
} from "@/lib/measurementSheetDisplay";
import { measurementClientDetailRows } from "@/lib/measurements/clientContactDisplay";
import { sheetHeaderDisplay } from "@/lib/measurements/sheetCrmHeader";

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
  const exportByline = measurementExportByline(sheet.technicianName);
  const clientRows = measurementClientDetailRows(sheet);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = exportByline || COMPANY_LABEL;
  workbook.created = new Date();

  const clientColStart = 6;
  const clientDetailStartRow = 2;
  const serviceStartRow =
    Math.max(exportByline ? 3 : 2, clientDetailStartRow + clientRows.length - 1) + 2;

  const ws = workbook.addWorksheet("Medições", {
    views: [{ state: "frozen", ySplit: serviceStartRow + 2 }],
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

  const titleRow = ws.addRow(["Ficha Técnica de Medição", "", "", "", "", "Dados do cliente"]);
  titleRow.getCell(1).font = { bold: true, size: 16 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, 5);
  titleRow.getCell(clientColStart).font = { bold: true, size: 10 };
  ws.mergeCells(titleRow.number, clientColStart, titleRow.number, 9);

  if (exportByline) {
    const bylineRow = ws.addRow([exportByline]);
    ws.mergeCells(bylineRow.number, 1, bylineRow.number, 5);
    bylineRow.getCell(1).font = { bold: true, size: 11 };
  }

  clientRows.forEach((row, index) => {
    const rowNumber = clientDetailStartRow + index;
    ws.getCell(rowNumber, clientColStart).value = row.label;
    ws.getCell(rowNumber, clientColStart).font = { bold: true };
    ws.getCell(rowNumber, clientColStart + 1).value = row.value;
    ws.mergeCells(rowNumber, clientColStart + 1, rowNumber, 9);
  });

  ws.getCell(serviceStartRow, 1).value = "Serviço e ficha";
  ws.getCell(serviceStartRow, 1).font = { bold: true, size: 10 };
  ws.mergeCells(serviceStartRow, 1, serviceStartRow, 9);

  const serviceRow1 = ws.getRow(serviceStartRow + 1);
  serviceRow1.getCell(1).value = "N.º serviço";
  serviceRow1.getCell(2).value = sheetHeaderDisplay(sheet.serviceNumber);
  serviceRow1.getCell(4).value = "NSI";
  serviceRow1.getCell(5).value = sheetHeaderDisplay(sheet.nsi);
  serviceRow1.getCell(7).value = "Serviço";
  serviceRow1.getCell(8).value = sheet.serviceLabel || "—";
  serviceRow1.getCell(1).font = { bold: true };
  serviceRow1.getCell(4).font = { bold: true };
  serviceRow1.getCell(7).font = { bold: true };

  const serviceRow2 = ws.getRow(serviceStartRow + 2);
  serviceRow2.getCell(1).value = "Técnico";
  serviceRow2.getCell(2).value = sheet.technicianName || "—";
  serviceRow2.getCell(4).value = "Data da visita";
  serviceRow2.getCell(5).value = formatVisitDate(sheet.visitDateIso);
  serviceRow2.getCell(1).font = { bold: true };
  serviceRow2.getCell(4).font = { bold: true };

  if (sheet.remeasureLabel?.trim()) {
    const remeasureRow = ws.getRow(serviceStartRow + 3);
    remeasureRow.getCell(1).value = "Medidas Retificadas";
    remeasureRow.getCell(2).value = sheet.remeasureLabel.trim();
    remeasureRow.getCell(1).font = { bold: true };
    ws.mergeCells(serviceStartRow + 3, 2, serviceStartRow + 3, 9);
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
