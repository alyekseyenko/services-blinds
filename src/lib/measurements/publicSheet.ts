import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

/** Ficha que o técnico pode ver: mesmas medidas, sem preços do escritório. */
export function stripMeasurementSheetPrices(sheet: MeasurementSheet): MeasurementSheet {
  return {
    ...sheet,
    groups: sheet.groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row, price: undefined })),
    })),
  };
}
