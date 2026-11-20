"use client";

import { Copy, Trash2 } from "lucide-react";
import type { ProductGroup } from "@/types";
import { getDivisionLabel } from "@/lib/measurements/divisions";
import type { LineDimensionMode } from "@/lib/measurements/lineModes";
import type { RtsCommandSpec } from "@/lib/measurements/rtsCommands";
import { RtsChannelFields } from "../RtsChannelFields";
import {
  MeasurementControlsPicker,
  MeasurementDivisionPicker,
  MeasurementFixationPicker,
  readOnlyControls,
  readOnlyFixation,
} from "../MeasurementFieldPickers";

export function WideMeasurementTable({
  group,
  fieldsLocked,
  isAdmin,
  showPriceColumn,
  showChannel,
  dimensionMode,
  usesOpeningFields,
  showLegacyOpeningCols,
  showHardware,
  heightLabel,
  widthLabel,
  rtsSpecs,
  onUpdateMeasurement,
  onCloneRow,
  onRemoveRow,
  triggerHaptic,
}: {
  group: ProductGroup;
  fieldsLocked: boolean;
  isAdmin: boolean;
  showPriceColumn: boolean;
  showChannel: boolean;
  dimensionMode: LineDimensionMode;
  usesOpeningFields: boolean;
  showLegacyOpeningCols: boolean;
  showHardware: boolean;
  heightLabel: string;
  widthLabel: string;
  rtsSpecs: RtsCommandSpec[];
  onUpdateMeasurement: (groupId: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (groupId: number, row: ProductGroup["measurements"][number]) => void;
  onRemoveRow: (groupId: number, rowIndex: number) => void;
  triggerHaptic: (ms?: number) => void;
}) {
  return (
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
                          e.target.value.replace(/\D/g, "")
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
                          e.target.value.replace(/\D/g, "")
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
                        onChange={(e) =>
                          onUpdateMeasurement(
                            group.id,
                            rIdx,
                            "skylightExteriorHeight",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
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
                        onChange={(e) =>
                          onUpdateMeasurement(
                            group.id,
                            rIdx,
                            "skylightExteriorWidth",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
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
                        onChange={(e) =>
                          onUpdateMeasurement(
                            group.id,
                            rIdx,
                            "depth",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
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
