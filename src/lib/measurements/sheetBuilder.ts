import type { MeasurementsPayload, ServiceItemGroup } from "@/lib/schemas";
import type { MeasurementSheet, MeasurementSheetGroup } from "@/lib/schemas/measurementSheet";
import {
  formatExteriorOpeningAndStoreDisplay,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorParcialInstall,
  parseOpeningWidthHeightMm,
} from "@/lib/measurements/exteriorInstall";
import { formatStoreChannelDisplay } from "@/lib/measurements/extendedFields";
import {
  formatMaterialOrModelLine,
  formatProductGroupHeading,
  formatRemeasureAnswer,
  getActivationLabel,
} from "@/lib/measurements/labels";
import { getGroupSpecDetailEntries } from "@/lib/measurements/groupSpecDisplay";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import { isPortaAmerica, lineDimensionMode } from "@/lib/measurements/lineModes";

export type MeasurementSheetHeaderInput = {
  opportunityId: string;
  clientName: string;
  nsi?: string;
  address: string;
  serviceLabel?: string;
  technicianName?: string;
  visitDateIso?: string;
};

function positiveMm(value?: string | number): number | undefined {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildGroupRows(
  measurements: ServiceItemGroup["measurements"]
): MeasurementSheetGroup["rows"] {
  return measurements
    .map((m, idx) => {
      const row = m as {
        openingWidth?: string;
        openingHeight?: string;
        skylightExteriorWidth?: string;
        skylightExteriorHeight?: string;
        depth?: string;
        storeChannel?: string;
        storeChannelOther?: string;
      };
      const openingParsed = parseOpeningWidthHeightMm(row.openingWidth, row.openingHeight);
      const openingDimensionLabel =
        formatExteriorOpeningAndStoreDisplay(
          row.openingWidth,
          row.openingHeight,
          m.width,
          m.height
        ) || undefined;
      const line = m as {
        divisionCode?: string;
        divisionCustom?: string;
        lineNotes?: string;
      };
      const divisionLabel =
        getDivisionLabel(line.divisionCode, line.divisionCustom)?.trim() ||
        m.notes?.trim() ||
        undefined;
      const lineNotes = line.lineNotes?.trim() || undefined;
      return {
        index: idx + 1,
        division: divisionLabel,
        qty: Number(m.qty) || 0,
        widthMm: Number(m.width) || 0,
        heightMm: Number(m.height) || 0,
        fixation: m.fixation?.trim() || undefined,
        controls: m.controls?.trim() || undefined,
        notes: lineNotes,
        price: m.price != null && String(m.price).trim() !== "" ? String(m.price) : undefined,
        openingWidthMm: openingParsed.widthMm > 0 ? openingParsed.widthMm : undefined,
        openingHeightMm: openingParsed.heightMm > 0 ? openingParsed.heightMm : undefined,
        openingDimensionLabel,
        exteriorWidthMm: positiveMm(row.skylightExteriorWidth),
        exteriorHeightMm: positiveMm(row.skylightExteriorHeight),
        depthMm: positiveMm(row.depth),
        channelLabel:
          formatStoreChannelDisplay(row.storeChannel, row.storeChannelOther) || undefined,
      };
    })
    .filter(
      (r) =>
        r.qty > 0 ||
        r.widthMm > 0 ||
        r.heightMm > 0 ||
        (r.openingWidthMm ?? 0) > 0 ||
        (r.openingHeightMm ?? 0) > 0 ||
        (r.exteriorWidthMm ?? 0) > 0 ||
        (r.exteriorHeightMm ?? 0) > 0 ||
        (r.depthMm ?? 0) > 0 ||
        Boolean(r.channelLabel)
    );
}

export function buildMeasurementSheetFromPayload(
  header: MeasurementSheetHeaderInput,
  payload: MeasurementsPayload
): MeasurementSheet {
  const remeasureLabel =
    payload.groups
      .map((g) => formatRemeasureAnswer(g.details?.remeasureNeeded, g.details?.remeasureNote))
      .find((label) => label.length > 0) || undefined;

  const groups: MeasurementSheetGroup[] = payload.groups.map((g) => {
    const details = g.details ?? {};
    const productType = g.type;
    const exteriorInstall = details.exteriorInstallType;
    const isExterior = productType === "ESTORE_EXTERIOR";
    return {
      productType,
      productLabel: formatProductGroupHeading(productType, details.customName),
      dimensionMode: lineDimensionMode(productType, details),
      suppressLineHardware: isPortaAmerica(productType, details.model),
      materialLabel:
        isExterior && isExteriorParcialInstall(exteriorInstall)
          ? undefined
          : formatMaterialOrModelLine(productType, details) || undefined,
      colorLabel: details.ral?.trim() || undefined,
      fabricLabel: details.fabric?.trim() || undefined,
      referenceLabel: details.reference?.trim() || undefined,
      activationLabel:
        getActivationLabel(details.activation, details.otherActivation) || undefined,
      observations: details.observations?.trim() || undefined,
      exteriorInstallLabel:
        isExterior && exteriorInstall
          ? getExteriorInstallTypeLabel(exteriorInstall)
          : isExterior
            ? getExteriorInstallTypeLabel("COMPLETO")
            : undefined,
      partialPartsLabel:
        isExterior && isExteriorParcialInstall(exteriorInstall)
          ? formatExteriorPartialPartsDisplay(
              details.partialPartCodes,
              details.partialPartCustom
            ) || undefined
          : undefined,
      specDetailEntries: getGroupSpecDetailEntries(productType, details),
      rows: buildGroupRows(g.measurements),
    };
  });

  return {
    ...header,
    remeasureLabel,
    groups,
  };
}
