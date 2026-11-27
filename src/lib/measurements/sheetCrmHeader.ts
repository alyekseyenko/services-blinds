import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

export function isBlankSheetHeader(value?: string | null): boolean {
  const trimmed = value?.trim() ?? "";
  return !trimmed || trimmed.toUpperCase() === "N/A";
}

export function sheetHeaderDisplay(value?: string | null, fallback = "—"): string {
  if (isBlankSheetHeader(value) || value == null) return fallback;
  return value.trim();
}

export function sheetNeedsCrmEnrichment(sheet: MeasurementSheet): boolean {
  if (!sheet.opportunityId) return false;
  return (
    isBlankSheetHeader(sheet.serviceNumber) ||
    isBlankSheetHeader(sheet.nsi) ||
    isBlankSheetHeader(sheet.clientNif) ||
    isBlankSheetHeader(sheet.clientPhone) ||
    isBlankSheetHeader(sheet.clientEmail)
  );
}

export type SheetCrmHeaderPatch = {
  serviceNumber?: string;
  nsi?: string;
  clientNif?: string;
  clientPhone?: string;
  clientEmail?: string;
};

function pickHeader(current: string | undefined, fromCrm?: string): string | undefined {
  if (!isBlankSheetHeader(current)) return current;
  if (!isBlankSheetHeader(fromCrm)) return fromCrm?.trim();
  return undefined;
}

export function applySheetCrmHeader(
  sheet: MeasurementSheet,
  ctx: SheetCrmHeaderPatch
): MeasurementSheet {
  return {
    ...sheet,
    serviceNumber: pickHeader(sheet.serviceNumber, ctx.serviceNumber),
    nsi: pickHeader(sheet.nsi, ctx.nsi),
    clientNif: pickHeader(sheet.clientNif, ctx.clientNif),
    clientPhone: pickHeader(sheet.clientPhone, ctx.clientPhone),
    clientEmail: pickHeader(sheet.clientEmail, ctx.clientEmail),
  };
}
