import "server-only";
import { isMeasurementsDbConfigured, measurementsQuery } from "../db/client";

export async function setMeasurementSheetPrinted(input: {
  sheetId: string;
  printed: boolean;
  printedByName: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!isMeasurementsDbConfigured()) {
    return { success: false, error: "Base de dados de medições indisponível." };
  }
  const name = input.printedByName?.trim() || null;
  const rows = await measurementsQuery<{ id: string }>(
    input.printed
      ? `UPDATE measurement_sheet
         SET printed_at = NOW(), printed_by_name = $2
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`
      : `UPDATE measurement_sheet
         SET printed_at = NULL, printed_by_name = NULL
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
    input.printed ? [input.sheetId, name] : [input.sheetId]
  );
  if (!rows[0]?.id) {
    return { success: false, error: "Ficha de medições não encontrada." };
  }
  return { success: true };
}
