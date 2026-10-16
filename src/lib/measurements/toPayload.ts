import type { MeasurementsPayload } from "@/lib/schemas";
import { pickGroupExtras, pickLineExtras } from "@/lib/measurements/extendedFields";
import { hydrateMeasurementRowFromLegacy } from "@/lib/measurements/rowPayload";
import type { MeasurementGroupRow, MeasurementLineRow, MeasurementSheetRow } from "./types";

export function sheetRowsToMeasurementsPayload(
  groups: MeasurementGroupRow[],
  linesByGroup: Map<string, MeasurementLineRow[]>
): MeasurementsPayload {
  return {
    groups: groups.map((g) => {
      const lines = linesByGroup.get(g.id) ?? [];
      return {
        type: g.product_type,
        details: {
          material: g.material ?? undefined,
          otherMaterial: g.other_material ?? undefined,
          ral: g.ral ?? undefined,
          activation: g.activation ?? undefined,
          model: g.model ?? undefined,
          fabric: g.fabric ?? undefined,
          reference: g.reference ?? undefined,
          observations: g.observations ?? undefined,
          ...pickGroupExtras({
            ...(g.group_extra ?? {}),
          }),
        },
        measurements: lines.map((line) => {
          const divisionRaw = line.division?.trim() || "";
          const notesRaw = line.notes?.trim() || "";
          const hydrated = hydrateMeasurementRowFromLegacy({
            qty: Number(line.qty) || 0,
            width: String(line.width_mm ?? ""),
            height: String(line.height_mm ?? ""),
            notes: divisionRaw || notesRaw,
            fixation: line.fixation ?? "",
            controls: line.controls ?? "",
            price: line.price ?? "",
            ...pickLineExtras((line.line_extra as Record<string, unknown>) ?? {}),
          });
          return {
            qty: Number(hydrated.qty) || 0,
            width: Number(hydrated.width) || 0,
            height: Number(hydrated.height) || 0,
            notes: hydrated.notes,
            fixation: hydrated.fixation,
            controls: hydrated.controls,
            price: hydrated.price,
            divisionCode: hydrated.divisionCode,
            divisionCustom: hydrated.divisionCustom,
            fixationCodes: hydrated.fixationCodes,
            fixationCustom: hydrated.fixationCustom,
            controlsCodes: hydrated.controlsCodes,
            controlsCustom: hydrated.controlsCustom,
            openingWidth: hydrated.openingWidth,
            openingHeight: hydrated.openingHeight,
            lineNotes:
              notesRaw && divisionRaw && notesRaw !== divisionRaw ? notesRaw : undefined,
            ...pickLineExtras(hydrated as unknown as Record<string, unknown>),
            isPrepared: line.is_prepared,
          };
        }),
      };
    }),
  };
}

export function sheetHeaderFromRow(row: MeasurementSheetRow) {
  return {
    opportunityId: row.opportunity_id,
    clientName: row.client_name,
    nsi: row.nsi ?? undefined,
    address: row.address,
    serviceLabel: row.service_label ?? undefined,
    technicianName: row.technician_name ?? undefined,
    visitDateIso: row.visit_at ? new Date(row.visit_at).toISOString() : undefined,
  };
}
