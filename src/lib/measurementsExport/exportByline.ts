/** Linha sob «Ficha Técnica de Medição» — sem siglas (ATS/BTS) no cabeçalho. */
export function measurementExportByline(technicianName?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_MEASUREMENT_SHEET_EXPORT_BYLINE?.trim();
  if (fromEnv) return fromEnv;
  return technicianName?.trim() ?? "";
}
