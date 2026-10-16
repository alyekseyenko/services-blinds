import type { ProductType } from "@/types";
import {
  formatExteriorPartialPartsDisplay,
  isExteriorParcialInstall,
} from "@/lib/measurements/exteriorInstall";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  ESTORE_EXTERIOR: "Estore Exterior",
  ESTORE_INTERIOR: "Estore Interior",
  TOLDO: "Toldo",
  MOSQUITEIRO: "Mosquiteiro",
};

const MATERIAL_LABELS: Record<string, string> = {
  PVC: "PVC",
  PVC_MINOR: "PVC Minor",
  ALUMINIO_TERMICO: "Alumínio térmico",
  ALUMINIO_EXTRUDIDO: "Alumínio extrudido",
  BRISA_SOLAR: "Brisa solar",
  COMPACTO: "Compacto",
  OUTRO: "Outro",
};

const ACTIVATION_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  MOTOR_INVERSOR: "Motor inversor",
  MOTOR_RTS: "Motor RTS",
  MOTOR_IO: "Motor IO",
  OUTRO: "Outros",
};

const INTERIOR_MODEL_LABELS: Record<string, string> = {
  ROLO: "Rolo",
  VENEZIANO: "Veneziano",
  VERTICAL: "Vertical",
  DUETTE_PLISSADO: "Duette / plissado",
  SKYLIGHT: "Skylight",
  OUTRO: "Outro",
};

const MOSQUITO_MODEL_LABELS: Record<string, string> = {
  FIXO: "Fixo",
  VERTICAL: "Vertical",
  LATERAL: "Lateral",
  PORTA_AMERICA: "Porta América",
};

export const PRODUCT_TYPE_OPTIONS: { id: ProductType; label: string }[] = [
  { id: "ESTORE_EXTERIOR", label: "Estore Ext." },
  { id: "ESTORE_INTERIOR", label: "Estore Int." },
  { id: "TOLDO", label: "Toldo" },
  { id: "MOSQUITEIRO", label: "Mosquiteiro" },
];

export const EXTERIOR_MATERIAL_OPTIONS = [
  { value: "PVC", label: "PVC" },
  { value: "PVC_MINOR", label: "PVC Minor" },
  { value: "ALUMINIO_TERMICO", label: "Alumínio Térmico" },
  { value: "ALUMINIO_EXTRUDIDO", label: "Alumínio Extrudido" },
  { value: "BRISA_SOLAR", label: "Brisa Solar" },
  { value: "COMPACTO", label: "Compacto" },
  { value: "OUTRO", label: "Outro (Especificar...)" },
] as const;

export const COMPACT_MATERIAL_TYPE_OPTIONS = [
  { value: "PVC", label: "PVC" },
  { value: "ALUMINIO_TERMICO", label: "Alumínio térmico" },
  { value: "ALUMINIO_EXTRUDIDO", label: "Alumínio extrudido" },
] as const;

export const COMPACT_PLACEMENT_OPTIONS = [
  { value: "INTERIOR", label: "Compacto interior" },
  { value: "EXTERIOR", label: "Compacto exterior" },
] as const;

export const MANUAL_TYPE_OPTIONS = [
  { value: "MANIVELA", label: "Manivela" },
  { value: "FITA_ENROLADOR_EXTERIOR", label: "Fita (enrolador exterior)" },
  { value: "FITA_ENROLADOR_INTERIOR", label: "Fita (enrolador interior)" },
] as const;

export const RTS_COMMAND_MODE_OPTIONS = [
  { value: "UM_CANAL", label: "1 canal" },
  { value: "VARIOS_CANAIS", label: "Vários canais" },
] as const;

export const RTS_MOTOR_BRAND_OPTIONS = [
  { value: "SOMFY", label: "Somfy" },
  { value: "GAVIOTA", label: "Gaviota" },
  { value: "OUTRO", label: "Outro" },
] as const;

/** Subtipos quando o modelo interior é Rolo. */
export const INTERIOR_ROLO_VARIANT_OPTIONS = [
  { value: "EOS_LUXURY", label: "EOS Luxury" },
  { value: "SUPREME_EOS_LUXURY", label: "Supreme EOS Luxury" },
  { value: "EOS_LUXURY_CASSETTE", label: "EOS Luxury Cassette" },
  { value: "ALDIS_CORRENTE_MOTOR", label: "Aldis Corrente | Motor" },
  { value: "RUNNY_SLIM", label: "Runny Slim" },
  { value: "PRO_MAGNUM", label: "Pro-Magnum" },
  { value: "SKYLIGHT_ROLO", label: "Skylight" },
  { value: "ROLLITE", label: "Rollite" },
  { value: "ROLNIGHT", label: "Rolnight" },
  { value: "TEKNOFLEX", label: "Tecnoflex" },
  { value: "TEKNOFLEX_XL", label: "Tecnoflex XL" },
  { value: "OUTRO", label: "Outros" },
] as const;

export const INTERIOR_MODEL_OPTIONS = [
  { value: "ROLO", label: "Rolo" },
  { value: "VENEZIANO", label: "Veneziano" },
  { value: "VERTICAL", label: "Vertical" },
  { value: "DUETTE_PLISSADO", label: "Duette / Plissado" },
  { value: "SKYLIGHT", label: "Skylight" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const MOSQUITO_MODEL_OPTIONS = [
  { value: "FIXO", label: "Fixo" },
  { value: "VERTICAL", label: "Vertical" },
  { value: "LATERAL", label: "Lateral" },
  { value: "PORTA_AMERICA", label: "Porta América" },
] as const;

export const ACTIVATION_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "MOTOR_INVERSOR", label: "Motor Inversor" },
  { value: "MOTOR_RTS", label: "Motor RTS" },
  { value: "MOTOR_IO", label: "Motor IO" },
  { value: "OUTRO", label: "Outros" },
] as const;

export function getProductTypeLabel(type: string): string {
  return PRODUCT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}

/** Título do cartão e da ficha: «Estore Exterior — nome livre». */
export function formatProductGroupHeading(type: string, customName?: string): string {
  const base = getProductTypeLabel(type);
  const name = customName?.trim();
  return name ? `${base} — ${name}` : base;
}

export function formatRemeasureAnswer(needed?: string, note?: string): string {
  if (needed === "SIM") return "Sim";
  if (needed === "OUTROS") {
    const extra = note?.trim();
    return extra ? `Outros: ${extra}` : "Outros";
  }
  return "";
}

export function getMaterialLabel(material?: string, otherMaterial?: string): string {
  if (!material) return "";
  if (material === "OUTRO") return otherMaterial?.trim() || MATERIAL_LABELS.OUTRO;
  return MATERIAL_LABELS[material] || material;
}

export function getActivationLabel(code?: string, otherActivation?: string): string {
  if (!code) return "";
  if (code === "OUTRO") return otherActivation?.trim() || ACTIVATION_LABELS.OUTRO;
  return ACTIVATION_LABELS[code] || code;
}

const INTERIOR_ROLO_VARIANT_LABELS: Record<string, string> = Object.fromEntries(
  INTERIOR_ROLO_VARIANT_OPTIONS.map((o) => [o.value, o.label])
);

export function getInteriorRoloVariantLabel(code?: string): string {
  if (!code) return "";
  return INTERIOR_ROLO_VARIANT_LABELS[code] || code;
}

export function getInteriorRoloVariantDisplay(
  code?: string,
  otherRoloVariant?: string
): string {
  if (!code) return "";
  if (code === "OUTRO") {
    return otherRoloVariant?.trim() || INTERIOR_ROLO_VARIANT_LABELS.OUTRO || "Outros";
  }
  return getInteriorRoloVariantLabel(code);
}

export function getInteriorModelLabel(code?: string): string {
  if (!code) return "";
  return INTERIOR_MODEL_LABELS[code] || code;
}

/** Modelo interior para UI/export (inclui subtipo de rolo e Outro). */
export function formatInteriorModelDisplay(details: {
  model?: string;
  roloVariant?: string;
  otherRoloVariant?: string;
  otherModel?: string;
}): string {
  const model = details.model?.trim();
  if (!model) return "";
  if (model === "OUTRO") {
    return details.otherModel?.trim() || getInteriorModelLabel(model);
  }
  if (model === "ROLO") {
    const variant = getInteriorRoloVariantDisplay(
      details.roloVariant,
      details.otherRoloVariant
    );
    return variant ? `${getInteriorModelLabel(model)} — ${variant}` : getInteriorModelLabel(model);
  }
  if (model === "SKYLIGHT" && details.otherModel?.trim()) {
    return `${getInteriorModelLabel(model)} — ${details.otherModel.trim()}`;
  }
  return getInteriorModelLabel(model);
}

export function getMosquitoModelLabel(code?: string): string {
  if (!code) return "";
  return MOSQUITO_MODEL_LABELS[code] || code;
}

export function getModelLabel(productType: string, model?: string): string {
  if (!model) return "";
  if (productType === "ESTORE_INTERIOR") return getInteriorModelLabel(model);
  if (productType === "MOSQUITEIRO") return getMosquitoModelLabel(model);
  return model;
}

export function formatMaterialOrModelLine(
  productType: string,
  details: {
    material?: string;
    otherMaterial?: string;
    exteriorInstallType?: string;
    partialPartCodes?: string;
    partialPartCustom?: string;
    model?: string;
    roloVariant?: string;
    otherRoloVariant?: string;
    otherModel?: string;
  }
): string {
  if (productType === "ESTORE_EXTERIOR") {
    if (isExteriorParcialInstall(details.exteriorInstallType)) {
      return (
        formatExteriorPartialPartsDisplay(
          details.partialPartCodes,
          details.partialPartCustom
        ) || "Parcial"
      );
    }
    return getMaterialLabel(details.material, details.otherMaterial);
  }
  if (productType === "ESTORE_INTERIOR") {
    return formatInteriorModelDisplay(details);
  }
  return getModelLabel(productType, details.model);
}
