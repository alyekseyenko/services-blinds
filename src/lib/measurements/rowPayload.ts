import type { MeasurementRow } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatControlsDisplay,
  formatFixationDisplay,
  pickLineExtras,
} from "@/lib/measurements/extendedFields";

export function emptyMeasurementRow(): MeasurementRow {
  return {
    qty: 1,
    width: "",
    height: "",
    fixation: "",
    controls: "",
    notes: "",
    price: "",
    divisionCode: "",
    divisionCustom: "",
    fixationCodes: "",
    fixationCustom: "",
    controlsCodes: "",
    controlsCustom: "",
    openingWidth: "",
    openingHeight: "",
  };
}

/** Sincroniza campos estruturados com strings legadas (CRM, PDF, notas). */
export function syncMeasurementRowLegacyFields(row: MeasurementRow): MeasurementRow {
  const extras = pickLineExtras(row as unknown as Record<string, unknown>);
  const divisionLabel = getDivisionLabel(extras.divisionCode, extras.divisionCustom);
  const fixationLabel = formatFixationDisplay(extras.fixationCodes, extras.fixationCustom);
  const controlsLabel = formatControlsDisplay(extras.controlsCodes, extras.controlsCustom);

  return {
    ...row,
    ...extras,
    notes: divisionLabel || row.notes?.trim() || "",
    fixation: fixationLabel || row.fixation?.trim() || "",
    controls: controlsLabel || row.controls?.trim() || "",
  };
}

export function hydrateMeasurementRowFromLegacy(row: Partial<MeasurementRow>): MeasurementRow {
  const base = { ...emptyMeasurementRow(), ...row };
  if (!base.divisionCode?.trim() && base.notes?.trim()) {
    return {
      ...base,
      divisionCode: "OUTROS",
      divisionCustom: base.notes.trim(),
    };
  }
  return syncMeasurementRowLegacyFields(base);
}
