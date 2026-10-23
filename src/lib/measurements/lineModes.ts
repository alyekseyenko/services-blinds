export type LineDimensionMode = "store" | "opening" | "skylight" | "esteira";

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
  return "store";
}

/** Rótulos pt-PT das medidas principais (técnico, admin, Excel, PDF). */
export function lineDimensionHeightLabel(
  mode: LineDimensionMode,
  variant: "short" | "long" | "export" = "long"
): string {
  if (mode === "skylight") {
    return variant === "short"
      ? "Alt. int."
      : variant === "export"
        ? "Altura interior (mm)"
        : "Altura interior";
  }
  if (mode === "opening") {
    return variant === "short"
      ? "Alt. vão"
      : variant === "export"
        ? "Altura vão (mm)"
        : "Altura vão";
  }
  if (mode === "esteira") {
    return variant === "short"
      ? "Alt. esteira"
      : variant === "export"
        ? "Altura da esteira (mm)"
        : "Altura da esteira";
  }
  return variant === "short" ? "Alt (mm)" : variant === "export" ? "Altura (mm)" : "Altura";
}

export function lineDimensionWidthLabel(
  mode: LineDimensionMode,
  variant: "short" | "long" | "export" = "long"
): string {
  if (mode === "skylight") {
    return variant === "short"
      ? "Larg. int."
      : variant === "export"
        ? "Largura interior (mm)"
        : "Largura interior";
  }
  if (mode === "opening") {
    return variant === "short"
      ? "Larg. vão"
      : variant === "export"
        ? "Largura vão (mm)"
        : "Largura vão";
  }
  if (mode === "esteira") {
    return variant === "short"
      ? "Larg. esteira"
      : variant === "export"
        ? "Largura da esteira (mm)"
        : "Largura da esteira";
  }
  return variant === "short" ? "Larg (mm)" : variant === "export" ? "Largura (mm)" : "Largura";
}

export function lineDimensionUsesOpeningFields(mode: LineDimensionMode): boolean {
  return mode === "opening";
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
