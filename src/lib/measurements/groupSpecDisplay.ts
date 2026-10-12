import {
  COMPACT_MATERIAL_TYPE_OPTIONS,
  COMPACT_PLACEMENT_OPTIONS,
  MANUAL_TYPE_OPTIONS,
  RTS_COMMAND_MODE_OPTIONS,
  RTS_MOTOR_BRAND_OPTIONS,
  getMaterialLabel,
} from "@/lib/measurements/labels";
import { formatMosquitoOpeningDisplay } from "@/lib/measurements/extendedFields";
export type GroupSpecDetailEntry = { label: string; value: string };

export type GroupSpecDetailsInput = {
  material?: string;
  otherMaterial?: string;
  activation?: string;
  model?: string;
  structureColor?: string;
  compactPlacement?: string;
  compactMaterialType?: string;
  manualType?: string;
  rtsCommandMode?: string;
  rtsChannelCount?: string;
  rtsMotorBrand?: string;
  otherRtsMotorBrand?: string;
  mosquitoOpening?: string;
};

function labelFromOptions(
  value: string | undefined,
  options: readonly { value: string; label: string }[]
): string {
  if (!value?.trim()) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Detalhes extra do produto (RTS, manual, compacto, etc.) para ficha/PDF/Excel. */
export function getGroupSpecDetailEntries(
  productType: string,
  details: GroupSpecDetailsInput
): GroupSpecDetailEntry[] {
  const entries: GroupSpecDetailEntry[] = [];

  if (productType === "ESTORE_EXTERIOR" && details.material === "COMPACTO") {
    const placement = labelFromOptions(details.compactPlacement, COMPACT_PLACEMENT_OPTIONS);
    const compactMat = details.compactMaterialType
      ? getMaterialLabel(details.compactMaterialType)
      : "";
    if (placement) entries.push({ label: "Tipo compacto", value: placement });
    if (compactMat) entries.push({ label: "Material compacto", value: compactMat });
  }

  if (productType === "TOLDO" && details.structureColor?.trim()) {
    entries.push({
      label: "Cor da estrutura",
      value: details.structureColor.trim(),
    });
  }

  if (productType !== "MOSQUITEIRO" && details.activation === "MANUAL" && details.manualType) {
    const manual = labelFromOptions(details.manualType, MANUAL_TYPE_OPTIONS);
    if (manual) entries.push({ label: "Tipo manual", value: manual });
  }

  if (productType !== "MOSQUITEIRO" && details.activation === "MOTOR_RTS") {
    const mode = labelFromOptions(details.rtsCommandMode, RTS_COMMAND_MODE_OPTIONS);
    if (mode) entries.push({ label: "Comandos RTS", value: mode });
    if (details.rtsCommandMode === "VARIOS_CANAIS" && details.rtsChannelCount?.trim()) {
      entries.push({
        label: "Canais RTS",
        value: details.rtsChannelCount.trim(),
      });
    }
    const brand = labelFromOptions(details.rtsMotorBrand, RTS_MOTOR_BRAND_OPTIONS);
    if (brand) {
      entries.push({
        label: "Marca motor / comando",
        value:
          details.rtsMotorBrand === "OUTRO"
            ? details.otherRtsMotorBrand?.trim() || brand
            : brand,
      });
    }
  }

  if (productType === "MOSQUITEIRO" && details.model === "PORTA_AMERICA") {
    const opening = formatMosquitoOpeningDisplay(details.mosquitoOpening);
    if (opening) entries.push({ label: "Abertura (porta América)", value: opening });
  }

  return entries;
}
