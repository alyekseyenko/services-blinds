import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

export function buildMeasurementsExportFilename(
  sheet: MeasurementSheet,
  ext: "xlsx" | "pdf"
): string {
  const nsi = (sheet.nsi || "N-A").replace(/[^\w-]+/g, "_").slice(0, 40);
  return `Medicoes_NSI_${nsi}.${ext}`;
}
