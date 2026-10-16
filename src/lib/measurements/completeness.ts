import type { MeasurementRow, ProductGroup, ProductGroupDetails, ProductType } from "@/types";
import {
  isExteriorParcialInstall,
  partialPartsIncludeEsteiras,
} from "@/lib/measurements/exteriorInstall";
import {
  lineDimensionMode,
  type LineDimensionMode,
} from "@/lib/measurements/lineModes";
import { productTypeUsesActivation } from "@/lib/measurements/productDetails";

function parsePositiveInt(value: string | number | undefined): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Linha pronta: qty e as medidas que o modo pede (estore, vão ou skylight). */
export function isMeasurementRowComplete(
  row: MeasurementRow,
  mode: LineDimensionMode = "store"
): boolean {
  if (parsePositiveInt(row.qty) === null) return false;
  if (mode === "opening") {
    const opening =
      parsePositiveInt(row.openingWidth) !== null &&
      parsePositiveInt(row.openingHeight) !== null;
    const store =
      parsePositiveInt(row.width) !== null && parsePositiveInt(row.height) !== null;
    return opening || store;
  }
  if (mode === "skylight") {
    return (
      parsePositiveInt(row.width) !== null &&
      parsePositiveInt(row.height) !== null &&
      parsePositiveInt(row.skylightExteriorWidth) !== null &&
      parsePositiveInt(row.skylightExteriorHeight) !== null &&
      parsePositiveInt(row.depth) !== null
    );
  }
  return parsePositiveInt(row.width) !== null && parsePositiveInt(row.height) !== null;
}

export function countIncompleteMeasurementRows(
  rows: MeasurementRow[],
  mode: LineDimensionMode = "store"
): number {
  return rows.filter((row) => !isMeasurementRowComplete(row, mode)).length;
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
  if (groupMissingEsteiraTarget(group.type, group.details)) return true;
  return false;
}

function groupMissingEsteiraTarget(
  type: ProductType,
  details: ProductGroupDetails
): boolean {
  if (type !== "ESTORE_EXTERIOR") return false;
  if (!isExteriorParcialInstall(details.exteriorInstallType)) return false;
  if (!partialPartsIncludeEsteiras(details.partialPartCodes)) return false;
  return details.esteiraMeasureTarget !== "VAO" && details.esteiraMeasureTarget !== "ESTEIRA";
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
    incompleteRows += countIncompleteMeasurementRows(
      group.measurements,
      lineDimensionMode(group.type, group.details)
    );
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
  if (groupMissingEsteiraTarget(group.type, group.details)) {
    hints.push("Falta vão ou esteira");
  }
  if (groupMissingActivation(group.type, group.details)) {
    hints.push("Falta acionamento");
  }
  const incomplete = countIncompleteMeasurementRows(
    group.measurements,
    lineDimensionMode(group.type, group.details)
  );
  if (incomplete > 0) {
    hints.push(
      incomplete === 1 ? "1 linha incompleta" : `${incomplete} linhas incompletas`
    );
  }
  return hints;
}
