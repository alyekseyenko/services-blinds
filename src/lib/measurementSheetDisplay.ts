import type { MeasurementSheetGroup } from "@/lib/schemas/measurementSheet";
import { measurementSheetRowHasOpeningDims } from "@/lib/measurements/exteriorInstall";

export type MeasurementGroupDetailEntry = {
  label: string;
  value: string;
};

export function groupShowsOpeningDimensions(group: MeasurementSheetGroup): boolean {
  return group.rows.some(measurementSheetRowHasOpeningDims);
}

export function groupShowsLineNotesColumn(group: MeasurementSheetGroup): boolean {
  return group.rows.some((r) => Boolean(r.notes?.trim()));
}

/** L×A em mm para tabela da ficha (estore ou vão). */
export function formatMeasurementPriceDisplay(price?: string): string {
  const trimmed = price?.trim();
  if (!trimmed) return "";
  if (trimmed.includes("€")) return trimmed;
  return `${trimmed} €`;
}

export function formatMeasurementLxAMm(
  widthMm?: number,
  heightMm?: number
): string {
  const w = widthMm ?? 0;
  const h = heightMm ?? 0;
  if (w > 0 && h > 0) return `${w}×${h}`;
  if (w > 0 || h > 0) return `${w > 0 ? w : "—"}×${h > 0 ? h : "—"}`;
  return "—";
}

/** Linhas «Material e detalhes» para UI e exportação (pt-PT). */
export function getMeasurementGroupDetailEntries(
  group: MeasurementSheetGroup
): MeasurementGroupDetailEntry[] {
  const entries: MeasurementGroupDetailEntry[] = [];
  const isExterior = group.productType === "ESTORE_EXTERIOR";
  const isMosquito = group.productType === "MOSQUITEIRO";

  if (group.exteriorInstallLabel?.trim()) {
    entries.push({
      label: "Montagem",
      value: group.exteriorInstallLabel.trim(),
    });
  }
  if (group.partialPartsLabel?.trim()) {
    entries.push({
      label: "Material (peças)",
      value: group.partialPartsLabel.trim(),
    });
  }
  if (group.materialLabel?.trim()) {
    entries.push({
      label: isExterior ? "Material" : "Modelo",
      value: group.materialLabel.trim(),
    });
  }
  if (group.colorLabel?.trim()) {
    entries.push({ label: "RAL / Cor", value: group.colorLabel.trim() });
  }
  if (group.fabricLabel?.trim()) {
    entries.push({
      label: isMosquito ? "Rede" : "Tecido",
      value: group.fabricLabel.trim(),
    });
  }
  if (group.referenceLabel?.trim()) {
    entries.push({ label: "Referência", value: group.referenceLabel.trim() });
  }
  if (group.activationLabel?.trim()) {
    entries.push({ label: "Acionamento", value: group.activationLabel.trim() });
  }
  if (group.specDetailEntries?.length) {
    for (const extra of group.specDetailEntries) {
      if (extra.label?.trim() && extra.value?.trim()) {
        entries.push({ label: extra.label.trim(), value: extra.value.trim() });
      }
    }
  }
  if (group.observations?.trim()) {
    entries.push({ label: "Observações", value: group.observations.trim() });
  }

  return entries;
}

export const MEASUREMENT_GROUP_OBSERVATIONS_LABEL = "Observações";

/** Separa observações (texto longo) do resto para grelha de exportação. */
export function partitionMeasurementGroupDetailEntries(
  entries: MeasurementGroupDetailEntry[]
): {
  gridEntries: MeasurementGroupDetailEntry[];
  observations?: MeasurementGroupDetailEntry;
} {
  const gridEntries: MeasurementGroupDetailEntry[] = [];
  let observations: MeasurementGroupDetailEntry | undefined;
  for (const entry of entries) {
    if (entry.label === MEASUREMENT_GROUP_OBSERVATIONS_LABEL) {
      observations = entry;
    } else {
      gridEntries.push(entry);
    }
  }
  return { gridEntries, observations };
}

/** Linhas de N colunas para PDF/Excel (ex.: 2 colunas em A4 horizontal). */
export function chunkMeasurementGroupDetailEntries(
  entries: MeasurementGroupDetailEntry[],
  columns: number
): MeasurementGroupDetailEntry[][] {
  if (columns < 1) return entries.length ? [entries] : [];
  const rows: MeasurementGroupDetailEntry[][] = [];
  for (let i = 0; i < entries.length; i += columns) {
    rows.push(entries.slice(i, i + columns));
  }
  return rows;
}
