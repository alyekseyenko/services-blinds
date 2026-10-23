import type { ProductType } from "@/types";

export type DivisionScope = "interior" | "exterior";

export type MeasurementDivisionOption = {
  value: string;
  label: string;
  scopes: DivisionScope[];
};

/** Divisões / áreas para medições (interiores + exteriores onde há produto). */
export const MEASUREMENT_DIVISION_OPTIONS: MeasurementDivisionOption[] = [
  { value: "SALA_ESTAR", label: "Sala de estar", scopes: ["interior"] },
  { value: "SALA_JANTAR", label: "Sala de jantar", scopes: ["interior"] },
  { value: "COZINHA", label: "Cozinha", scopes: ["interior"] },
  { value: "QUARTO_PRINCIPAL", label: "Quarto principal", scopes: ["interior"] },
  { value: "QUARTO", label: "Quarto", scopes: ["interior"] },
  { value: "QUARTO_HOSPEDES", label: "Quarto de hóspedes", scopes: ["interior"] },
  { value: "ESCRITORIO", label: "Escritório", scopes: ["interior"] },
  { value: "CORREDOR", label: "Corredor", scopes: ["interior"] },
  { value: "HALL", label: "Hall", scopes: ["interior"] },
  { value: "WC", label: "WC", scopes: ["interior"] },
  { value: "CASA_BANHO", label: "Casa de banho", scopes: ["interior"] },
  { value: "LAVANDARIA", label: "Lavandaria", scopes: ["interior"] },
  { value: "DESPENSA", label: "Despensa", scopes: ["interior"] },
  { value: "CLOSET", label: "Closet", scopes: ["interior"] },
  { value: "SOTAO", label: "Sótão", scopes: ["interior"] },
  { value: "CAVE", label: "Cave", scopes: ["interior"] },
  { value: "GARAGEM", label: "Garagem", scopes: ["interior", "exterior"] },
  { value: "VARANDA", label: "Varanda", scopes: ["interior", "exterior"] },
  { value: "TERRACO", label: "Terraço", scopes: ["exterior"] },
  { value: "PATIO", label: "Pátio", scopes: ["exterior"] },
  { value: "JARDIM", label: "Jardim", scopes: ["exterior"] },
  { value: "PISCINA", label: "Zona piscina", scopes: ["exterior"] },
  { value: "FACHADA", label: "Fachada", scopes: ["exterior"] },
  { value: "MARQUISE", label: "Marquise", scopes: ["exterior"] },
  { value: "ALPENDRE", label: "Alpendre", scopes: ["exterior"] },
  { value: "OUTROS", label: "Outros (personalizar)", scopes: ["interior", "exterior"] },
];

/** Atalhos de 1 toque no tirar medidas (filtrados por tipo de produto). */
export const MEASUREMENT_DIVISION_QUICK_PICKS: {
  code: string;
  shortLabel: string;
}[] = [
  { code: "SALA_ESTAR", shortLabel: "Sala" },
  { code: "QUARTO", shortLabel: "Quarto" },
  { code: "COZINHA", shortLabel: "Cozinha" },
  { code: "CASA_BANHO", shortLabel: "Casa de banho" },
  { code: "MARQUISE", shortLabel: "Marquise" },
];

export function divisionsForProductType(type: ProductType): MeasurementDivisionOption[] {
  const scopes: DivisionScope[] =
    type === "ESTORE_EXTERIOR" || type === "TOLDO"
      ? ["interior", "exterior"]
      : ["interior"];
  return MEASUREMENT_DIVISION_OPTIONS.filter((d) =>
    d.scopes.some((s) => scopes.includes(s))
  );
}

const EXTERIOR_EXTRA_QUICK_PICKS: { code: string; shortLabel: string }[] = [
  { code: "VARANDA", shortLabel: "Varanda" },
  { code: "TERRACO", shortLabel: "Terraço" },
];

/** Atalhos de divisão no tirar medidas, adaptados ao tipo de produto. */
export function getQuickPickDivisionsForProductType(
  type: ProductType
): { code: string; shortLabel: string }[] {
  const allowed = new Set(divisionsForProductType(type).map((o) => o.value));
  const base = MEASUREMENT_DIVISION_QUICK_PICKS.filter((q) => allowed.has(q.code));
  if (type === "ESTORE_EXTERIOR" || type === "TOLDO") {
    const extra = EXTERIOR_EXTRA_QUICK_PICKS.filter((q) => allowed.has(q.code));
    const seen = new Set(base.map((b) => b.code));
    for (const q of extra) {
      if (!seen.has(q.code)) base.push(q);
    }
  }
  return base;
}

export function getDivisionLabel(code?: string, custom?: string): string {
  if (!code?.trim()) return custom?.trim() || "";
  if (code === "OUTROS") return custom?.trim() || "Outros";
  const hit = MEASUREMENT_DIVISION_OPTIONS.find((d) => d.value === code);
  return hit?.label || code;
}

export function filterDivisionsByQuery(
  options: MeasurementDivisionOption[],
  query: string
): MeasurementDivisionOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)
  );
}
