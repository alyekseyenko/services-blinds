import type { ProductGroup } from "@/types";

export type MeasurementsFormFocusedStatus = {
  progressSummary: string;
  draftLabel: string | null;
  draftTone: "success" | "warning" | null;
};

export type MeasurementsFormProgress = {
  productCount: number;
  windowCount: number;
  incompleteRows: number;
};

export function formatMeasurementsProgressSummary(progress: MeasurementsFormProgress): string {
  const { productCount, windowCount, incompleteRows } = progress;
  const products = productCount === 1 ? "1 produto" : `${productCount} produtos`;
  const windows = windowCount === 1 ? "1 janela" : `${windowCount} janelas`;
  const incomplete =
    incompleteRows === 0
      ? null
      : incompleteRows === 1
        ? "1 incompleta"
        : `${incompleteRows} incompletas`;
  return [products, windows, incomplete].filter(Boolean).join(" · ");
}

export function buildMeasurementsFocusedStatus(input: {
  progressSummary: string;
  lastLocalSave: string | null;
  hasDraft: boolean;
}): MeasurementsFormFocusedStatus {
  const { progressSummary, lastLocalSave, hasDraft } = input;
  let draftLabel: string | null = null;
  let draftTone: "success" | "warning" | null = null;
  if (lastLocalSave) {
    draftLabel = `Rascunho · ${lastLocalSave}`;
    draftTone = "success";
  } else if (hasDraft) {
    draftLabel = "Rascunho ativo";
    draftTone = "warning";
  }
  return { progressSummary, draftLabel, draftTone };
}

export function getFormRemeasureState(
  productGroups: ProductGroup[],
  locked: boolean
): {
  needed: string;
  note: string;
  locked: boolean;
} {
  const answer = productGroups.find((g) => g.details.remeasureNeeded)?.details;
  return {
    needed: answer?.remeasureNeeded ?? "",
    note: answer?.remeasureNote ?? "",
    locked,
  };
}