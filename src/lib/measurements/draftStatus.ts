import type { ProductGroup } from "@/types";
import { summarizeMeasurementsFormProgress } from "@/lib/measurementCompleteness";

/** Rascunho local no telemóvel ainda não sincronizado com o servidor. */
export function hasUnsavedMeasurementsDraft(draftKey: string): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(`${draftKey}_saved`) === "true") return false;
  return Boolean(localStorage.getItem(draftKey));
}

/** Pode guardar automaticamente ao sair (pelo menos uma janela completa). */
export function canAutoSubmitMeasurementsDraft(
  groups: ProductGroup[],
  isDirty: boolean
): boolean {
  if (!isDirty) return false;
  const { windowCount, incompleteRows } = summarizeMeasurementsFormProgress(groups);
  if (windowCount === 0) return false;
  return windowCount > incompleteRows;
}
