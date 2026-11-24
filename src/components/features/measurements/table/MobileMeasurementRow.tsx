"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, Trash2 } from "lucide-react";
import type { ProductGroup, MeasurementRow } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatMeasurementRowCollapsedMeta,
  formatMeasurementRowDimensionLabel,
  isMeasurementLineCollapsed,
} from "@/lib/measurements/measurementRowUi";
import {
  lineDimensionHeightLabel,
  lineDimensionUsesOpeningFields,
  lineDimensionWidthLabel,
  type LineDimensionMode,
} from "@/lib/measurements/lineModes";
import { getRtsCommandSpecs } from "@/lib/measurements/rtsCommands";
import { isMeasurementRowComplete } from "@/lib/measurements/completeness";
import { getDimensionSanityWarnings } from "@/lib/measurements/dimensionSanity";
import { cn } from "@/lib/cn";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RtsChannelFields } from "../RtsChannelFields";
import {
  MeasurementControlsPicker,
  MeasurementDivisionPicker,
  MeasurementFixationPicker,
  readOnlyControls,
  readOnlyFixation,
} from "../MeasurementFieldPickers";
import { measurementRowMobileTitle, rowExtrasShouldDefaultOpen } from "@/lib/measurements/tableHelpers";
import {
  DimField,
  DimensionSanityAlerts,
  MeasurementQtyStepper,
} from "./MeasurementRowPrimitives";

export type MobileMeasurementRowProps = {
  group: ProductGroup;
  row: MeasurementRow;
  rIdx: number;
  fieldsLocked: boolean;
  isAdmin: boolean;
  showPriceColumn: boolean;
  showExteriorOpeningDims: boolean;
  dimensionMode: LineDimensionMode;
  showChannel: boolean;
  showHardware: boolean;
  onUpdateMeasurement: (groupId: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (groupId: number, row: MeasurementRow) => void;
  onRemoveRow: (groupId: number, rowIndex: number) => void;
  triggerHaptic: (ms?: number) => void;
  focusHeightOnMount?: boolean;
  onHeightFocused?: () => void;
  onRequestFocusRow?: (nextRowIndex: number) => void;
};

export function MobileMeasurementRow({
  group,
  row,
  rIdx,
  fieldsLocked,
  isAdmin,
  showPriceColumn,
  showExteriorOpeningDims,
  dimensionMode,
  showChannel,
  showHardware,
  onUpdateMeasurement,
  onCloneRow,
  onRemoveRow,
  triggerHaptic,
  focusHeightOnMount = false,
  onHeightFocused,
  onRequestFocusRow,
}: MobileMeasurementRowProps) {
  const confirm = useConfirm();
  const heightInputRef = useRef<HTMLInputElement>(null);
  const widthInputRef = useRef<HTMLInputElement>(null);
  const collapsed = isMeasurementLineCollapsed(row);
  const [extrasOpen, setExtrasOpen] = useState(() =>
    rowExtrasShouldDefaultOpen(row, showExteriorOpeningDims)
  );
  const rowComplete = isMeasurementRowComplete(row, dimensionMode);
  const sanityWarnings = useMemo(
    () => (fieldsLocked ? [] : getDimensionSanityWarnings(row, dimensionMode)),
    [fieldsLocked, row, dimensionMode]
  );

  useEffect(() => {
    if (!focusHeightOnMount || collapsed || fieldsLocked) return;
    const id = requestAnimationFrame(() => {
      heightInputRef.current?.focus();
      onHeightFocused?.();
    });
    return () => cancelAnimationFrame(id);
  }, [focusHeightOnMount, collapsed, fieldsLocked, onHeightFocused]);

  const toggleCollapsed = () => {
    triggerHaptic();
    onUpdateMeasurement(group.id, rIdx, "lineCollapsed", collapsed ? "" : "true");
  };

  const rowTitle = measurementRowMobileTitle(row, rIdx);

  const collapsedMeta = formatMeasurementRowCollapsedMeta(row);
  const dimensionLabel = formatMeasurementRowDimensionLabel(row, dimensionMode);
  const setField = (field: string, value: string) =>
    onUpdateMeasurement(group.id, rIdx, field, value);
  const usesOpeningFields = lineDimensionUsesOpeningFields(dimensionMode);
  const primaryHeight = usesOpeningFields ? (row.openingHeight ?? "") : row.height;
  const primaryWidth = usesOpeningFields ? (row.openingWidth ?? "") : row.width;
  const primaryHeightField = usesOpeningFields ? "openingHeight" : "height";
  const primaryWidthField = usesOpeningFields ? "openingWidth" : "width";
  const heightLabel = lineDimensionHeightLabel(dimensionMode, "long");
  const widthLabel = lineDimensionWidthLabel(dimensionMode, "long");
  const sanityAlertsId = `measurement-sanity-g${group.id}-r${rIdx}`;
  const sanityAriaDescribedBy =
    sanityWarnings.length > 0 ? sanityAlertsId : undefined;
  const heightInputId = `measurement-h-g${group.id}-r${rIdx}`;
  const widthInputId = `measurement-w-g${group.id}-r${rIdx}`;

  const divisionLabel = getDivisionLabel(row.divisionCode, row.divisionCustom)?.trim();

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 p-4 shadow-sm",
        rowComplete
          ? "border-success-border bg-success-surface/40"
          : "border-border-strong bg-card"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex min-h-12 flex-1 items-start gap-2 rounded-xl px-1 py-1 text-left"
          aria-expanded={!collapsed}
        >
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-kicker text-primary-ink">Janela {rIdx + 1}</span>
              <span className={rowComplete ? "ds-chip-success" : "ds-chip-warning"}>
                {rowComplete ? "Pronta" : "Falta medida"}
              </span>
            </div>
            <span className="mt-0.5 block text-sm font-black text-foreground">
              {divisionLabel || rowTitle}
            </span>
            {collapsed ? (
              <>
                <span className="ds-num mt-1 block text-xl font-black leading-tight text-foreground">
                  {dimensionLabel}
                </span>
                {collapsedMeta ? (
                  <span className="mt-1 block text-xs font-semibold leading-snug text-muted-foreground">
                    {collapsedMeta}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </button>
        <div className="flex shrink-0 gap-3">
          {!fieldsLocked && (
            <>
              <button
                onClick={() => {
                  triggerHaptic();
                  onUpdateMeasurement(group.id, rIdx, "lineCollapsed", "true");
                  onCloneRow(group.id, row);
                  onRequestFocusRow?.(group.measurements.length);
                }}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-muted text-muted-foreground transition-all hover:bg-secondary"
                aria-label="Duplicar janela"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: "Eliminar esta janela?",
                      description: "Esta medição será removida da ficha.",
                      confirmLabel: "Eliminar",
                      cancelLabel: "Cancelar",
                      destructive: true,
                    });
                    if (!ok) return;
                    triggerHaptic(50);
                    onRemoveRow(group.id, rIdx);
                  })();
                }}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-danger-solid bg-danger-surface text-danger-solid transition-all hover:bg-danger-surface/80"
                aria-label="Eliminar janela"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <DimField
              label={heightLabel}
              value={primaryHeight}
              locked={fieldsLocked}
              placeholder="Ex: 1500"
              inputRef={heightInputRef}
              inputId={heightInputId}
              ariaDescribedBy={sanityAriaDescribedBy}
              enterKeyHint="next"
              onEnterPress={() => widthInputRef.current?.focus()}
              onChange={(value) => setField(primaryHeightField, value)}
            />
            <DimField
              label={widthLabel}
              value={primaryWidth}
              locked={fieldsLocked}
              placeholder="Ex: 1200"
              inputRef={widthInputRef}
              inputId={widthInputId}
              ariaDescribedBy={sanityAriaDescribedBy}
              enterKeyHint="done"
              onEnterPress={() => widthInputRef.current?.blur()}
              onChange={(value) => setField(primaryWidthField, value)}
            />
          </div>
          <DimensionSanityAlerts messages={sanityWarnings} id={sanityAlertsId} />
          {dimensionMode === "opening" &&
          (row.height?.trim() || row.width?.trim()) &&
          (row.height !== row.openingHeight || row.width !== row.openingWidth) ? (
            <p className="mb-3 px-1 text-xs font-semibold text-muted-foreground">
              Estore já registado: {row.height || "—"} × {row.width || "—"} mm
            </p>
          ) : null}
          {dimensionMode === "skylight" ? (
            <div className="mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DimField
                  label="Altura exterior"
                  value={row.skylightExteriorHeight ?? ""}
                  locked={fieldsLocked}
                  placeholder="Ex: 1500"
                  onChange={(value) => setField("skylightExteriorHeight", value)}
                />
                <DimField
                  label="Largura exterior"
                  value={row.skylightExteriorWidth ?? ""}
                  locked={fieldsLocked}
                  placeholder="Ex: 1200"
                  onChange={(value) => setField("skylightExteriorWidth", value)}
                />
              </div>
              <div className="max-w-[12rem]">
                <DimField
                  label="Profundidade"
                  value={row.depth ?? ""}
                  locked={fieldsLocked}
                  placeholder="Ex: 80"
                  onChange={(value) => setField("depth", value)}
                />
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap items-start gap-3">
            <div className="space-y-1">
              <label className="px-1 text-sm font-bold text-muted-foreground">
                Qtd
              </label>
              <MeasurementQtyStepper
                value={row.qty}
                locked={fieldsLocked}
                onChange={(next) => onUpdateMeasurement(group.id, rIdx, "qty", next)}
              />
            </div>
            {showChannel ? (
              <RtsChannelFields
                row={row}
                rowIndex={rIdx}
                allRows={group.measurements}
                specs={getRtsCommandSpecs(group.details)}
                locked={fieldsLocked}
                onUpdate={setField}
              />
            ) : null}
            {showPriceColumn ? (
              <div className="min-w-[8rem] flex-1 space-y-1">
                <label className="px-1 text-sm font-bold text-muted-foreground">
                  Preço (€)
                </label>
                {isAdmin ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border-2 border-border-strong bg-card p-3 text-sm font-black text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                    value={row.price}
                    placeholder="0.00"
                    onChange={(e) => onUpdateMeasurement(group.id, rIdx, "price", e.target.value)}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
                    {row.price ? `${row.price}€` : "-"}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="mb-3 space-y-1">
            <label className="px-1 text-sm font-bold text-muted-foreground">
              Divisão
            </label>
            {fieldsLocked ? (
              <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
                {getDivisionLabel(row.divisionCode, row.divisionCustom) || row.notes || "-"}
              </div>
            ) : (
              <MeasurementDivisionPicker
                productType={group.type}
                divisionCode={row.divisionCode ?? ""}
                divisionCustom={row.divisionCustom ?? ""}
                onChange={(code, custom) => {
                  onUpdateMeasurement(group.id, rIdx, "divisionCode", code);
                  onUpdateMeasurement(group.id, rIdx, "divisionCustom", custom);
                }}
              />
            )}
          </div>

          {showHardware || (showExteriorOpeningDims && (row.openingHeight || row.openingWidth)) ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setExtrasOpen((v) => !v);
              }}
              className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-expanded={extrasOpen}
            >
              <span className="text-sm font-bold text-foreground">Mais nesta janela</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${extrasOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {extrasOpen ? (
              <div className="space-y-3 rounded-xl border border-border-strong bg-card/80 p-3">
                {showExteriorOpeningDims && (row.openingHeight || row.openingWidth) ? (
                  <div className="space-y-2">
                    <p className="px-1 text-sm font-bold text-muted-foreground">
                      Dimensão do vão já registada (mm)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <DimField
                        label="Altura vão"
                        value={row.openingHeight ?? ""}
                        locked={fieldsLocked}
                        placeholder="Ex: 1550"
                        onChange={(value) => setField("openingHeight", value)}
                      />
                      <DimField
                        label="Largura vão"
                        value={row.openingWidth ?? ""}
                        locked={fieldsLocked}
                        placeholder="Ex: 1250"
                        onChange={(value) => setField("openingWidth", value)}
                      />
                    </div>
                  </div>
                ) : null}
                {showHardware ? (
                <>
                <div className="space-y-1">
                  <label className="px-1 text-sm font-bold text-muted-foreground">
                    Fixação
                  </label>
                  {fieldsLocked ? (
                    <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
                      {readOnlyFixation(row.fixationCodes, row.fixationCustom) || row.fixation || "-"}
                    </div>
                  ) : (
                    <MeasurementFixationPicker
                      codes={row.fixationCodes ?? ""}
                      custom={row.fixationCustom ?? ""}
                      onChange={(codes, custom) => {
                        onUpdateMeasurement(group.id, rIdx, "fixationCodes", codes);
                        onUpdateMeasurement(group.id, rIdx, "fixationCustom", custom);
                      }}
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="px-1 text-sm font-bold text-muted-foreground">
                    Comandos (lado)
                  </label>
                  {fieldsLocked ? (
                    <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
                      {readOnlyControls(row.controlsCodes, row.controlsCustom) || row.controls || "-"}
                    </div>
                  ) : (
                    <MeasurementControlsPicker
                      codes={row.controlsCodes ?? ""}
                      custom={row.controlsCustom ?? ""}
                      onChange={(codes, custom) => {
                        onUpdateMeasurement(group.id, rIdx, "controlsCodes", codes);
                        onUpdateMeasurement(group.id, rIdx, "controlsCustom", custom);
                      }}
                    />
                  )}
                </div>
                </>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}