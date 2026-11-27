import "server-only";
import { buildMeasurementSheetFromPayload } from "@/lib/measurements/sheetBuilder";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import type {
  MeasurementGroupRow,
  MeasurementLineRow,
  MeasurementSheetRow,
  PersistedMeasurementSheetMeta,
} from "./types";
import { sheetHeaderFromRow, sheetRowsToMeasurementsPayload } from "./toPayload";

export function buildMeasurementSheetFromDb(
  sheet: MeasurementSheetRow,
  groups: MeasurementGroupRow[],
  linesByGroup: Map<string, MeasurementLineRow[]>
): MeasurementSheet & PersistedMeasurementSheetMeta {
  const payload = sheetRowsToMeasurementsPayload(groups, linesByGroup);
  const built = buildMeasurementSheetFromPayload(sheetHeaderFromRow(sheet), payload);

  const groupsWithLineIds = built.groups.map((g, gIdx) => {
    const dbGroup = groups[gIdx];
    const dbLines = dbGroup ? linesByGroup.get(dbGroup.id) ?? [] : [];
    return {
      ...g,
      rows: g.rows.map((row) => ({
        ...row,
        lineId: dbLines[row.index - 1]?.id,
      })),
    };
  });

  return {
    ...built,
    groups: groupsWithLineIds,
    sheetId: sheet.id,
    version: sheet.version,
    editedByName: sheet.edited_by_name?.trim() || undefined,
    recordedAtIso: sheet.created_at ? new Date(sheet.created_at).toISOString() : undefined,
    printedAtIso: sheet.printed_at ? new Date(sheet.printed_at).toISOString() : undefined,
    printedByName: sheet.printed_by_name?.trim() || undefined,
  };
}
