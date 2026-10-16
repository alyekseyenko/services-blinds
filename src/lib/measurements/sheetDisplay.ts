import type {
  MeasurementSheetGroup,
  MeasurementSheetRow,
} from "@/lib/schemas/measurementSheet";
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

export type MeasurementLineColumnKey =
  | "index"
  | "division"
  | "qty"
  | "channel"
  | "primaryHeight"
  | "primaryWidth"
  | "openingHeight"
  | "openingWidth"
  | "openingSummary"
  | "exteriorHeight"
  | "exteriorWidth"
  | "depth"
  | "fixation"
  | "controls"
  | "notes"
  | "price";

export type MeasurementLineColumn = {
  key: MeasurementLineColumnKey;
  header: string;
};

export type MeasurementLineColumnPlan = {
  columns: MeasurementLineColumn[];
  /** Vão é a medida principal (completo, ou esteiras com «preciso do vão»). */
  openingIsPrimary: boolean;
};

function mmText(value?: number): string {
  return value != null && value > 0 ? String(value) : "";
}

function rowHasDistinctStore(row: MeasurementSheetRow): boolean {
  const hasStore = row.widthMm > 0 || row.heightMm > 0;
  if (!hasStore) return false;
  return row.widthMm !== (row.openingWidthMm ?? 0) || row.heightMm !== (row.openingHeightMm ?? 0);
}

/** Colunas da ficha, Excel e PDF — altura antes da largura; só o que o produto pede. */
export function measurementLineColumnPlan(
  group: MeasurementSheetGroup
): MeasurementLineColumnPlan {
  const mode = group.dimensionMode ?? "store";
  const distinctStore = mode === "opening" && group.rows.some(rowHasDistinctStore);
  const openingIsPrimary = mode === "opening" && !distinctStore;
  const openingExtra =
    !openingIsPrimary &&
    mode !== "skylight" &&
    group.rows.some((r) => (r.openingWidthMm ?? 0) > 0 || (r.openingHeightMm ?? 0) > 0);
  const showSummary =
    (distinctStore || openingExtra) &&
    group.rows.some((r) => Boolean(r.openingDimensionLabel?.trim()));
  const showExterior =
    mode === "skylight" ||
    group.rows.some((r) => (r.exteriorWidthMm ?? 0) > 0 || (r.exteriorHeightMm ?? 0) > 0);
  const showDepth = mode === "skylight" || group.rows.some((r) => (r.depthMm ?? 0) > 0);
  const showChannel = group.rows.some((r) => Boolean(r.channelLabel?.trim()));
  const showFix =
    !group.suppressLineHardware || group.rows.some((r) => Boolean(r.fixation?.trim()));
  const showCmd =
    !group.suppressLineHardware || group.rows.some((r) => Boolean(r.controls?.trim()));
  const showNotes = group.rows.some((r) => Boolean(r.notes?.trim()));

  const columns: MeasurementLineColumn[] = [
    { key: "index", header: "Nº" },
    { key: "division", header: "Divisão" },
    { key: "qty", header: "Qtd" },
  ];
  if (showChannel) columns.push({ key: "channel", header: "Canal" });

  if (mode === "skylight") {
    columns.push(
      { key: "primaryHeight", header: "Altura interior (mm)" },
      { key: "primaryWidth", header: "Largura interior (mm)" }
    );
  } else if (openingIsPrimary) {
    columns.push(
      { key: "primaryHeight", header: "Altura vão (mm)" },
      { key: "primaryWidth", header: "Largura vão (mm)" }
    );
  } else if (mode === "opening") {
    columns.push(
      { key: "primaryHeight", header: "Altura estore (mm)" },
      { key: "primaryWidth", header: "Largura estore (mm)" }
    );
  } else {
    columns.push(
      { key: "primaryHeight", header: "Altura (mm)" },
      { key: "primaryWidth", header: "Largura (mm)" }
    );
  }

  if (distinctStore || openingExtra) {
    columns.push(
      { key: "openingHeight", header: "Altura vão (mm)" },
      { key: "openingWidth", header: "Largura vão (mm)" }
    );
  }
  if (showSummary) {
    columns.push({ key: "openingSummary", header: "Resumo vão + estore (mm)" });
  }
  if (showExterior) {
    columns.push(
      { key: "exteriorHeight", header: "Altura exterior (mm)" },
      { key: "exteriorWidth", header: "Largura exterior (mm)" }
    );
  }
  if (showDepth) columns.push({ key: "depth", header: "Profundidade (mm)" });
  if (showFix) columns.push({ key: "fixation", header: "Fixação" });
  if (showCmd) columns.push({ key: "controls", header: "Comandos" });
  if (showNotes) columns.push({ key: "notes", header: "Notas" });
  columns.push({ key: "price", header: "Preço (€)" });

  return { columns, openingIsPrimary };
}

export function measurementLineColumnValue(
  row: MeasurementSheetRow,
  key: MeasurementLineColumnKey,
  openingIsPrimary: boolean
): string {
  switch (key) {
    case "index":
      return String(row.index);
    case "division":
      return row.division || "";
    case "qty":
      return String(row.qty);
    case "channel":
      return row.channelLabel || "";
    case "primaryHeight":
      return openingIsPrimary
        ? mmText(row.openingHeightMm) || mmText(row.heightMm)
        : mmText(row.heightMm);
    case "primaryWidth":
      return openingIsPrimary
        ? mmText(row.openingWidthMm) || mmText(row.widthMm)
        : mmText(row.widthMm);
    case "openingHeight":
      return mmText(row.openingHeightMm);
    case "openingWidth":
      return mmText(row.openingWidthMm);
    case "openingSummary":
      return row.openingDimensionLabel || "";
    case "exteriorHeight":
      return mmText(row.exteriorHeightMm);
    case "exteriorWidth":
      return mmText(row.exteriorWidthMm);
    case "depth":
      return mmText(row.depthMm);
    case "fixation":
      return row.fixation || "";
    case "controls":
      return row.controls || "";
    case "notes":
      return row.notes || "";
    case "price":
      return formatMeasurementPriceDisplay(row.price);
    default:
      return "";
  }
}
