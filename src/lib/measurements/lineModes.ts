import {
  isExteriorParcialInstall,
  partialPartsIncludeEsteiras,
} from "@/lib/measurements/exteriorInstall";

export type LineDimensionMode = "store" | "opening" | "skylight";

type ModeDetails = {
  model?: string;
  roloVariant?: string;
  exteriorInstallType?: string;
  partialPartCodes?: string;
  esteiraMeasureTarget?: string;
};

export function isSkylightSelection(type: string, details: ModeDetails): boolean {
  if (type !== "ESTORE_INTERIOR") return false;
  if (details.model === "SKYLIGHT") return true;
  return details.model === "ROLO" && details.roloVariant === "SKYLIGHT_ROLO";
}

export function isPortaAmerica(type: string, model?: string): boolean {
  return type === "MOSQUITEIRO" && model === "PORTA_AMERICA";
}

/** Que medidas a linha pede: estore, só vão, ou skylight (interior + exterior + profundidade). */
export function lineDimensionMode(type: string, details: ModeDetails): LineDimensionMode {
  if (isSkylightSelection(type, details)) return "skylight";
  if (type === "ESTORE_EXTERIOR" && details.exteriorInstallType === "COMPLETO") {
    return "opening";
  }
  if (
    type === "ESTORE_EXTERIOR" &&
    isExteriorParcialInstall(details.exteriorInstallType) &&
    partialPartsIncludeEsteiras(details.partialPartCodes) &&
    details.esteiraMeasureTarget === "VAO"
  ) {
    return "opening";
  }
  return "store";
}

function positiveMm(value?: string | number): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Largura/altura gravadas na coluna numérica.
 * Se o técnico só preencheu o vão, esse valor ocupa o lugar para o armazém e o CRM.
 */
export function storedWidthHeightMm(row: {
  width?: string | number;
  height?: string | number;
  openingWidth?: string | number;
  openingHeight?: string | number;
}): { width: number; height: number } {
  return {
    width: positiveMm(row.width) ?? positiveMm(row.openingWidth) ?? 0,
    height: positiveMm(row.height) ?? positiveMm(row.openingHeight) ?? 0,
  };
}
