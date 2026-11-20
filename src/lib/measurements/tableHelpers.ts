import type { MeasurementRow } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";

export function parseRowQty(value: string | number | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function measurementRowMobileTitle(row: MeasurementRow, rIdx: number): string {
  const division = getDivisionLabel(row.divisionCode, row.divisionCustom)?.trim();
  if (division) return division;
  return `Janela ${rIdx + 1}`;
}

export function rowExtrasShouldDefaultOpen(
  row: MeasurementRow,
  showExteriorOpeningDims: boolean
): boolean {
  if (showExteriorOpeningDims) return true;
  if (row.fixationCodes?.trim() || row.fixationCustom?.trim() || row.fixation?.trim()) {
    return true;
  }
  if (row.controlsCodes?.trim() || row.controlsCustom?.trim() || row.controls?.trim()) {
    return true;
  }
  if (row.openingWidth?.trim() || row.openingHeight?.trim()) return true;
  return false;
}

export function groupHasHardwareValues(
  measurements: MeasurementRow[],
  portaAmerica: boolean
): boolean {
  if (!portaAmerica) return true;
  return measurements.some(
    (row) =>
      Boolean(row.fixationCodes?.trim() || row.fixationCustom?.trim() || row.fixation?.trim()) ||
      Boolean(row.controlsCodes?.trim() || row.controlsCustom?.trim() || row.controls?.trim())
  );
}

export function groupHasLegacyOpeningValues(
  measurements: MeasurementRow[],
  usesOpeningFields: boolean,
  dimensionMode: string
): boolean {
  if (usesOpeningFields) return false;
  if (dimensionMode === "skylight") return false;
  return measurements.some((row) => row.openingWidth?.trim() || row.openingHeight?.trim());
}