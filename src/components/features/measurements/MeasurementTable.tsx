import React, { useState } from "react";
import { ChevronDown, Copy, Trash2, Plus } from "lucide-react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { ProductGroup, MeasurementRow } from "@/types";
import { hapticTap } from "@/lib/haptics";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import {
  formatMeasurementRowCollapsedMeta,
  formatMeasurementRowDimensionLabel,
  isMeasurementLineCollapsed,
} from "@/lib/measurements/measurementRowUi";
import { isPortaAmerica, lineDimensionMode, type LineDimensionMode } from "@/lib/measurements/lineModes";

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
}: {
  label: string;
  value: string;
  locked: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className={MEASUREMENT_DIM_LABEL}>
        <span>{label}</span> <span className="text-sm font-bold text-primary-ink">mm</span>
      </label>
      {locked ? (
        <div className={MEASUREMENT_DIM_READ}>{value || "-"}</div>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={MEASUREMENT_DIM_INPUT}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ChannelFields({
  row,
  locked,
  onUpdate,
}: {
  row: MeasurementRow;
  locked: boolean;
  onUpdate: (field: string, value: string) => void;
}) {
  const [otherOpen, setOtherOpen] = useState(Boolean(row.storeChannelOther?.trim()));
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <label className="px-1 text-sm font-bold text-muted-foreground">Canal do estore</label>
      <div className="flex items-center gap-2">
        {locked ? (
          <div className="min-h-12 flex-1 rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
            {row.storeChannel || "-"}
          </div>
        ) : (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-12 w-20 rounded-xl border-2 border-border-strong bg-card px-2 text-center text-sm font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            value={row.storeChannel ?? ""}
            placeholder="Nº"
            aria-label="Canal do estore"
            onChange={(e) => onUpdate("storeChannel", e.target.value.replace(/\D/g, ""))}
          />
        )}
        <button
          type="button"
          className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black uppercase ${
            otherOpen || row.storeChannelOther?.trim()
              ? "border-primary bg-primary/15"
              : "border-border bg-card"
          }`}
          onClick={() => setOtherOpen((v) => !v)}
          disabled={locked && !row.storeChannelOther?.trim()}
        >
          Outros
        </button>
      </div>
      {otherOpen || row.storeChannelOther?.trim() ? (
        locked ? (
          <div className="rounded-xl border border-border bg-card p-3 text-sm font-bold text-foreground">
            {row.storeChannelOther || "—"}
          </div>
        ) : (
          <input
            type="text"
            className="w-full min-h-12 rounded-xl border-2 border-border-strong bg-card p-3 text-sm font-bold text-foreground outline-none focus:border-primary"
            value={row.storeChannelOther ?? ""}
            placeholder="Mais informação sobre o canal"
            onChange={(e) => onUpdate("storeChannelOther", e.target.value)}
          />
        )
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
}: MobileRowProps) {
  const collapsed = isMeasurementLineCollapsed(row);
  const [extrasOpen, setExtrasOpen] = useState(() =>
    rowExtrasShouldDefaultOpen(row, showExteriorOpeningDims)
  );

  const toggleCollapsed = () => {
    triggerHaptic();
    onUpdateMeasurement(group.id, rIdx, "lineCollapsed", collapsed ? "" : "true");
  };

  const rowTitle = measurementRowMobileTitle(row, rIdx);

  const collapsedMeta = formatMeasurementRowCollapsedMeta(row);
  const dimensionLabel = formatMeasurementRowDimensionLabel(row, dimensionMode);
  const setField = (field: string, value: string) =>
    onUpdateMeasurement(group.id, rIdx, field, value);
  const primaryHeight =
    dimensionMode === "opening" ? (row.openingHeight ?? "") : row.height;
  const primaryWidth = dimensionMode === "opening" ? (row.openingWidth ?? "") : row.width;
  const primaryHeightField = dimensionMode === "opening" ? "openingHeight" : "height";
  const primaryWidthField = dimensionMode === "opening" ? "openingWidth" : "width";
  const heightLabel =
    dimensionMode === "skylight"
      ? "Altura interior"
      : dimensionMode === "opening"
        ? "Altura vão"
        : "Altura";
  const widthLabel =
    dimensionMode === "skylight"
      ? "Largura interior"
      : dimensionMode === "opening"
        ? "Largura vão"
        : "Largura";

  return (
    <div className="relative rounded-2xl border-2 border-border-strong bg-card p-4">
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
            <span className="block text-sm font-bold text-foreground">{rowTitle}</span>
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
              onChange={(value) => setField(primaryHeightField, value)}
            />
            <DimField
              label={widthLabel}
              value={primaryWidth}
              locked={fieldsLocked}
              placeholder="Ex: 1200"
              onChange={(value) => setField(primaryWidthField, value)}
            />
          </div>
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
            <div className="w-24 space-y-1">
              <label className="px-1 text-sm font-bold text-muted-foreground">
                Qtd
              </label>
              {fieldsLocked ? (
                <div className="rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
                  {row.qty || "-"}
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full rounded-xl border-2 border-border-strong bg-card p-3 text-sm font-black text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                  value={row.qty}
                  disabled={fieldsLocked}
                  onChange={(e) => onUpdateMeasurement(group.id, rIdx, "qty", e.target.value)}
                />
              )}
            </div>
            {showChannel ? (
              <ChannelFields row={row} locked={fieldsLocked} onUpdate={setField} />
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
  const isDesktop = useMediaMinWidth(768);
  const fieldsLocked = isAdmin || readOnly;
  const dimensionMode = lineDimensionMode(group.type, group.details);
  const showChannel = group.details.activation === "MOTOR_RTS";
  const portaAmerica = isPortaAmerica(group.type, group.details.model);
  const hardwareHasValues = group.measurements.some(
    (row) =>
      Boolean(row.fixationCodes?.trim() || row.fixationCustom?.trim() || row.fixation?.trim()) ||
      Boolean(row.controlsCodes?.trim() || row.controlsCustom?.trim() || row.controls?.trim())
  );
  const showHardware = !portaAmerica || hardwareHasValues;
  const showLegacyOpening = dimensionMode !== "opening";
  const showLegacyOpeningCols =
    dimensionMode !== "opening" &&
    dimensionMode !== "skylight" &&
    group.measurements.some((row) => row.openingWidth?.trim() || row.openingHeight?.trim());
  const heightLabel =
    dimensionMode === "skylight" ? "Alt. int." : dimensionMode === "opening" ? "Alt. vão" : "Alt (mm)";
  const widthLabel =
    dimensionMode === "skylight" ? "Larg. int." : dimensionMode === "opening" ? "Larg. vão" : "Larg (mm)";
  const triggerHaptic = (ms = 20) => {
    hapticTap(ms);
  };

  if (isDesktop) {
  return (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[500px] border-separate border-spacing-y-2 print:border-collapse print:border-spacing-0">
          <thead>
            <tr className="text-left print:bg-muted">
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Qtd</th>
              {showChannel ? (
                <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Canal</th>
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
                  <td className="py-1 px-1 min-w-[8rem]">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="h-12 w-16 rounded-xl border-2 border-border-strong bg-card px-2 text-center text-sm font-black outline-none focus:border-primary"
                        value={row.storeChannel ?? ""}
                        placeholder="Nº"
                        aria-label="Canal do estore"
                        disabled={fieldsLocked}
                        onChange={(e) =>
                          onUpdateMeasurement(group.id, rIdx, "storeChannel", e.target.value.replace(/\D/g, ""))
                        }
                      />
                      <input
                        type="text"
                        className="h-10 w-full rounded-xl border-2 border-border bg-card px-2 text-xs font-bold outline-none focus:border-primary"
                        value={row.storeChannelOther ?? ""}
                        placeholder="Outros"
                        aria-label="Outros sobre o canal"
                        disabled={fieldsLocked}
                        onChange={(e) =>
                          onUpdateMeasurement(group.id, rIdx, "storeChannelOther", e.target.value)
                        }
                      />
                    </div>
                  </td>
                ) : null}
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
                      {(dimensionMode === "opening" ? row.openingHeight : row.height) || "-"}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                      value={dimensionMode === "opening" ? (row.openingHeight ?? "") : row.height}
                      placeholder="Ex: 1500"
                      onChange={(e) =>
                        onUpdateMeasurement(
                          group.id,
                          rIdx,
                          dimensionMode === "opening" ? "openingHeight" : "height",
                          e.target.value
                        )
                      }
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">
                      {(dimensionMode === "opening" ? row.openingWidth : row.width) || "-"}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                      value={dimensionMode === "opening" ? (row.openingWidth ?? "") : row.width}
                      placeholder="Ex: 1200"
                      onChange={(e) =>
                        onUpdateMeasurement(
                          group.id,
                          rIdx,
                          dimensionMode === "opening" ? "openingWidth" : "width",
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
    );
  }

  return (
    <>
      <div className="space-y-4 print:hidden">
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
          />
        ))}
      </div>

      {!fieldsLocked && (
        <div className="mt-6 space-y-2">
          <button
            type="button"
            data-tour="tech-measurements-add-row"
            onClick={() => {
              triggerHaptic(40);
              onAddRow(group.id);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-6 py-3.5 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover md:w-auto"
          >
            <Plus className="h-4 w-4 stroke-[3] text-foreground" />
            {group.measurements.length > 0
              ? "Adicionar outra na mesma divisão"
              : "Adicionar janela (linha)"}
          </button>
          {group.measurements.length > 0 ? (
            <p className="px-2 text-center text-xs font-semibold text-muted-foreground">
              Mantém divisão, fixação e comandos da linha anterior; preencha novas medidas. Recolha
              janelas concluídas no cabeçalho.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}
