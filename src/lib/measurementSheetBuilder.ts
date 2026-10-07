import type { MeasurementsPayload, ServiceItemGroup } from "@/lib/schemas";
import type { MeasurementSheet, MeasurementSheetGroup } from "@/lib/schemas/measurementSheet";
import {
  formatExteriorOpeningAndStoreDisplay,
  formatExteriorPartialPartsDisplay,
  getExteriorInstallTypeLabel,
  isExteriorCompletoForExport,
  isExteriorParcialInstall,
  parseOpeningWidthHeightMm,
} from "@/lib/measurements/exteriorInstall";
import {
  formatMaterialOrModelLine,
  getActivationLabel,
  getProductTypeLabel,
} from "@/lib/measurementLabels";
import { getGroupSpecDetailEntries } from "@/lib/measurementGroupSpecDisplay";
import { getDivisionLabel } from "@/lib/measurements/divisions";

export type MeasurementSheetHeaderInput = {
  opportunityId: string;
  clientName: string;
  nsi?: string;
  address: string;
  serviceLabel?: string;
  technicianName?: string;
  visitDateIso?: string;
};

function buildGroupRows(
  measurements: ServiceItemGroup["measurements"],
  lineIds?: string[],
  includeOpeningDims?: boolean
): MeasurementSheetGroup["rows"] {
  return measurements
    .map((m, idx) => {
      const row = m as {
        openingWidth?: string;
        openingHeight?: string;
      };
      const openingParsed =
        includeOpeningDims
          ? parseOpeningWidthHeightMm(row.openingWidth, row.openingHeight)
          : { widthMm: 0, heightMm: 0 };
      const openingDimensionLabel =
        includeOpeningDims
          ? formatExteriorOpeningAndStoreDisplay(
              row.openingWidth,
              row.openingHeight,
              m.width,
              m.height
            ) || undefined
          : undefined;
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
        lineId: lineIds?.[idx],
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
      };
    })
    .filter(
      (r) =>
        r.qty > 0 ||
        r.widthMm > 0 ||
        r.heightMm > 0 ||
        (r.openingWidthMm ?? 0) > 0 ||
        (r.openingHeightMm ?? 0) > 0
    );
}

export function buildMeasurementSheetFromPayload(
  header: MeasurementSheetHeaderInput,
  payload: MeasurementsPayload
): MeasurementSheet {
  const groups: MeasurementSheetGroup[] = payload.groups.map((g) => {
    const details = g.details ?? {};
    const productType = g.type;
    const exteriorInstall = details.exteriorInstallType;
    const isExterior = productType === "ESTORE_EXTERIOR";
    return {
      productType,
      productLabel: getProductTypeLabel(productType),
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
      rows: buildGroupRows(
        g.measurements,
        undefined,
        isExterior && isExteriorCompletoForExport(exteriorInstall)
      ),
    };
  });

  return {
    ...header,
    groups,
  };
}
