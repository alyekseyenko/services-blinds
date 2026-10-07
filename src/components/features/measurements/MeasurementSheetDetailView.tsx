"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileText, Loader2 } from "lucide-react";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import {
  getMeasurementGroupDetailEntries,
  partitionMeasurementGroupDetailEntries,
  formatMeasurementLxAMm,
  formatMeasurementPriceDisplay,
  groupShowsLineNotesColumn,
  groupShowsOpeningDimensions,
} from "@/lib/measurementSheetDisplay";
import { useToast } from "@/components/ui/ToastContext";
import { toUserMessage } from "@/lib/userMessages";
import { Panel } from "@/components/ui/Panel";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";
import { updateMeasurementSheetPricesAction } from "@/actions/measurements-actions";

type Props = {
  sheet: MeasurementSheet;
  highlightLineId?: string;
  exportOpportunityId: string;
  versionOptions?: Array<{ sheetId: string; version: number; label: string }>;
  onSelectVersion?: (version: number) => void;
  /** Operador admin/member/ceo — edita preços na ficha. */
  canEditPrices?: boolean;
  onPricesSaved?: () => void;
};

async function downloadExport(opportunityId: string, format: "xlsx" | "pdf") {
  const res = await fetch(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/measurements/export?format=${format}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Falha ao exportar (${res.status}).`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `Medicoes.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function MeasurementSheetDetailView({
  sheet,
  highlightLineId,
  exportOpportunityId,
  versionOptions,
  onSelectVersion,
  canEditPrices = false,
  onPricesSaved,
}: Props) {
  const toast = useToast();
  const [headerOpen, setHeaderOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const group of sheet.groups) {
      for (const row of group.rows) {
        if (row.lineId) {
          next[row.lineId] = row.price ?? "";
        }
      }
    }
    setPriceDrafts(next);
  }, [sheet]);

  const totalUnits = useMemo(
    () => sheet.groups.reduce((acc, g) => acc + g.rows.reduce((s, r) => s + r.qty, 0), 0),
    [sheet.groups]
  );

  useEffect(() => {
    const initial: Record<number, boolean> = {};
    sheet.groups.forEach((_, i) => {
      initial[i] = true;
    });
    setOpenGroups(initial);
  }, [sheet.groups]);

  useEffect(() => {
    if (!highlightLineId) return;
    const groupIndex = sheet.groups.findIndex((g) =>
      g.rows.some((r) => r.lineId === highlightLineId)
    );
    if (groupIndex >= 0) {
      setOpenGroups((prev) => ({ ...prev, [groupIndex]: true }));
      setHeaderOpen(false);
      requestAnimationFrame(() => {
        const el = document.getElementById(`measurement-line-${highlightLineId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [highlightLineId, sheet.groups]);

  const priceDirty = useMemo(() => {
    if (!canEditPrices) return false;
    for (const group of sheet.groups) {
      for (const row of group.rows) {
        if (!row.lineId) continue;
        const draft = priceDrafts[row.lineId] ?? "";
        const saved = row.price ?? "";
        if (draft.trim() !== saved.trim()) return true;
      }
    }
    return false;
  }, [canEditPrices, sheet.groups, priceDrafts]);

  const handleSavePrices = useCallback(async () => {
    if (!canEditPrices || !sheet.sheetId) return;
    setSavingPrices(true);
    try {
      const updates = Object.entries(priceDrafts)
        .filter(([lineId]) => lineId)
        .map(([lineId, price]) => ({ lineId, price }));
      const result = await updateMeasurementSheetPricesAction(sheet.sheetId, updates);
      if (!result.success) {
        toast.error("Erro ao guardar", result.error || "Não foi possível guardar os preços.");
        return;
      }
      toast.success("Preços guardados", "Os valores foram atualizados na ficha.");
      onPricesSaved?.();
    } catch (e: unknown) {
      toast.error("Erro ao guardar", toUserMessage(e, "Não foi possível guardar os preços."));
    } finally {
      setSavingPrices(false);
    }
  }, [canEditPrices, sheet.sheetId, priceDrafts, toast, onPricesSaved]);

  const handleExport = useCallback(
    async (format: "xlsx" | "pdf") => {
      setExporting(format);
      try {
        await downloadExport(exportOpportunityId, format);
        toast.success(
          format === "xlsx" ? "Excel gerado" : "PDF gerado",
          "O ficheiro foi descarregado."
        );
      } catch (e: unknown) {
        toast.error("Erro na exportação", toUserMessage(e, "Não foi possível exportar."));
      } finally {
        setExporting(null);
      }
    },
    [exportOpportunityId, toast]
  );

  return (
    <div className={adminFullBleedShell.content}>
      <Panel className="overflow-hidden p-0">
        <button
          type="button"
          className="flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setHeaderOpen((v) => !v)}
          aria-expanded={headerOpen}
        >
          <span className="text-sm font-black text-foreground">Resumo da ficha</span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 transition-transform ${headerOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {headerOpen ? (
          <dl className="grid grid-cols-1 gap-3 border-t border-border px-4 py-4 sm:grid-cols-2">
            <div>
              <dt className="ds-kicker">Cliente</dt>
              <dd className="text-sm font-bold">{sheet.clientName}</dd>
            </div>
            {sheet.nsi ? (
              <div>
                <dt className="ds-kicker">NSI</dt>
                <dd className="text-sm font-bold">{sheet.nsi}</dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="ds-kicker">Morada</dt>
              <dd className="text-sm font-bold">{sheet.address}</dd>
            </div>
            {sheet.serviceLabel ? (
              <div>
                <dt className="ds-kicker">Serviço</dt>
                <dd className="text-sm font-bold">{sheet.serviceLabel}</dd>
              </div>
            ) : null}
            {sheet.technicianName ? (
              <div>
                <dt className="ds-kicker">Técnico</dt>
                <dd className="text-sm font-bold">{sheet.technicianName}</dd>
              </div>
            ) : null}
            {sheet.visitDateIso ? (
              <div>
                <dt className="ds-kicker">Data da visita</dt>
                <dd className="text-sm font-bold">
                  {new Date(sheet.visitDateIso).toLocaleString("pt-PT")}
                </dd>
              </div>
            ) : null}
            {sheet.version ? (
              <div>
                <dt className="ds-kicker">Versão</dt>
                <dd className="text-sm font-bold">v{sheet.version}</dd>
              </div>
            ) : null}
            <div>
              <dt className="ds-kicker">Produtos / unidades</dt>
              <dd className="text-sm font-bold">
                {sheet.groups.length} · {totalUnits}
              </dd>
            </div>
          </dl>
        ) : null}
      </Panel>

      {versionOptions && versionOptions.length > 1 && onSelectVersion ? (
        <div className="flex flex-wrap gap-2">
          {versionOptions.map((opt) => (
            <button
              key={opt.version}
              type="button"
              onClick={() => onSelectVersion(opt.version)}
              className={`min-h-10 rounded-xl border-2 px-3 py-2 text-xs font-black uppercase tracking-wider ${
                sheet.version === opt.version
                  ? "border-primary-ink bg-primary-surface text-primary-ink"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {canEditPrices && sheet.sheetId ? (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">
            Preços (€) — só operadores com acesso ao painel. O técnico não vê nem altera estes valores no
            telemóvel.
          </p>
          {priceDirty ? (
            <button
              type="button"
              onClick={() => void handleSavePrices()}
              disabled={savingPrices}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-ink bg-primary-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-ink disabled:opacity-50"
            >
              {savingPrices ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Guardar preços
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleExport("xlsx")}
          disabled={exporting !== null}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-success-border bg-success-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-success-fg disabled:opacity-50"
        >
          {exporting === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Excel
        </button>
        <button
          type="button"
          onClick={() => void handleExport("pdf")}
          disabled={exporting !== null}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-muted px-4 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
        >
          {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          PDF
        </button>
      </div>

      <div className="space-y-3">
        {sheet.groups.map((group, gi) => {
          const detailEntries = getMeasurementGroupDetailEntries(group);
          const { gridEntries, observations } =
            partitionMeasurementGroupDetailEntries(detailEntries);
          const showOpeningCol = groupShowsOpeningDimensions(group);
          const showNotesCol = groupShowsLineNotesColumn(group);
          const isOpen = openGroups[gi] ?? true;
          return (
            <Panel key={`${group.productType}-${gi}`} className="overflow-hidden p-0">
              <button
                type="button"
                className="flex w-full min-h-12 items-center justify-between gap-2 px-4 py-3 text-left"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [gi]: !isOpen }))}
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
                          <dt className="text-xs font-bold text-muted-foreground">
                            {detail.label}
                          </dt>
                          <dd className="text-xs font-bold">{detail.value}</dd>
                        </div>
                      ))}
                      {observations ? (
                        <div key={observations.label} className="sm:col-span-2">
                          <dt className="text-xs font-bold text-muted-foreground">
                            {observations.label}
                          </dt>
                          <dd className="text-xs font-bold whitespace-pre-wrap">{observations.value}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="px-2 py-1.5 font-black">#</th>
                          <th className="px-2 py-1.5 font-black">Divisão</th>
                          <th className="px-2 py-1.5 font-black">Qtd</th>
                          <th className="px-2 py-1.5 font-black">L×A estore</th>
                          {showOpeningCol ? (
                            <>
                              <th className="px-2 py-1.5 font-black">L×A vão</th>
                              <th className="px-2 py-1.5 font-black">Resumo (vão + estore)</th>
                            </>
                          ) : null}
                          <th className="px-2 py-1.5 font-black">Fix.</th>
                          <th className="px-2 py-1.5 font-black">Cmd.</th>
                          {showNotesCol ? (
                            <th className="px-2 py-1.5 font-black">Notas</th>
                          ) : null}
                          <th className="px-2 py-1.5 font-black">Preço</th>
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
                            <td className="px-2 py-1.5 font-bold">{row.index}</td>
                            <td className="px-2 py-1.5">{row.division || "—"}</td>
                            <td className="px-2 py-1.5 ds-num">{row.qty}</td>
                            <td className="px-2 py-1.5 ds-num whitespace-nowrap">
                              {row.widthMm}×{row.heightMm}
                            </td>
                            {showOpeningCol ? (
                              <>
                                <td className="px-2 py-1.5 ds-num whitespace-nowrap">
                                  {formatMeasurementLxAMm(row.openingWidthMm, row.openingHeightMm)}
                                </td>
                                <td className="px-2 py-1.5 text-xs leading-snug">
                                  {row.openingDimensionLabel || "—"}
                                </td>
                              </>
                            ) : null}
                            <td className="px-2 py-1.5">{row.fixation || "—"}</td>
                            <td className="px-2 py-1.5">{row.controls || "—"}</td>
                            {showNotesCol ? (
                              <td className="px-2 py-1.5">{row.notes || "—"}</td>
                            ) : null}
                            <td className="px-2 py-1.5">
                              {canEditPrices && row.lineId ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full min-w-[4.5rem] rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold"
                                  value={priceDrafts[row.lineId] ?? ""}
                                  placeholder="—"
                                  onChange={(e) =>
                                    setPriceDrafts((prev) => ({
                                      ...prev,
                                      [row.lineId!]: e.target.value,
                                    }))
                                  }
                                  aria-label={`Preço linha ${row.index}`}
                                />
                              ) : (
                                formatMeasurementPriceDisplay(row.price) || "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
