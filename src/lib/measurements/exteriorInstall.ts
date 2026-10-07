import {
  joinCsvCodes,
  parseCsvCodes,
} from "@/lib/measurements/extendedFields";

export const EXTERIOR_INSTALL_TYPE_VALUES = ["COMPLETO", "PARCIAL"] as const;
export type ExteriorInstallType = (typeof EXTERIOR_INSTALL_TYPE_VALUES)[number];

export const EXTERIOR_INSTALL_TYPE_OPTIONS = [
  { value: "COMPLETO", label: "Completo" },
  { value: "PARCIAL", label: "Parcial" },
] as const;

export const EXTERIOR_PARTIAL_PART_VALUES = [
  "ESTEIRAS",
  "CALHAS",
  "OUTROS",
] as const;

const PART_LABELS: Record<string, string> = {
  ESTEIRAS: "Esteiras",
  /** Legado */
  PARTES_EXTERIORES: "Esteiras",
  CALHAS: "Calhas",
  OUTROS: "Outros",
};

const INSTALL_LABELS: Record<string, string> = {
  COMPLETO: "Completo",
  PARCIAL: "Parcial",
};

export function getExteriorInstallTypeLabel(code?: string): string {
  if (!code?.trim()) return "";
  return INSTALL_LABELS[code] || code;
}

export function isExteriorParcialInstall(installType?: string): boolean {
  return installType === "PARCIAL";
}

/** Legado / export: tudo o que não é parcial conta como completo. */
export function isExteriorCompletoForExport(installType?: string): boolean {
  return !isExteriorParcialInstall(installType);
}

export function formatExteriorPartialPartsDisplay(
  codes?: string,
  custom?: string
): string {
  const parts = parseCsvCodes(codes).map((c) => {
    if (c === "OUTROS") {
      return custom?.trim() ? `Outros: ${custom.trim()}` : PART_LABELS.OUTROS;
    }
    return PART_LABELS[c] || c;
  });
  return parts.join(" · ");
}

function parsePositiveMm(value?: string | number): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseOpeningWidthHeightMm(
  openingWidth?: string | number,
  openingHeight?: string | number
): { widthMm: number; heightMm: number } {
  const w = parsePositiveMm(openingWidth);
  const h = parsePositiveMm(openingHeight);
  return {
    widthMm: w ?? 0,
    heightMm: h ?? 0,
  };
}

export function measurementSheetRowHasOpeningDims(row: {
  openingWidthMm?: number;
  openingHeightMm?: number;
  openingDimensionLabel?: string;
}): boolean {
  return (
    Boolean(row.openingDimensionLabel?.trim()) ||
    (row.openingWidthMm ?? 0) > 0 ||
    (row.openingHeightMm ?? 0) > 0
  );
}

/**
 * Resumo total vão + estore (soma L e A em mm).
 * Ex.: vão 1250×1550 + estore 1200×1500 → 2450×3050 mm
 */
export function formatExteriorOpeningAndStoreDisplay(
  openingWidth?: string | number,
  openingHeight?: string | number,
  storeWidth?: string | number,
  storeHeight?: string | number
): string {
  const ow = parsePositiveMm(openingWidth);
  const oh = parsePositiveMm(openingHeight);
  const sw = parsePositiveMm(storeWidth);
  const sh = parsePositiveMm(storeHeight);
  if (ow == null || oh == null) return "";
  if (sw == null || sh == null) {
    return `${ow}×${oh} mm (vão)`;
  }
  return `${ow + sw}×${oh + sh} mm`;
}

export { joinCsvCodes, parseCsvCodes };
