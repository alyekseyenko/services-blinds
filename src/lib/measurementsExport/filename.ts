import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import type { MeasurementPdfLayout } from "./MeasurementPdfDocument";

export function buildMeasurementsExportFilename(
  sheet: MeasurementSheet,
  ext: "xlsx" | "pdf",
  layout: MeasurementPdfLayout = "landscape"
): string {
  const nsi = (sheet.nsi || "N-A").replace(/[^\w-]+/g, "_").slice(0, 40);
  const orientation = ext === "pdf" && layout === "portrait" ? "_vertical" : "";
  return `Medicoes_NSI_${nsi}${orientation}.${ext}`;
}