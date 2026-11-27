import { formatMeasurementVersionStamp } from "@/lib/measurements/versionStamp";

export type MeasurementPrintFilter = "todas" | "por-imprimir" | "impressas";

export function isMeasurementSheetPrinted(printedAtIso?: string | null): boolean {
  return Boolean(printedAtIso?.trim());
}

export function formatMeasurementPrintLabel(
  printedAtIso?: string | null,
  printedByName?: string | null
): string {
  if (!isMeasurementSheetPrinted(printedAtIso)) {
    return "Por imprimir";
  }
  const when = formatMeasurementVersionStamp(printedAtIso);
  const who = printedByName?.trim();
  if (when && who) return `Impressa · ${when} · ${who}`;
  if (when) return `Impressa · ${when}`;
  if (who) return `Impressa · ${who}`;
  return "Impressa";
}

export function filterSheetsByPrintState<T extends { printedAt?: string | null }>(
  items: T[],
  filter: MeasurementPrintFilter
): T[] {
  if (filter === "por-imprimir") {
    return items.filter((item) => !isMeasurementSheetPrinted(item.printedAt));
  }
  if (filter === "impressas") {
    return items.filter((item) => isMeasurementSheetPrinted(item.printedAt));
  }
  return items;
}
