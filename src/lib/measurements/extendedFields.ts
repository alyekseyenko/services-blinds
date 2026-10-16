import { z } from "zod";

/** Campos extra ao nível do produto (grupo) — persistidos em JSON + payload. */
export const MeasurementGroupExtrasSchema = z.object({
  compactPlacement: z.enum(["INTERIOR", "EXTERIOR"]).optional(),
  compactMaterialType: z
    .enum(["PVC", "ALUMINIO_TERMICO", "ALUMINIO_EXTRUDIDO"])
    .optional(),
  structureColor: z.string().optional(),
  otherModel: z.string().optional(),
  roloVariant: z.string().optional(),
  otherRoloVariant: z.string().optional(),
  otherActivation: z.string().optional(),
  manualType: z
    .enum(["MANIVELA", "FITA_ENROLADOR_EXTERIOR", "FITA_ENROLADOR_INTERIOR"])
    .optional(),
  rtsCommandMode: z.enum(["UM_CANAL", "VARIOS_CANAIS"]).optional(),
  rtsChannelCount: z.string().optional(),
  rtsMotorBrand: z.enum(["SOMFY", "GAVIOTA", "OUTRO"]).optional(),
  otherRtsMotorBrand: z.string().optional(),
  mosquitoOpening: z.string().optional(),
  exteriorInstallType: z.enum(["COMPLETO", "PARCIAL"]).optional(),
  partialPartCodes: z.string().optional(),
  partialPartCustom: z.string().optional(),
  /** Título livre no cartão: «Estore Exterior — …». */
  customName: z.string().optional(),
  /** Pergunta no início da ficha: SIM ou OUTROS. */
  remeasureNeeded: z.string().optional(),
  remeasureNote: z.string().optional(),
  /** Parcial + esteiras: VAO ou ESTEIRA. */
  esteiraMeasureTarget: z.string().optional(),
});

export type MeasurementGroupExtras = z.infer<typeof MeasurementGroupExtrasSchema>;

/** Campos extra por linha de medição. */
export const MeasurementLineExtrasSchema = z.object({
  divisionCode: z.string().optional(),
  divisionCustom: z.string().optional(),
  fixationCodes: z.string().optional(),
  fixationCustom: z.string().optional(),
  controlsCodes: z.string().optional(),
  controlsCustom: z.string().optional(),
  openingWidth: z.string().optional(),
  openingHeight: z.string().optional(),
  /** UI: cartão da linha recolhido no telemóvel ("true"). */
  lineCollapsed: z.string().optional(),
  /** Observações da linha (distinto da divisão). */
  lineNotes: z.string().optional(),
  /** Skylight: medida exterior (a interior fica em width/height). */
  skylightExteriorWidth: z.string().optional(),
  skylightExteriorHeight: z.string().optional(),
  /** Profundidade partilhada (skylight), mm. */
  depth: z.string().optional(),
  /** Canal do estore (Motor RTS), número. */
  storeChannel: z.string().optional(),
  /** Texto livre do canal quando escolhem Outros. */
  storeChannelOther: z.string().optional(),
});

export type MeasurementLineExtras = z.infer<typeof MeasurementLineExtrasSchema>;

export const FIXATION_OPTION_VALUES = ["PAREDE", "TETO", "OUTROS"] as const;
export const CONTROL_SIDE_VALUES = ["ESQUERDA", "DIREITA", "OUTROS"] as const;

const FIXATION_LABELS: Record<string, string> = {
  PAREDE: "Parede",
  TETO: "Teto",
  OUTROS: "Outros",
};

const CONTROL_LABELS: Record<string, string> = {
  ESQUERDA: "Esquerda",
  DIREITA: "Direita",
  OUTROS: "Outros",
};

export function parseCsvCodes(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCsvCodes(codes: string[]): string {
  return codes.filter(Boolean).join(",");
}

export function formatFixationDisplay(codes?: string, custom?: string): string {
  const parts = parseCsvCodes(codes).map((c) => {
    if (c === "OUTROS") return custom?.trim() ? `Outros: ${custom.trim()}` : "Outros";
    return FIXATION_LABELS[c] || c;
  });
  return parts.join(" · ");
}

export function formatControlsDisplay(codes?: string, custom?: string): string {
  const parts = parseCsvCodes(codes).map((c) => {
    if (c === "OUTROS") return custom?.trim() ? `Outros: ${custom.trim()}` : "Outros";
    return CONTROL_LABELS[c] || c;
  });
  return parts.join(" · ");
}

const MOSQUITO_OPENING_LEGACY: Record<string, string> = {
  ESQUERDA: "Esquerda",
  DIREITA: "Direita",
};

export const MOSQUITO_OPENING_OPTIONS = ["A", "B", "C", "D"] as const;

export function formatMosquitoOpeningDisplay(raw?: string): string {
  return parseCsvCodes(raw)
    .map((c) => MOSQUITO_OPENING_LEGACY[c] || c)
    .join(" · ");
}

export function formatStoreChannelDisplay(channel?: string, other?: string): string {
  const number = channel?.trim() ?? "";
  const note = other?.trim() ?? "";
  if (number && note) return `${number} · Outros: ${note}`;
  if (note) return `Outros: ${note}`;
  return number;
}

function omitBlankStrings(
  source: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!source) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      out[key] = trimmed;
      continue;
    }
    if (value != null) out[key] = value;
  }
  return out;
}

export function pickGroupExtras(
  source: Record<string, unknown> | undefined
): MeasurementGroupExtras {
  const parsed = MeasurementGroupExtrasSchema.safeParse(omitBlankStrings(source));
  return parsed.success ? parsed.data : {};
}

export function pickLineExtras(
  source: Record<string, unknown> | undefined
): MeasurementLineExtras {
  const parsed = MeasurementLineExtrasSchema.safeParse(omitBlankStrings(source));
  return parsed.success ? parsed.data : {};
}

export function groupExtrasFromDetails(
  details: Record<string, unknown> | undefined
): MeasurementGroupExtras {
  return pickGroupExtras(details);
}

export function mergeGroupExtrasIntoDetails<T extends Record<string, unknown>>(
  details: T,
  extras: MeasurementGroupExtras
): T & MeasurementGroupExtras {
  return { ...details, ...extras };
}
