import type { MeasurementRow, ProductGroup, ProductGroupDetails, ProductType } from "@/types";
import { isExteriorParcialInstall } from "@/lib/measurements/exteriorInstall";
import { productTypeUsesActivation } from "@/lib/measurementProductDetails";

function parsePositiveInt(value: string | number | undefined): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Linha pronta para sync (qty, largura e altura positivas). */
export function isMeasurementRowComplete(row: MeasurementRow): boolean {
  return (
    parsePositiveInt(row.qty) !== null &&
    parsePositiveInt(row.width) !== null &&
    parsePositiveInt(row.height) !== null
  );
}

export function countIncompleteMeasurementRows(rows: MeasurementRow[]): number {
  return rows.filter((row) => !isMeasurementRowComplete(row)).length;
}

export function groupMissingActivation(
  type: ProductType,
  details: ProductGroupDetails
): boolean {
  if (!productTypeUsesActivation(type)) return false;
  return !details.activation?.trim();
}

/** Avisos curtos para o cabeçalho do cartão (só orientação — não bloqueia guardar). */
export function groupMissingExteriorInstallType(
  type: ProductType,
  details: ProductGroupDetails
): boolean {
  if (type !== "ESTORE_EXTERIOR") return false;
  return !details.exteriorInstallType?.trim();
}

/** Avisos só de material/specs (não inclui linhas incompletas). */
export function groupHasSpecCompletenessWarnings(group: ProductGroup): boolean {
  if (groupMissingExteriorInstallType(group.type, group.details)) return true;
  if (
    group.type === "ESTORE_EXTERIOR" &&
    isExteriorParcialInstall(group.details.exteriorInstallType) &&
    !group.details.partialPartCodes?.trim()
  ) {
    return true;
  }
  if (groupMissingActivation(group.type, group.details)) return true;
  return false;
}

export function summarizeMeasurementsFormProgress(groups: ProductGroup[]): {
  productCount: number;
  windowCount: number;
  incompleteRows: number;
} {
  let windowCount = 0;
  let incompleteRows = 0;
  for (const group of groups) {
    windowCount += group.measurements.length;
    incompleteRows += countIncompleteMeasurementRows(group.measurements);
  }
  return {
    productCount: groups.length,
    windowCount,
    incompleteRows,
  };
}

export function summarizeMeasurementGroupCompleteness(group: ProductGroup): string[] {
  const hints: string[] = [];
  if (groupMissingExteriorInstallType(group.type, group.details)) {
    hints.push("Falta completo/parcial");
  }
  if (
    group.type === "ESTORE_EXTERIOR" &&
    isExteriorParcialInstall(group.details.exteriorInstallType) &&
    !group.details.partialPartCodes?.trim()
  ) {
    hints.push("Falta material (peças)");
  }
  if (groupMissingActivation(group.type, group.details)) {
    hints.push("Falta acionamento");
  }
  const incomplete = countIncompleteMeasurementRows(group.measurements);
  if (incomplete > 0) {
    hints.push(
      incomplete === 1 ? "1 linha incompleta" : `${incomplete} linhas incompletas`
    );
  }
  return hints;
}
