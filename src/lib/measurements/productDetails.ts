import type { ProductGroupDetails as UiGroupDetails, ProductType } from "@/types";

import type { MeasurementGroupExtras } from "@/lib/measurements/extendedFields";
import { pickGroupExtras } from "@/lib/measurements/extendedFields";

export type MeasurementGroupDetails = {
  material: string;
  otherMaterial: string;
  ral: string;
  activation: string;
  model: string;
  fabric: string;
  reference: string;
  observations: string;
} & MeasurementGroupExtras;

const EMPTY_DETAILS: MeasurementGroupDetails = {
  material: "",
  otherMaterial: "",
  ral: "",
  activation: "",
  model: "",
  fabric: "",
  reference: "",
  observations: "",
};

const GROUP_EXTRA_KEYS = Object.keys(
  pickGroupExtras({})
) as (keyof MeasurementGroupExtras)[];

function pickDetails(
  source: Partial<MeasurementGroupDetails> | UiGroupDetails | undefined,
  keys: (keyof MeasurementGroupDetails)[]
): MeasurementGroupDetails {
  const out = { ...EMPTY_DETAILS, ...pickGroupExtras(source as Record<string, unknown>) };
  for (const key of keys) {
    if (key in out && typeof out[key] === "string") {
      (out as Record<string, string>)[key] = source?.[key]?.trim()
        ? String(source[key]).trim()
        : "";
    }
  }
  for (const key of GROUP_EXTRA_KEYS) {
    const v = source?.[key];
    if (v != null && String(v).trim() !== "") {
      (out as Record<string, string>)[key] = String(v).trim();
    }
  }
  return out;
}

/**
 * Ao mudar o tipo de produto no formulário, não herdar modelo/material/acionamento
 * do tipo anterior (ex.: modelo de mosquiteiro em toldo).
 */
export function sanitizeGroupDetailsOnProductTypeChange(
  nextType: ProductType,
  previousType: ProductType,
  details?: Partial<MeasurementGroupDetails> | UiGroupDetails
): MeasurementGroupDetails {
  if (nextType === previousType) {
    return sanitizeGroupDetailsForType(nextType, details);
  }
  const observations = details?.observations?.trim() ?? "";
  return sanitizeGroupDetailsForType(nextType, { observations });
}

/** Campos de detalhe válidos por tipo de produto (formulário técnico + CRM). */
export function sanitizeGroupDetailsForType(
  type: ProductType,
  details?: Partial<MeasurementGroupDetails> | UiGroupDetails
): MeasurementGroupDetails {
  switch (type) {
    case "ESTORE_EXTERIOR":
      return pickDetails(details, [
        "material",
        "otherMaterial",
        "ral",
        "activation",
        "observations",
      ]);
    case "ESTORE_INTERIOR":
      return pickDetails(details, [
        "model",
        "fabric",
        "reference",
        "activation",
        "observations",
      ]);
    case "TOLDO":
      return pickDetails(details, [
        "model",
        "fabric",
        "reference",
        "activation",
        "observations",
      ]);
    case "MOSQUITEIRO":
      return pickDetails(details, ["model", "fabric", "observations"]);
    default:
      return { ...EMPTY_DETAILS };
  }
}

export function productTypeUsesExteriorMaterial(type: string): boolean {
  return type === "ESTORE_EXTERIOR";
}

export function productTypeUsesActivation(type: string): boolean {
  return type !== "MOSQUITEIRO";
}
