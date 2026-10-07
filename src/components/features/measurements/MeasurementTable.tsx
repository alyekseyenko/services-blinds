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
  const dimensionLabel = formatMeasurementRowDimensionLabel(row);

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
            <div className="space-y-1">
              <label className={MEASUREMENT_DIM_LABEL}>
                <span>Largura</span> <span className="text-sm font-bold text-primary-ink">mm</span>
              </label>
              {fieldsLocked ? (
                <div className={MEASUREMENT_DIM_READ}>{row.width || "-"}</div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={MEASUREMENT_DIM_INPUT}
                  value={row.width}
                  placeholder="Ex: 1200"
                  disabled={fieldsLocked}
                  onChange={(e) => onUpdateMeasurement(group.id, rIdx, "width", e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <label className={MEASUREMENT_DIM_LABEL}>
                <span>Altura</span> <span className="text-sm font-bold text-primary-ink">mm</span>
              </label>
              {fieldsLocked ? (
                <div className={MEASUREMENT_DIM_READ}>{row.height || "-"}</div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={MEASUREMENT_DIM_INPUT}
                  value={row.height}
                  placeholder="Ex: 1500"
                  disabled={fieldsLocked}
                  onChange={(e) => onUpdateMeasurement(group.id, rIdx, "height", e.target.value)}
                />
              )}
            </div>
          </div>

          <div className={`mb-3 grid gap-3 ${showPriceColumn ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="max-w-[7rem] space-y-1">
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
            {showPriceColumn ? (
              <div className="space-y-1">
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
                {showExteriorOpeningDims ? (
                  <div className="space-y-2">
                    <p className="px-1 text-sm font-bold text-muted-foreground">
                      Dimensão do vão (mm)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="px-1 text-sm font-bold text-foreground">
                          Largura vão
                        </label>
                        {fieldsLocked ? (
                          <div className="rounded-xl border border-border bg-card p-3 text-sm font-black">
                            {row.openingWidth || "-"}
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full rounded-xl border-2 border-border-strong bg-card p-3 text-base font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                            value={row.openingWidth ?? ""}
                            placeholder="Ex: 1250"
                            onChange={(e) =>
                              onUpdateMeasurement(group.id, rIdx, "openingWidth", e.target.value)
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="px-1 text-sm font-bold text-foreground">
                          Altura vão
                        </label>
                        {fieldsLocked ? (
                          <div className="rounded-xl border border-border bg-card p-3 text-sm font-black">
                            {row.openingHeight || "-"}
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full rounded-xl border-2 border-border-strong bg-card p-3 text-base font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                            value={row.openingHeight ?? ""}
                            placeholder="Ex: 1550"
                            onChange={(e) =>
                              onUpdateMeasurement(group.id, rIdx, "openingHeight", e.target.value)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <p className="px-1 text-xs font-semibold text-muted-foreground">
                      Largura/altura acima = estore; no PDF: vão (estore …).
                    </p>
                  </div>
                ) : null}
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
              </div>
            ) : null}
          </div>
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
  const showExteriorOpeningDims =
    group.type === "ESTORE_EXTERIOR" &&
    group.details.exteriorInstallType === "COMPLETO";
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
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Larg (mm)</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Alt (mm)</th>
              {showExteriorOpeningDims ? (
                <>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Vão L</th>
                  <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Vão A</th>
                </>
              ) : null}
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Fixação</th>
              <th className="pb-3 text-xs font-black text-foreground uppercase tracking-wider px-2 print:border print:p-2 print:text-foreground">Comandos</th>
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
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">{row.width || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.width}
                      placeholder="Ex: 1200"
                      disabled={fieldsLocked}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'width', e.target.value)}
                    />
                  )}
                </td>
                <td className="py-1 px-1 print:border print:p-2">
                  {fieldsLocked ? (
                    <div className="text-sm font-black text-foreground text-center">{row.height || '-'}</div>
                  ) : (
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all print:border-0 print:p-0 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                      value={row.height}
                      placeholder="Ex: 1500"
                      disabled={fieldsLocked}
                      onChange={(e) => onUpdateMeasurement(group.id, rIdx, 'height', e.target.value)}
                    />
                  )}
                </td>
                {showExteriorOpeningDims ? (
                  <>
                    <td className="py-1 px-1 print:border print:p-2">
                      {fieldsLocked ? (
                        <div className="text-sm font-black text-foreground text-center">{row.openingWidth || "-"}</div>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                          value={row.openingWidth ?? ""}
                          placeholder="Vão"
                          disabled={fieldsLocked}
                          onChange={(e) => onUpdateMeasurement(group.id, rIdx, "openingWidth", e.target.value)}
                        />
                      )}
                    </td>
                    <td className="py-1 px-1 print:border print:p-2">
                      {fieldsLocked ? (
                        <div className="text-sm font-black text-foreground text-center">{row.openingHeight || "-"}</div>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-full h-12 bg-card border-2 border-border-strong rounded-xl px-2.5 text-base font-black text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none transition-all"
                          value={row.openingHeight ?? ""}
                          placeholder="Vão"
                          disabled={fieldsLocked}
                          onChange={(e) => onUpdateMeasurement(group.id, rIdx, "openingHeight", e.target.value)}
                        />
                      )}
                    </td>
                  </>
                ) : null}
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
            showExteriorOpeningDims={showExteriorOpeningDims}
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
