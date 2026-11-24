"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileText, Loader2 } from "lucide-react";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { useToast } from "@/components/ui/ToastContext";
import { toUserMessage } from "@/lib/userMessages";
import { Panel } from "@/components/ui/Panel";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";
import { formatMeasurementVersionStamp } from "@/lib/measurements/versionStamp";
import { updateMeasurementSheetPricesAction } from "@/actions/measurements-actions";
import { AdminMeasurementRevision } from "@/components/features/measurements/AdminMeasurementRevision";
import { MeasurementSheetClientContact } from "@/components/features/measurements/MeasurementSheetClientContact";
import { MeasurementSheetPriceBar } from "@/components/features/measurements/MeasurementSheetPriceBar";
import { MeasurementSheetGroupPanels } from "@/components/features/measurements/MeasurementSheetGroupPanels";
import { useMeasurementSheetPriceDirtyGuard } from "@/hooks/useMeasurementSheetPriceDirtyGuard";

type Props = {
  sheet: MeasurementSheet;
  highlightLineId?: string;
  exportOpportunityId: string;
  versionOptions?: Array<{ sheetId: string; version: number; label: string }>;
  onSelectVersion?: (version: number) => void;
  /** Operador admin/member/ceo — edita preços na ficha. */
  canEditPrices?: boolean;
  onPricesSaved?: () => void;
  onPriceDirtyChange?: (dirty: boolean) => void;
  /** Quando true, o padding exterior fica a cargo da página (scroll no main). */
  embedded?: boolean;
  /** Telemóvel: linhas em cartões, sem Excel/PDF nem coluna de preço. */
  phoneLayout?: boolean;
};

type ExportKind = "xlsx" | "pdf" | "pdf-portrait";

async function downloadExport(
  opportunityId: string,
  format: ExportKind,
  version?: number | null
) {
  const layout = format === "pdf-portrait" ? "portrait" : "landscape";
  const fileFormat = format === "xlsx" ? "xlsx" : "pdf";
  const versionQuery =
    version != null && version > 0 ? `&version=${encodeURIComponent(String(version))}` : "";
  const res = await fetch(
    `/api/opportunities/${encodeURIComponent(opportunityId)}/measurements/export?format=${fileFormat}&layout=${layout}${versionQuery}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Falha ao exportar (${res.status}).`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `Medicoes.${fileFormat}`;
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
  onPriceDirtyChange,
  embedded = false,
  phoneLayout = false,
}: Props) {
  const toast = useToast();
  const [headerOpen, setHeaderOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [editingMeasurements, setEditingMeasurements] = useState(false);

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
      initial[i] = phoneLayout ? i === 0 : true;
    });
    setOpenGroups(initial);
  }, [sheet.groups, phoneLayout]);

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

  const isLatestVersion = useMemo(() => {
    if (!versionOptions?.length || sheet.version == null) return true;
    return sheet.version >= Math.max(...versionOptions.map((opt) => opt.version));
  }, [sheet.version, versionOptions]);

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

  const { confirmDiscard } = useMeasurementSheetPriceDirtyGuard(priceDirty);

  useEffect(() => {
    onPriceDirtyChange?.(priceDirty);
  }, [priceDirty, onPriceDirtyChange]);

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
    async (format: ExportKind) => {
      if (!(await confirmDiscard())) return;
      setExporting(format);
      try {
        await downloadExport(exportOpportunityId, format, sheet.version);
        const title =
          format === "xlsx"
            ? "Excel gerado"
            : format === "pdf-portrait"
              ? "PDF vertical gerado"
              : "PDF horizontal gerado";
        toast.success(title, "O ficheiro foi descarregado.");
      } catch (e: unknown) {
        toast.error("Erro na exportação", toUserMessage(e, "Não foi possível exportar."));
      } finally {
        setExporting(null);
      }
    },
    [confirmDiscard, exportOpportunityId, sheet.version, toast]
  );

  const handleSelectVersionGuarded = useCallback(
    async (nextVersion: number) => {
      if (!onSelectVersion) return;
      if (!(await confirmDiscard())) return;
      onSelectVersion(nextVersion);
    },
    [confirmDiscard, onSelectVersion]
  );

  const startEditMeasurements = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    setEditingMeasurements(true);
  }, [confirmDiscard]);

  const showPriceBar = canEditPrices && !phoneLayout && !editingMeasurements;

  return (
    <div
      className={`${embedded ? "flex w-full flex-col gap-5" : adminFullBleedShell.content} ${
        priceDirty && showPriceBar ? "pb-28" : ""
      }`}
    >
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
          <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-4 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0 lg:order-1">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                Serviço e ficha
              </h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sheet.serviceNumber ? (
                  <div>
                    <dt className="ds-kicker">N.º serviço</dt>
                    <dd className="ds-num text-sm font-bold">{sheet.serviceNumber}</dd>
                  </div>
                ) : null}
                {sheet.nsi ? (
                  <div>
                    <dt className="ds-kicker">NSI</dt>
                    <dd className="ds-num text-sm font-bold">{sheet.nsi}</dd>
                  </div>
                ) : null}
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
                {sheet.recordedAtIso ? (
                  <div>
                    <dt className="ds-kicker">Nesta versão</dt>
                    <dd className="text-sm font-bold">
                      {formatMeasurementVersionStamp(sheet.recordedAtIso)}
                    </dd>
                  </div>
                ) : null}
                {sheet.visitDateIso ? (
                  <div>
                    <dt className="ds-kicker">Visita marcada</dt>
                    <dd className="text-sm font-bold">
                      {formatMeasurementVersionStamp(sheet.visitDateIso)}
                    </dd>
                  </div>
                ) : null}
                {sheet.remeasureLabel?.trim() ? (
                  <div className="sm:col-span-2">
                    <dt className="ds-kicker">Medidas Retificadas</dt>
                    <dd className="text-sm font-bold">{sheet.remeasureLabel}</dd>
                  </div>
                ) : null}
                {sheet.version ? (
                  <div>
                    <dt className="ds-kicker">Versão</dt>
                    <dd className="text-sm font-bold">
                      v{sheet.version}
                      {sheet.editedByName?.trim() ? ` · Editado por ${sheet.editedByName.trim()}` : ""}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="ds-kicker">Produtos / unidades</dt>
                  <dd className="text-sm font-bold">
                    {sheet.groups.length} · {totalUnits}
                  </dd>
                </div>
              </dl>
            </div>
            <MeasurementSheetClientContact sheet={sheet} />
          </div>
        ) : null}
      </Panel>

      {versionOptions && versionOptions.length > 1 && onSelectVersion ? (
        <div className={phoneLayout ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-wrap gap-2"}>
          {versionOptions.map((opt) => (
            <button
              key={opt.version}
              type="button"
              onClick={() => void handleSelectVersionGuarded(opt.version)}
              className={`min-h-12 shrink-0 rounded-xl border-2 px-3 py-2 text-left text-xs font-bold ${
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

      {canEditPrices && sheet.sheetId && !phoneLayout ? (
        <p className="text-xs font-bold text-muted-foreground">
          Preços (€) — só operadores com acesso ao painel. O técnico não vê nem altera estes valores no
          telemóvel.
        </p>
      ) : null}

      {canEditPrices && isLatestVersion && !phoneLayout ? (
        editingMeasurements ? (
          <AdminMeasurementRevision
            opportunityId={exportOpportunityId}
            clientName={sheet.clientName}
            onCancel={() => setEditingMeasurements(false)}
            onSaved={() => {
              setEditingMeasurements(false);
              onPricesSaved?.();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => void startEditMeasurements()}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border-strong bg-card px-4 text-sm font-black text-foreground"
          >
            Editar medições
          </button>
        )
      ) : null}

      {phoneLayout || editingMeasurements ? null : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
            PDF horizontal
          </button>
          <button
            type="button"
            onClick={() => void handleExport("pdf-portrait")}
            disabled={exporting !== null}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            {exporting === "pdf-portrait" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF vertical
          </button>
        </div>
      )}

      {editingMeasurements ? null : (
        <MeasurementSheetGroupPanels
          sheet={sheet}
          highlightLineId={highlightLineId}
          canEditPrices={canEditPrices}
          phoneLayout={phoneLayout}
          priceDrafts={priceDrafts}
          onPriceDraftChange={(lineId, value) =>
            setPriceDrafts((prev) => ({ ...prev, [lineId]: value }))
          }
          openGroups={openGroups}
          onToggleGroup={(index) => setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }))}
        />
      )}

      <MeasurementSheetPriceBar
        sheet={sheet}
        priceDrafts={priceDrafts}
        priceDirty={priceDirty}
        savingPrices={savingPrices}
        onSave={() => void handleSavePrices()}
        visible={showPriceBar}
      />
    </div>
  );
}