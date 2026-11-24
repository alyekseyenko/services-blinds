"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import {
  formatMeasurementTotalPriceEur,
  sumMeasurementLinePrices,
} from "@/lib/measurements/measurementPriceTotal";

type Props = {
  sheet: MeasurementSheet;
  priceDrafts: Record<string, string>;
  priceDirty: boolean;
  savingPrices: boolean;
  onSave: () => void;
  visible?: boolean;
};

function linePricesForGroup(
  sheet: MeasurementSheet,
  groupIndex: number,
  priceDrafts: Record<string, string>
): string[] {
  const group = sheet.groups[groupIndex];
  if (!group) return [];
  return group.rows
    .filter((row) => row.lineId)
    .map((row) => priceDrafts[row.lineId!] ?? row.price ?? "");
}

export function MeasurementSheetPriceBar({
  sheet,
  priceDrafts,
  priceDirty,
  savingPrices,
  onSave,
  visible = true,
}: Props) {
  const groupTotals = useMemo(
    () =>
      sheet.groups.map((group, index) => ({
        label: group.productLabel,
        total: sumMeasurementLinePrices(linePricesForGroup(sheet, index, priceDrafts)),
      })),
    [sheet, priceDrafts]
  );

  const grandTotal = useMemo(() => {
    const prices = sheet.groups.flatMap((group) =>
      group.rows
        .filter((row) => row.lineId)
        .map((row) => priceDrafts[row.lineId!] ?? row.price ?? "")
    );
    return sumMeasurementLinePrices(prices);
  }, [sheet.groups, priceDrafts]);

  if (!visible) return null;

  const sticky = priceDirty;

  return (
    <div
      className={
        sticky
          ? "sticky bottom-0 z-20 -mx-4 border-t-2 border-warning-border bg-warning-surface px-4 py-3 shadow-lg sm:-mx-0 sm:rounded-2xl sm:border-2"
          : "rounded-2xl border-2 border-border bg-card p-4"
      }
      role="region"
      aria-label="Totais de orçamentação"
    >
      {priceDirty ? (
        <p className="mb-3 text-xs font-bold text-warning-fg">
          Tem preços por guardar. Guarde antes de exportar ou mudar de versão.
        </p>
      ) : null}

      <div className="space-y-2">
        {groupTotals.map((entry) => (
          <div key={entry.label} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-bold text-muted-foreground">{entry.label}</span>
            <span className="ds-num shrink-0 font-black text-foreground">
              {entry.total != null ? formatMeasurementTotalPriceEur(entry.total) : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Total obra
        </span>
        <span className="ds-num text-base font-black text-primary-ink">
          {grandTotal != null ? formatMeasurementTotalPriceEur(grandTotal) : "—"}
        </span>
      </div>

      {priceDirty ? (
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={savingPrices}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-ink bg-primary-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-ink disabled:opacity-50"
        >
          {savingPrices ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Guardar preços
        </button>
      ) : null}
    </div>
  );
}