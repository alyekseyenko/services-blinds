import type { MeasurementRow } from "@/types";
import type { LineDimensionMode } from "@/lib/measurements/lineModes";
const LOW_MM_MAX = 249;
const HIGH_MM_MIN = 5001;
const SKYLIGHT_DEPTH_HIGH_MM = 1001;

function parseMm(value: string | undefined): number | null {
  const digits = String(value ?? "").trim();
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lowMmWarning(label: string): string {
  return `${label} abaixo de 250 mm — confirme se está em milímetros (ex.: 1200 em vez de 120).`;
}

function highMmWarning(label: string): string {
  return `${label} acima de 5000 mm — confirme se não tem um dígito a mais.`;
}

function checkDimension(value: string | undefined, label: string, warnings: string[]): void {
  const n = parseMm(value);
  if (n === null) return;
  if (n <= LOW_MM_MAX) warnings.push(lowMmWarning(label));
  else if (n >= HIGH_MM_MIN) warnings.push(highMmWarning(label));
}

/** Avisos não bloqueantes para medidas suspeitas em mm (pt-PT). */
export function getDimensionSanityWarnings(
  row: MeasurementRow,
  mode: LineDimensionMode = "store"
): string[] {
  const warnings: string[] = [];

  if (mode === "opening") {
    checkDimension(row.openingHeight, "Altura do vão", warnings);
    checkDimension(row.openingWidth, "Largura do vão", warnings);
    if (!row.openingHeight?.trim() && !row.openingWidth?.trim()) {
      checkDimension(row.height, "Altura", warnings);
      checkDimension(row.width, "Largura", warnings);
    }
    return warnings;
  }

  if (mode === "skylight") {
    checkDimension(row.height, "Altura interior", warnings);
    checkDimension(row.width, "Largura interior", warnings);
    checkDimension(row.skylightExteriorHeight, "Altura exterior", warnings);
    checkDimension(row.skylightExteriorWidth, "Largura exterior", warnings);
    const depth = parseMm(row.depth);
    if (depth !== null && depth >= SKYLIGHT_DEPTH_HIGH_MM) {
      warnings.push("Profundidade acima de 1000 mm — confirme o valor em mm.");
    }
    return warnings;
  }

  if (mode === "esteira") {
    checkDimension(row.height, "Altura da esteira", warnings);
    checkDimension(row.width, "Largura da esteira", warnings);
    return warnings;
  }

  checkDimension(row.height, "Altura", warnings);
  checkDimension(row.width, "Largura", warnings);
  return warnings;
}
