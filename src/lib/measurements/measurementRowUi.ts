import type { MeasurementRow } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatControlsDisplay,
  formatFixationDisplay,
} from "@/lib/measurements/extendedFields";

export function isMeasurementLineCollapsed(row: MeasurementRow): boolean {
  const v = row.lineCollapsed?.trim().toLowerCase();
  return v === "true" || v === "1";
}

/** Dimensões L×A para destaque no cabeçalho recolhido (pt-PT). */
export function formatMeasurementRowDimensionLabel(row: MeasurementRow): string {
  const w = String(row.width ?? "").trim();
  const h = String(row.height ?? "").trim();
  if (w && h) return `${w} × ${h} mm`;
  if (w || h) return `${w || "?"} × ${h || "?"} mm`;
  return "Sem medidas";
}

/** Divisão, quantidade e extras (sem dimensões). */
export function formatMeasurementRowCollapsedMeta(row: MeasurementRow): string {
  const division =
    getDivisionLabel(row.divisionCode, row.divisionCustom) || row.notes?.trim() || "Sem divisão";
  const qty = row.qty != null && String(row.qty).trim() !== "" ? `${row.qty} un` : "";
  const fix = formatFixationDisplay(row.fixationCodes, row.fixationCustom);
  const cmd = formatControlsDisplay(row.controlsCodes, row.controlsCustom);
  const extras = [fix, cmd].filter(Boolean).join(" · ");
  return [division, qty, extras].filter(Boolean).join(" · ");
}

/** Resumo curto no cabeçalho recolhido (pt-PT) — dimensões primeiro. */
export function formatMeasurementRowCollapsedSummary(row: MeasurementRow): string {
  const dims = formatMeasurementRowDimensionLabel(row);
  const meta = formatMeasurementRowCollapsedMeta(row);
  if (dims === "Sem medidas") return meta || dims;
  if (!meta) return dims;
  return `${dims} · ${meta}`;
}
