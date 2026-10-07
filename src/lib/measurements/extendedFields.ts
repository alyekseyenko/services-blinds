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

export function formatMosquitoOpeningDisplay(raw?: string): string {
  return parseCsvCodes(raw)
    .map((c) => (c === "ESQUERDA" ? "Esquerda" : c === "DIREITA" ? "Direita" : c))
    .join(" · ");
}

export function pickGroupExtras(
  source: Record<string, unknown> | undefined
): MeasurementGroupExtras {
  const parsed = MeasurementGroupExtrasSchema.safeParse(source ?? {});
  return parsed.success ? parsed.data : {};
}

export function pickLineExtras(
  source: Record<string, unknown> | undefined
): MeasurementLineExtras {
  const parsed = MeasurementLineExtrasSchema.safeParse(source ?? {});
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
