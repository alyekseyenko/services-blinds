import type { MeasurementRow } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatControlsDisplay,
  formatFixationDisplay,
  formatStoreChannelDisplay,
} from "@/lib/measurements/extendedFields";
import type { LineDimensionMode } from "@/lib/measurements/lineModes";

export function isMeasurementLineCollapsed(row: MeasurementRow): boolean {
  const v = row.lineCollapsed?.trim().toLowerCase();
  return v === "true" || v === "1";
}

function pairLabel(height: string, width: string): string {
  if (height && width) return `${height} × ${width} mm`;
  if (height || width) return `${height || "?"} × ${width || "?"} mm`;
  return "";
}

/** Dimensões com altura primeiro, para o cabeçalho recolhido (pt-PT). */
export function formatMeasurementRowDimensionLabel(
  row: MeasurementRow,
  mode: LineDimensionMode = "store"
): string {
  if (mode === "opening") {
    const opening = pairLabel(
      String(row.openingHeight ?? "").trim(),
      String(row.openingWidth ?? "").trim()
    );
    if (opening) return opening;
  }
  if (mode === "skylight") {
    const interior = pairLabel(String(row.height ?? "").trim(), String(row.width ?? "").trim());
    const exterior = pairLabel(
      String(row.skylightExteriorHeight ?? "").trim(),
      String(row.skylightExteriorWidth ?? "").trim()
    );
    const depth = String(row.depth ?? "").trim();
    const parts = [
      interior ? `Int. ${interior.replace(/ mm$/, "")}` : "",
      exterior ? `Ext. ${exterior.replace(/ mm$/, "")}` : "",
      depth ? `Prof. ${depth}` : "",
    ].filter(Boolean);
    if (parts.length > 0) return `${parts.join(" · ")} mm`;
  }
  const store = pairLabel(String(row.height ?? "").trim(), String(row.width ?? "").trim());
  return store || "Sem medidas";
}

/** Divisão, quantidade e extras (sem dimensões). */
export function formatMeasurementRowCollapsedMeta(row: MeasurementRow): string {
  const division =
    getDivisionLabel(row.divisionCode, row.divisionCustom) || row.notes?.trim() || "Sem divisão";
  const qty = row.qty != null && String(row.qty).trim() !== "" ? `${row.qty} un` : "";
  const fix = formatFixationDisplay(row.fixationCodes, row.fixationCustom);
  const cmd = formatControlsDisplay(row.controlsCodes, row.controlsCustom);
  const channel = formatStoreChannelDisplay(row.storeChannel, row.storeChannelOther);
  const extras = [channel ? `Canal ${channel}` : "", fix, cmd].filter(Boolean).join(" · ");
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
