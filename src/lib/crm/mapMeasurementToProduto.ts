import type { MeasurementsPayload } from "@/lib/schemas";
import type { ServiceItem } from "@/lib/crm/items";
import {
  productTypeUsesActivation,
  productTypeUsesExteriorMaterial,
  sanitizeGroupDetailsForType,
} from "@/lib/measurementProductDetails";
import {
  formatExteriorOpeningAndStoreDisplay,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
} from "@/lib/measurements/exteriorInstall";
import { formatMosquitoOpeningDisplay } from "@/lib/measurements/extendedFields";
import {
  COMPACT_PLACEMENT_OPTIONS,
  MANUAL_TYPE_OPTIONS,
  RTS_COMMAND_MODE_OPTIONS,
  RTS_MOTOR_BRAND_OPTIONS,
  formatInteriorModelDisplay,
  getActivationLabel,
  getMaterialLabel,
} from "@/lib/measurementLabels";

type GroupDetails = {
  material?: string;
  otherMaterial?: string;
  ral?: string;
  activation?: string;
  model?: string;
  fabric?: string;
  reference?: string;
  observations?: string;
  compactPlacement?: string;
  compactMaterialType?: string;
  structureColor?: string;
  otherModel?: string;
  roloVariant?: string;
  otherRoloVariant?: string;
  exteriorInstallType?: string;
  partialPartCodes?: string;
  partialPartCustom?: string;
  manualType?: string;
  rtsCommandMode?: string;
  rtsChannelCount?: string;
  rtsMotorBrand?: string;
  otherRtsMotorBrand?: string;
  mosquitoOpening?: string;
  otherActivation?: string;
};

function resolveActivationForCrm(details: GroupDetails): string | undefined {
  if (!details.activation?.trim()) return undefined;
  if (details.activation === "OUTRO") {
    return details.otherActivation?.trim() || "Outro";
  }
  return details.activation.trim();
}

function labelFromOptions(
  value: string | undefined,
  options: readonly { value: string; label: string }[]
): string | null {
  if (!value?.trim()) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

function buildGroupExtraLocationBits(productType: string, details: GroupDetails): string[] {
  const bits: string[] = [];
  if (productType === "ESTORE_EXTERIOR" && details.exteriorInstallType?.trim()) {
    bits.push(`Montagem: ${getExteriorInstallTypeLabel(details.exteriorInstallType)}`);
  }
  if (
    productType === "ESTORE_EXTERIOR" &&
    isExteriorParcialInstall(details.exteriorInstallType)
  ) {
    const parts = formatExteriorPartialPartsDisplay(
      details.partialPartCodes,
      details.partialPartCustom
    );
    if (parts) bits.push(`Peças: ${parts}`);
  }
  if (productType === "ESTORE_EXTERIOR" && details.material === "COMPACTO") {
    const placement = labelFromOptions(details.compactPlacement, COMPACT_PLACEMENT_OPTIONS);
    const compactMat = details.compactMaterialType
      ? getMaterialLabel(details.compactMaterialType)
      : null;
    if (placement) bits.push(`Compacto: ${placement}`);
    if (compactMat) bits.push(`Mat. compacto: ${compactMat}`);
  }
  if (productType === "TOLDO" && details.structureColor?.trim()) {
    bits.push(`Cor estrutura: ${details.structureColor.trim()}`);
  }
  if (details.model === "OUTRO" && details.otherModel?.trim()) {
    bits.push(`Modelo: ${details.otherModel.trim()}`);
  }
  if (
    details.model === "ROLO" &&
    details.roloVariant === "OUTRO" &&
    details.otherRoloVariant?.trim()
  ) {
    bits.push(`Tipo rolo: ${details.otherRoloVariant.trim()}`);
  }
  if (details.activation === "MANUAL" && details.manualType) {
    bits.push(`Manual: ${labelFromOptions(details.manualType, MANUAL_TYPE_OPTIONS) ?? details.manualType}`);
  }
  if (details.activation === "MOTOR_RTS") {
    const mode = labelFromOptions(details.rtsCommandMode, RTS_COMMAND_MODE_OPTIONS);
    if (mode) bits.push(`RTS: ${mode}`);
    if (details.rtsCommandMode === "VARIOS_CANAIS" && details.rtsChannelCount?.trim()) {
      bits.push(`Canais: ${details.rtsChannelCount.trim()}`);
    }
    const brand = labelFromOptions(details.rtsMotorBrand, RTS_MOTOR_BRAND_OPTIONS);
    if (brand) {
      bits.push(
        `Marca: ${details.rtsMotorBrand === "OUTRO" ? details.otherRtsMotorBrand?.trim() || brand : brand}`
      );
    }
  }
  if (productType === "MOSQUITEIRO" && details.mosquitoOpening?.trim()) {
    bits.push(`Abertura: ${formatMosquitoOpeningDisplay(details.mosquitoOpening)}`);
  }
  return bits;
}

type MeasurementRow = {
  qty?: number | string;
  width?: number | string;
  height?: number | string;
  notes?: string;
  fixation?: string;
  controls?: string;
  price?: number | string;
  openingWidth?: string;
  openingHeight?: string;
};

function resolveMaterialForCrm(details: GroupDetails): {
  material?: string;
  materialOther?: string;
} {
  if (!details.material) return {};
  if (details.material === "OUTRO") {
    return {
      material: "OUTRO",
      materialOther: details.otherMaterial?.trim() || undefined,
    };
  }
  return { material: details.material };
}

function buildLegacyLocation(
  productType: string,
  details: GroupDetails,
  row: MeasurementRow
): string {
  const materialLabel =
    details.material === "OUTRO"
      ? details.otherMaterial || "Outro"
      : details.material;

  const openingDim =
    productType === "ESTORE_EXTERIOR" &&
    !isExteriorParcialInstall(details.exteriorInstallType)
      ? formatExteriorOpeningAndStoreDisplay(
          row.openingWidth,
          row.openingHeight,
          row.width,
          row.height
        )
      : "";

  return [
    ...buildGroupExtraLocationBits(productType, details),
    row.notes ? `Local: ${row.notes}` : null,
    row.fixation ? `Fixação: ${row.fixation}` : null,
    row.controls ? `Comandos: ${row.controls}` : null,
    openingDim ? `Dim. vão: ${openingDim}` : null,
    productTypeUsesExteriorMaterial(productType) &&
    !isExteriorParcialInstall(details.exteriorInstallType) &&
    materialLabel
      ? `Mat: ${materialLabel}`
      : null,
    !productTypeUsesExteriorMaterial(productType) && details.model
      ? `Mod: ${
          productType === "ESTORE_INTERIOR"
            ? formatInteriorModelDisplay(details)
            : details.model
        }`
      : null,
    productTypeUsesActivation(productType) && details.activation
      ? `Acion: ${getActivationLabel(details.activation, details.otherActivation)}`
      : null,
    details.observations ? `Obs: ${details.observations}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildLegacyColor(details: GroupDetails): string {
  return [
    details.ral ? `RAL ${details.ral}` : null,
    details.fabric ? `Tec: ${details.fabric}` : null,
    details.reference ? `Ref: ${details.reference}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function parsePrice(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function buildMeasurementGroupId(
  opportunityId: string,
  groupIndex: number,
  productType: string
): string {
  return `${opportunityId.slice(0, 8)}-g${groupIndex}-${productType}`;
}

/** Converte payload de medições em linhas Produto (campos novos + cor/localizacao legado). */
export function buildProdutoItemsFromMeasurements(
  opportunityId: string,
  payload: MeasurementsPayload
): ServiceItem[] {
  return payload.groups.flatMap((g, gIdx) => {
    const details = sanitizeGroupDetailsForType(
      g.type as Parameters<typeof sanitizeGroupDetailsForType>[0],
      g.details
    ) as GroupDetails;
    const materialFields = productTypeUsesExteriorMaterial(g.type)
      ? resolveMaterialForCrm(details)
      : {};
    const groupId = buildMeasurementGroupId(opportunityId, gIdx, g.type);
    const legacyColor = buildLegacyColor(details) || "Padrão";

    return g.measurements.map((m) => {
      const row = m as MeasurementRow;
      const division = row.notes?.trim() || undefined;
      const location = buildLegacyLocation(g.type, details, row) || "Geral";
      const activation = productTypeUsesActivation(g.type)
        ? resolveActivationForCrm(details)
        : undefined;

      return {
        opportunityId,
        product: g.type,
        width: parseInt(String(row.width), 10) || 0,
        height: parseInt(String(row.height), 10) || 0,
        qty: parseInt(String(row.qty), 10) || 0,
        color: legacyColor,
        location,
        isPrepared: false,
        division,
        fixation: row.fixation?.trim() || undefined,
        controls: row.controls?.trim() || undefined,
        material: materialFields.material,
        materialOther: materialFields.materialOther,
        model:
          g.type === "ESTORE_INTERIOR"
            ? formatInteriorModelDisplay(details) || details.model?.trim() || undefined
            : details.model?.trim() || undefined,
        ralColor: productTypeUsesExteriorMaterial(g.type)
          ? details.ral?.trim() || undefined
          : undefined,
        fabric: details.fabric?.trim() || undefined,
        reference: details.reference?.trim() || undefined,
        activation,
        productObservations: details.observations?.trim() || undefined,
        measurementGroupId: groupId,
        price: parsePrice(row.price),
      };
    });
  });
}
