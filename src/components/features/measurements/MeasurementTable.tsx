"use client";

import { useMemo, useState } from "react";
import { useMeasurementsWideLayout } from "@/hooks/useMeasurementsLayout";
import type { ProductGroup, MeasurementRow } from "@/types";
import { hapticTap } from "@/lib/haptics";
import {
  lineDimensionHeightLabel,
  lineDimensionMode,
  lineDimensionUsesOpeningFields,
  lineDimensionWidthLabel,
  isPortaAmerica,
} from "@/lib/measurements/lineModes";
import { getRtsCommandSpecs } from "@/lib/measurements/rtsCommands";
import {
  analyzeRtsChannelUsage,
  formatRtsCapacityWarningMessage,
} from "@/lib/measurements/rtsChannelUsage";
import {
  groupHasHardwareValues,
  groupHasLegacyOpeningValues,
} from "@/lib/measurements/tableHelpers";
import { AddMeasurementRowFooter } from "@/components/features/measurements/table/MeasurementRowPrimitives";
import { MobileMeasurementRow } from "@/components/features/measurements/table/MobileMeasurementRow";
import { WideMeasurementTable } from "@/components/features/measurements/table/WideMeasurementTable";

export interface MeasurementTableProps {
  group: ProductGroup;
  isAdmin: boolean;
  readOnly?: boolean;
  /** Preço só no painel admin — oculto no tirar medidas (técnico). */
  showPriceColumn?: boolean;
  onUpdateMeasurement: (groupId: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (groupId: number, row: MeasurementRow) => void;
  onAddRow: (groupId: number) => void;
  onRemoveRow: (groupId: number, rowIndex: number) => void;
}

export function MeasurementTable({
  group,
  isAdmin,
  readOnly = false,
  showPriceColumn = false,
  onUpdateMeasurement,
  onCloneRow,
  onAddRow,
  onRemoveRow,
}: MeasurementTableProps) {
  const useWideTable = useMeasurementsWideLayout();
  const [focusRowIndex, setFocusRowIndex] = useState<number | null>(null);
  const fieldsLocked = isAdmin || readOnly;
  const dimensionMode = lineDimensionMode(group.type, group.details);
  const showChannel = group.details.activation === "MOTOR_RTS";
  const rtsSpecs = getRtsCommandSpecs(group.details);
  const portaAmerica = isPortaAmerica(group.type, group.details.model);
  const showHardware = groupHasHardwareValues(group.measurements, portaAmerica);
  const usesOpeningFields = lineDimensionUsesOpeningFields(dimensionMode);
  const showLegacyOpening = !usesOpeningFields;
  const showLegacyOpeningCols = groupHasLegacyOpeningValues(
    group.measurements,
    usesOpeningFields,
    dimensionMode
  );
  const heightLabel = lineDimensionHeightLabel(dimensionMode, "short");
  const widthLabel = lineDimensionWidthLabel(dimensionMode, "short");
  const triggerHaptic = (ms = 20) => {
    hapticTap(ms);
  };

  const rtsUsage = useMemo(
    () => (showChannel ? analyzeRtsChannelUsage(rtsSpecs, group.measurements) : null),
    [showChannel, rtsSpecs, group.measurements]
  );
  const rtsCapacityWarning =
    showChannel && rtsUsage
      ? formatRtsCapacityWarningMessage(rtsSpecs, rtsUsage)
      : null;

  const rtsCapacityBanner = rtsCapacityWarning ? (
    <p
      className="mb-4 rounded-xl border border-warning-border bg-warning-surface px-3 py-2.5 text-xs font-bold leading-snug text-warning-fg"
      role="status"
    >
      {rtsCapacityWarning}
    </p>
  ) : null;

  if (useWideTable) {
    return (
      <>
        {rtsCapacityBanner}
        <WideMeasurementTable
          group={group}
          fieldsLocked={fieldsLocked}
          isAdmin={isAdmin}
          showPriceColumn={showPriceColumn}
          showChannel={showChannel}
          dimensionMode={dimensionMode}
          usesOpeningFields={usesOpeningFields}
          showLegacyOpeningCols={showLegacyOpeningCols}
          showHardware={showHardware}
          heightLabel={heightLabel}
          widthLabel={widthLabel}
          rtsSpecs={rtsSpecs}
          onUpdateMeasurement={onUpdateMeasurement}
          onCloneRow={onCloneRow}
          onRemoveRow={onRemoveRow}
          triggerHaptic={triggerHaptic}
        />
        <AddMeasurementRowFooter
          rowCount={group.measurements.length}
          fieldsLocked={fieldsLocked}
          onBeforeAdd={() => setFocusRowIndex(group.measurements.length)}
          onAdd={() => onAddRow(group.id)}
          triggerHaptic={triggerHaptic}
        />
      </>
    );
  }

  return (
    <>
      {rtsCapacityBanner}
      <div className="mx-auto w-full max-w-3xl space-y-4 print:hidden md:max-w-4xl">
        {group.measurements.map((row, rIdx) => (
          <MobileMeasurementRow
            key={rIdx}
            group={group}
            row={row}
            rIdx={rIdx}
            fieldsLocked={fieldsLocked}
            isAdmin={isAdmin}
            showPriceColumn={showPriceColumn}
            showExteriorOpeningDims={showLegacyOpening}
            dimensionMode={dimensionMode}
            showChannel={showChannel}
            showHardware={showHardware}
            onUpdateMeasurement={onUpdateMeasurement}
            onCloneRow={onCloneRow}
            onRemoveRow={onRemoveRow}
            triggerHaptic={triggerHaptic}
            focusHeightOnMount={focusRowIndex === rIdx}
            onHeightFocused={() => setFocusRowIndex(null)}
            onRequestFocusRow={(next) => setFocusRowIndex(next)}
          />
        ))}
      </div>

      <AddMeasurementRowFooter
        rowCount={group.measurements.length}
        fieldsLocked={fieldsLocked}
        onBeforeAdd={() => setFocusRowIndex(group.measurements.length)}
        onAdd={() => onAddRow(group.id)}
        triggerHaptic={triggerHaptic}
      />
    </>
  );
}