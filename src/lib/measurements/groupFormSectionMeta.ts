import type { ProductGroup } from "@/types";
import {
  getActivationLabel,
  getMaterialLabel,
  PRODUCT_TYPE_OPTIONS,
} from "@/lib/measurements/labels";
import {
  groupHasSpecCompletenessWarnings,
  isMeasurementRowComplete,
  summarizeMeasurementGroupCompleteness,
} from "@/lib/measurements/completeness";
import {
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
} from "@/lib/measurements/exteriorInstall";
import { lineDimensionMode } from "@/lib/measurements/lineModes";

export type SectionStatusTone = "success" | "warning" | "neutral";

export type SectionStatusBadge = {
  label: string;
  tone: SectionStatusTone;
};

function productTypeLabel(type: string): string {
  return PRODUCT_TYPE_OPTIONS.find((o) => o.id === type)?.label ?? type;
}

/** Secção 1 aberta por defeito no telemóvel enquanto o técnico não passou às medidas. */
export function measurementProductSectionShouldDefaultOpen(group: ProductGroup): boolean {
  if (group.details.customName?.trim()) return false;
  const mode = lineDimensionMode(group.type, group.details);
  const hasStartedWindows = group.measurements.some(
    (row) =>
      Boolean(row.width?.trim()) ||
      Boolean(row.height?.trim()) ||
      Boolean(row.openingWidth?.trim()) ||
      Boolean(row.openingHeight?.trim()) ||
      isMeasurementRowComplete(row, mode)
  );
  return !hasStartedWindows;
}

/** Resumo curto para o cabeçalho da secção 1. */
export function measurementProductSectionSummary(group: ProductGroup): string {
  const typeLabel = productTypeLabel(group.type);
  const name = group.details.customName?.trim();
  return name ? `${name} · ${typeLabel}` : typeLabel;
}

/** Resumo das escolhas de material/spec para a secção 2. */
export function measurementMaterialSectionSummary(group: ProductGroup): string {
  const d = group.details;
  const parts: string[] = [];

  if (group.type === "ESTORE_EXTERIOR") {
    const install = getExteriorInstallTypeLabel(d.exteriorInstallType) || "Completo";
    parts.push(install);
    if (isExteriorParcialInstall(d.exteriorInstallType)) {
      const pieces = formatExteriorPartialPartsDisplay(d.partialPartCodes, d.partialPartCustom);
      if (pieces) parts.push(pieces);
    } else {
      const mat = getMaterialLabel(d.material, d.otherMaterial);
      if (mat) parts.push(mat);
    }
  } else if (group.type === "ESTORE_INTERIOR" || group.type === "TOLDO") {
    if (d.model?.trim()) parts.push(d.model);
    if (d.fabric?.trim()) parts.push(d.fabric);
  }

  if (d.ral?.trim()) parts.push(`RAL ${d.ral.trim()}`);
  const activation = getActivationLabel(d.activation, d.otherActivation);
  if (activation) parts.push(activation);

  return parts.length > 0 ? parts.join(" · ") : "Montagem, cores e acionamento";
}

/** Estado da secção 2 (sem contar linhas de janela). */
export function measurementMaterialSectionStatus(group: ProductGroup): SectionStatusBadge {
  const lineHints = ["linha", "janela"];
  const hints = summarizeMeasurementGroupCompleteness(group).filter(
    (h) => !lineHints.some((needle) => h.toLowerCase().includes(needle))
  );
  if (!groupHasSpecCompletenessWarnings(group) && hints.length === 0) {
    return { label: "Pronto", tone: "success" };
  }
  if (hints.length > 0) {
    return { label: hints[0], tone: "warning" };
  }
  return { label: "Em falta", tone: "warning" };
}

/** Progresso das janelas para a secção 3. */
export function measurementWindowsSectionMeta(group: ProductGroup): {
  summary: string;
  statusBadge: SectionStatusBadge;
} {
  const mode = lineDimensionMode(group.type, group.details);
  const total = group.measurements.length;
  const ready = group.measurements.filter((row) => isMeasurementRowComplete(row, mode)).length;
  const summary =
    total === 0
      ? "Nenhuma janela"
      : ready === total
        ? `${ready}/${total} prontas`
        : `${ready}/${total} prontas`;
  let statusBadge: SectionStatusBadge;
  if (total === 0) {
    statusBadge = { label: "Adicionar janela", tone: "warning" };
  } else if (ready === total) {
    statusBadge = { label: "Todas prontas", tone: "success" };
  } else {
    statusBadge = {
      label: total - ready === 1 ? "1 em falta" : `${total - ready} em falta`,
      tone: "warning",
    };
  }
  return { summary, statusBadge };
}

export type MeasurementFormSectionStep = 1 | 2 | 3;

/** Abre um tópico e fecha os outros (acordeão). Fechar o activo deixa todos fechados. */
export function nextExclusiveSection(
  current: MeasurementFormSectionStep | null,
  step: MeasurementFormSectionStep,
  open: boolean
): MeasurementFormSectionStep | null {
  if (open) return step;
  return current === step ? null : current;
}
