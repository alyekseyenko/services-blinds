"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { getMeasurementSheetAction } from "@/actions/measurements-actions";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { Panel } from "@/components/ui/Panel";
import { appendMeasurementSheetDeParam } from "@/lib/measurements/sheetPageBack";

type Props = {
  opportunityId: string;
  /** When set, skip server fetch (onboarding demo). */
  initialSheet?: MeasurementSheet | null;
  /** Use from opportunity drawer so `useBackToClose` does not undo navigation. */
  onOpenSheet?: (path: string) => void;
};

export default function AdminOpportunityMeasurements({
  opportunityId,
  initialSheet,
  onOpenSheet,
}: Props) {
  const [sheet, setSheet] = useState<MeasurementSheet | null>(initialSheet ?? null);
  const [loading, setLoading] = useState(!initialSheet);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSheet) {
      setSheet(initialSheet);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const result = await getMeasurementSheetAction(opportunityId);
      if (cancelled) return;
      if (result.success && result.data) {
        setSheet(result.data);
        setError(null);
      } else {
        setSheet(null);
        setError(result.error || "Sem medições registadas.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, initialSheet]);

  if (!loading && !sheet) {
    if (error && !error.includes("Sem medições")) {
      return (
        <Panel className="space-y-3 p-4">
          <h3 className="ds-kicker">Medições</h3>
          <p className="text-sm font-medium text-danger-fg">{error}</p>
        </Panel>
      );
    }
    return null;
  }

  const totalUnits =
    sheet?.groups.reduce((acc, g) => acc + g.rows.reduce((s, r) => s + r.qty, 0), 0) ?? 0;
  const productCount = sheet?.groups.length ?? 0;

  return (
    <Panel className="space-y-3 p-4" data-tour="admin-opp-measurements">
      <h3 className="ds-kicker">Medições</h3>
      {loading ? (
        <div className="flex min-h-12 items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden />
          A carregar medições…
        </div>
      ) : null}
      {!loading && sheet?.sheetId ? (
        <>
          <p className="text-xs font-bold text-muted-foreground">
            {productCount} produto{productCount === 1 ? "" : "s"} · {totalUnits} unidade
            {totalUnits === 1 ? "" : "s"}
            {(sheet.version ?? 1) > 1 ? ` · versão ${sheet.version}` : ""}
          </p>
          {onOpenSheet ? (
            <button
              type="button"
              onClick={() =>
                onOpenSheet(
                  appendMeasurementSheetDeParam(`/medicoes/${sheet.sheetId}`, "oportunidade")
                )
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-ink bg-primary-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-ink"
              data-tour="admin-opp-measurements-open-sheet"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Abrir ficha de medições
            </button>
          ) : (
            <Link
              href={appendMeasurementSheetDeParam(`/medicoes/${sheet.sheetId}`, "oportunidade")}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-primary-ink bg-primary-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-ink"
              data-tour="admin-opp-measurements-open-sheet"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Abrir ficha de medições
            </Link>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            Detalhe, versões e exportação Excel/PDF na ficha.
          </p>
        </>
      ) : null}
    </Panel>
  );
}
