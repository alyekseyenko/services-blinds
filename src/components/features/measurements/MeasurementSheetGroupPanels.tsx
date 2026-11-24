"use client";

import { ChevronDown } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import {
  getMeasurementGroupDetailEntries,
  partitionMeasurementGroupDetailEntries,
  formatMeasurementPriceDisplay,
  measurementLineColumnPlan,
  measurementLineColumnValue,
} from "@/lib/measurementSheetDisplay";

type Props = {
  sheet: MeasurementSheet;
  highlightLineId?: string;
  canEditPrices: boolean;
  phoneLayout: boolean;
  priceDrafts: Record<string, string>;
  onPriceDraftChange: (lineId: string, value: string) => void;
  openGroups: Record<number, boolean>;
  onToggleGroup: (index: number) => void;
};

export function MeasurementSheetGroupPanels({
  sheet,
  highlightLineId,
  canEditPrices,
  phoneLayout,
  priceDrafts,
  onPriceDraftChange,
  openGroups,
  onToggleGroup,
}: Props) {
  return (
    <div className="space-y-3">
      {sheet.groups.map((group, gi) => {
        const detailEntries = getMeasurementGroupDetailEntries(group);
        const { gridEntries, observations } = partitionMeasurementGroupDetailEntries(detailEntries);
        const plan = measurementLineColumnPlan(group, {
          includePrice: canEditPrices && !phoneLayout,
        });
        const isOpen = openGroups[gi] ?? true;
        return (
          <Panel key={`${group.productType}-${gi}`} className="overflow-hidden p-0">
            <button
              type="button"
              className="flex w-full min-h-12 items-center justify-between gap-2 px-4 py-3 text-left"
              onClick={() => onToggleGroup(gi)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-black">{group.productLabel}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                {detailEntries.length > 0 ? (
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {gridEntries.map((detail) => (
                      <div key={detail.label}>
                        <dt className="text-xs font-bold text-muted-foreground">{detail.label}</dt>
                        <dd className="text-xs font-bold">{detail.value}</dd>
                      </div>
                    ))}
                    {observations ? (
                      <div key={observations.label} className="sm:col-span-2">
                        <dt className="text-xs font-bold text-muted-foreground">{observations.label}</dt>
                        <dd className="text-xs font-bold whitespace-pre-wrap">{observations.value}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {phoneLayout ? (
                  <div className="space-y-2">
                    {group.rows.map((row) => (
                      <div
                        key={row.lineId ?? row.index}
                        id={row.lineId ? `measurement-line-${row.lineId}` : undefined}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                          Linha {row.index}
                        </p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                          {plan.columns.map((col) => (
                            <div key={col.key} className={col.key === "notes" ? "col-span-2" : undefined}>
                              <dt className="text-xs font-bold text-muted-foreground">{col.header}</dt>
                              <dd className="text-sm font-bold text-foreground">
                                {measurementLineColumnValue(row, col.key, plan.openingIsPrimary) || "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          {plan.columns.map((col) => (
                            <th key={col.key} className="px-2 py-1.5 font-black whitespace-nowrap">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr
                            key={row.lineId ?? row.index}
                            id={row.lineId ? `measurement-line-${row.lineId}` : undefined}
                            className={
                              row.lineId === highlightLineId
                                ? "bg-primary-surface/40"
                                : "border-b border-border/60"
                            }
                          >
                            {plan.columns.map((col) =>
                              col.key === "price" ? (
                                <td key={col.key} className="px-2 py-1.5">
                                  {canEditPrices && row.lineId ? (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="w-full min-w-[4.5rem] rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold"
                                      value={priceDrafts[row.lineId] ?? ""}
                                      placeholder="—"
                                      onChange={(e) => onPriceDraftChange(row.lineId!, e.target.value)}
                                      aria-label={`Preço linha ${row.index}`}
                                    />
                                  ) : (
                                    formatMeasurementPriceDisplay(row.price) || "—"
                                  )}
                                </td>
                              ) : (
                                <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                                  {measurementLineColumnValue(row, col.key, plan.openingIsPrimary) || "—"}
                                </td>
                              )
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}