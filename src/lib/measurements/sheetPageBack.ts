export type MeasurementSheetBackContext = "lista" | "oportunidade" | "painel";

export function parseMeasurementSheetBackContext(
  value: string | null | undefined
): MeasurementSheetBackContext {
  if (value === "oportunidade" || value === "painel" || value === "lista") {
    return value;
  }
  return "lista";
}

export function measurementSheetBackLabel(context: MeasurementSheetBackContext): string {
  switch (context) {
    case "oportunidade":
      return "Voltar à oportunidade";
    case "painel":
      return "Voltar ao painel";
    default:
      return "Voltar à lista de medições";
  }
}

export function measurementSheetBackHref(context: MeasurementSheetBackContext): string | null {
  switch (context) {
    case "oportunidade":
      return null;
    case "painel":
      return "/admin?view=home";
    default:
      return "/admin/medicoes";
  }
}

export function appendMeasurementSheetDeParam(
  sheetPath: string,
  context: MeasurementSheetBackContext
): string {
  const sep = sheetPath.includes("?") ? "&" : "?";
  return `${sheetPath}${sep}de=${context}`;
}
