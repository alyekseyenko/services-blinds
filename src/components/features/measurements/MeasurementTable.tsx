import React, { useEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { ChevronDown, Copy, Trash2, Plus } from "lucide-react";
import { useMeasurementsWideLayout } from "@/hooks/useMeasurementsLayout";
import { ProductGroup, MeasurementRow } from "@/types";
import { hapticTap } from "@/lib/haptics";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatMeasurementRowCollapsedMeta,
  formatMeasurementRowDimensionLabel,
  isMeasurementLineCollapsed,
} from "@/lib/measurements/measurementRowUi";
import {
  isPortaAmerica,
  lineDimensionHeightLabel,
  lineDimensionMode,
  lineDimensionUsesOpeningFields,
  lineDimensionWidthLabel,
  type LineDimensionMode,
} from "@/lib/measurements/lineModes";
import { getRtsCommandSpecs } from "@/lib/measurements/rtsCommands";
import { isMeasurementRowComplete } from "@/lib/measurements/completeness";
import { cn } from "@/lib/cn";
import { RtsChannelFields } from "./RtsChannelFields";
import {
  analyzeRtsChannelUsage,
  formatRtsCapacityWarningMessage,
} from "@/lib/measurements/rtsChannelUsage";
import { getDimensionSanityWarnings } from "@/lib/measurements/dimensionSanity";

const MEASUREMENT_DIM_LABEL =
  "flex items-center justify-between px-1 text-sm font-bold text-foreground";
const MEASUREMENT_DIM_INPUT =
  "ds-num w-full min-h-14 rounded-xl border-2 border-border-strong bg-input p-3 text-xl font-black text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 md:text-2xl";
const MEASUREMENT_DIM_READ =
  "ds-num rounded-xl border-2 border-border-strong bg-input p-3 text-xl font-black text-foreground md:text-2xl";
import {
  MeasurementControlsPicker,
  MeasurementDivisionPicker,
  MeasurementFixationPicker,
  readOnlyControls,
  readOnlyFixation,
} from "./MeasurementFieldPickers";

interface MeasurementTableProps {
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

function DimField({
  label,
  value,
  locked,
  placeholder,
  onChange,
  inputRef,
  enterKeyHint = "done",
  onEnterPress,
}: {
  label: string;
  value: string;
  locked: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  enterKeyHint?: "next" | "done";
  onEnterPress?: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterPress?.();
    }
  };

  return (
    <div className="space-y-1">
      <label className={MEASUREMENT_DIM_LABEL}>
        <span>{label}</span> <span className="text-sm font-bold text-primary-ink">mm</span>
      </label>
      {locked ? (
        <div className={MEASUREMENT_DIM_READ}>{value || "-"}</div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint={enterKeyHint}
          className={MEASUREMENT_DIM_INPUT}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

function DimensionSanityAlerts({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="space-y-1 px-1" role="status">
      {messages.map((msg) => (
        <p
          key={msg}
          className="rounded-lg border border-warning-border bg-warning-surface px-2 py-1.5 text-xs font-bold leading-snug text-warning-fg"
        >
          {msg}
        </p>
      ))}
    </div>
  );
}

function parseRowQty(value: string | number | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function MeasurementQtyStepper({
  value,
  locked,
  onChange,
}: {
  value: string | number | undefined;
  locked: boolean;
  onChange: (next: string) => void;
}) {
  const current = parseRowQty(value);
  if (locked) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
        {value || "-"}
      </div>
    );
  }
  const stepBtn =
    "flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-card text-lg font-black text-foreground active:scale-95";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={stepBtn}
        aria-label="Diminuir quantidade"
        onClick={() => onChange(String(Math.max(1, current - 1)))}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="ds-num h-12 w-14 rounded-xl border-2 border-border-strong bg-card text-center text-sm font-black text-foreground outline-none focus:border-primary"
        value={value}
        aria-label="Quantidade"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button
        type="button"
        className={stepBtn}
        aria-label="Aumentar quantidade"
        onClick={() => onChange(String(Math.min(99, current + 1)))}
      >
        +
      </button>
    </div>
  );
}

function AddMeasurementRowFooter({
  rowCount,
  fieldsLocked,
  onAdd,
  triggerHaptic,
  onBeforeAdd,
}: {
  rowCount: number;
  fieldsLocked: boolean;
  onAdd: () => void;
  triggerHaptic: (ms?: number) => void;
  onBeforeAdd?: () => void;
}) {
  if (fieldsLocked) return null;
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        data-tour="tech-measurements-add-row"
        onClick={() => {
          triggerHaptic(40);
          onBeforeAdd?.();
          onAdd();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-6 py-3.5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover md:w-auto"
      >
        <Plus className="h-4 w-4 stroke-[3] text-foreground" />
        {rowCount > 0 ? "Adicionar outra na mesma divisão" : "Adicionar janela (linha)"}
      </button>
      {rowCount > 0 ? (
        <p className="px-2 text-center text-xs font-semibold text-muted-foreground">
          Mantém divisão, fixação e comandos da linha anterior; preencha novas medidas. Recolha
          janelas concluídas no cabeçalho.
        </p>
      ) : null}
    </div>
  );
}

function measurementRowMobileTitle(row: MeasurementRow, rIdx: number): string {
  const division = getDivisionLabel(row.divisionCode, row.divisionCustom)?.trim();
  if (division) return division;
  return `Janela ${rIdx + 1}`;
}

function rowExtrasShouldDefaultOpen(
  row: MeasurementRow,
  showExteriorOpeningDims: boolean
): boolean {
  if (showExteriorOpeningDims) return true;
  if (row.fixationCodes?.trim() || row.fixationCustom?.trim() || row.fixation?.trim()) {
    return true;
  }
  if (row.controlsCodes?.trim() || row.controlsCustom?.trim() || row.controls?.trim()) {
    return true;
  }
  if (row.openingWidth?.trim() || row.openingHeight?.trim()) return true;
  return false;
}

type MobileRowProps = {
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
  onUpdateMeasurement: MeasurementTableProps["onUpdateMeasurement"];
  onCloneRow: MeasurementTableProps["onCloneRow"];
  onRemoveRow: MeasurementTableProps["onRemoveRow"];
  triggerHaptic: (ms?: number) => void;
  focusHeightOnMount?: boolean;
  onHeightFocused?: () => void;
  onRequestFocusRow?: (nextRowIndex: number) => void;
};

function MobileMeasurementRow({
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
}: MobileRowProps) {
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
                  triggerHaptic(50);
                  onRemoveRow(group.id, rIdx);
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
              enterKeyHint="done"
              onEnterPress={() => widthInputRef.current?.blur()}
              onChange={(value) => setField(primaryWidthField, value)}
            />
          </div>
          <DimensionSanityAlerts messages={sanityWarnings} />
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
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-left"
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
  const hardwareHasValues = group.measurements.some(
    (row) =>
      Boolean(row.fixationCodes?.trim() || row.fixationCustom?.trim() || row.fixation?.trim()) ||
      Boolean(row.controlsCodes?.trim() || row.controlsCustom?.trim() || row.controls?.trim())
  );
  const showHardware = !portaAmerica || hardwareHasValues;
  const usesOpeningFields = lineDimensionUsesOpeningFields(dimensionMode);
  const showLegacyOpening = !usesOpeningFields;
  const showLegacyOpeningCols =
    !usesOpeningFields &&
    dimensionMode !== "skylight" &&
    group.measurements.some((row) => row.openingWidth?.trim() || row.openingHeight?.trim());
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
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 print:border-collapse print:border-spacing-0">
          <thead>
            <tr className="text-left print:bg-muted">
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Qtd</th>
              {showChannel ? (
                <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Comando / canal</th>
              ) : null}
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">{heightLabel}</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">{widthLabel}</th>
              {dimensionMode === "skylight" ? (
                <>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2">Alt. ext.</th>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2">Larg. ext.</th>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2">Prof.</th>
                </>
              ) : null}
              {showLegacyOpeningCols ? (
                <>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2">Vão A</th>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2">Vão L</th>
                </>
              ) : null}
              {showHardware ? (
                <>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Fixação</th>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Comandos</th>
                </>
              ) : null}
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Divisão</th>
              {showPriceColumn ? (
                <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Preço (€)</th>
              ) : null}
              <th className="pb-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {group.measurements.map((row, rIdx) => (
              <tr key={rIdx} className="group print:break-inside-avoid">
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">{row.qty || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-14 h-12 bg-card border-2 border-border-strong rounded-xl px-2 text-base font-black text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.qty}
                      disabled={fieldsLocked}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'qty', e.target.value)}
                    />
                  )}
                </td>
                {showChannel ? (
                  <td className="py-1 px-1 min-w-[9rem]">
                    <RtsChannelFields
                      compact
                      row={row}
                      rowIndex={rIdx}
                      allRows={group.measurements}
                      specs={rtsSpecs}
                      locked={fieldsLocked}
                      onUpdate={(field, value) => onUpdateMeasurement(group.id, rIdx, field, value)}
                    />
                  </td>
                ) : null}
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
                      {(usesOpeningFields ? row.openingHeight : row.height) || "-"}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                      value={usesOpeningFields ? (row.openingHeight ?? "") : row.height}
                      placeholder="Ex: 1500"
                      onChange={(e) =>
                        onUpdateMeasurement(
                          group.id,
                          rIdx,
                          usesOpeningFields ? "openingHeight" : "height",
                          e.target.value
                        )
                      }
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
                      {(usesOpeningFields ? row.openingWidth : row.width) || "-"}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                      value={usesOpeningFields ? (row.openingWidth ?? "") : row.width}
                      placeholder="Ex: 1200"
                      onChange={(e) =>
                        onUpdateMeasurement(
                          group.id,
                          rIdx,
                          usesOpeningFields ? "openingWidth" : "width",
                          e.target.value
                        )
                      }
                    />
                  )}
                </td>
                {dimensionMode === "skylight" ? (
                  <>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black outline-none focus:border-primary"
                        value={row.skylightExteriorHeight ?? ""}
                        placeholder="Alt."
                        disabled={fieldsLocked}
                        onChange={(e) => onUpdateMeasurement(group.id, rIdx, "skylightExteriorHeight", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black outline-none focus:border-primary"
                        value={row.skylightExteriorWidth ?? ""}
                        placeholder="Larg."
                        disabled={fieldsLocked}
                        onChange={(e) => onUpdateMeasurement(group.id, rIdx, "skylightExteriorWidth", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black outline-none focus:border-primary"
                        value={row.depth ?? ""}
                        placeholder="Prof."
                        disabled={fieldsLocked}
                        onChange={(e) => onUpdateMeasurement(group.id, rIdx, "depth", e.target.value)}
                      />
                    </td>
                  </>
                ) : null}
                {showLegacyOpeningCols ? (
                  <>
                    <td className="py-1 px-1">
                      <div className="text-sm font-black text-center">{row.openingHeight || "-"}</div>
                    </td>
                    <td className="py-1 px-1">
                      <div className="text-sm font-black text-center">{row.openingWidth || "-"}</div>
                    </td>
                  </>
                ) : null}
                {showHardware ? (
                <>
                <td className="py-1 px-1 print:border print:p-2 min-w-[8rem]">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
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
                </td>
                <td className="py-1 px-1 print:border print:p-2 min-w-[8rem]">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
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
                </td>
                </>
                ) : null}
                <td className="py-1 px-1 print:border print:p-2 min-w-[10rem]">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
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
                </td>
                {showPriceColumn ? (
                  <td className="py-1 px-1 print:border print:p-2">
                    {isAdmin ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                        value={row.price}
                        placeholder="0.00"
                        onChange={(e) => onUpdateMeasurement(group.id, rIdx, "price", e.target.value)}
                      />
                    ) : (
                      <div className="text-sm font-black text-foreground text-center">
                        {row.price ? `${row.price}€` : "-"}
                      </div>
                    )}
                  </td>
                ) : null}
                <td className="py-1 px-1 print:hidden flex items-center gap-1">
                  {!fieldsLocked && (
                    <>
                      <button 
                        onClick={() => { triggerHaptic(); onCloneRow(group.id, row); }}
                        className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink"
                        aria-label="Duplicar linha"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { triggerHaptic(50); onRemoveRow(group.id, rIdx); }}
                        className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-danger-surface hover:text-danger-solid"
                        aria-label="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
