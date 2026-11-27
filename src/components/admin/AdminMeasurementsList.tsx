"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, MapPin, RotateCcw, Ruler, Trash2 } from "lucide-react";
import { buildAgendaNotificationDeepLink } from "@/lib/agenda/desktopNotifications";
import {
  listMeasurementSheetsAction,
  listDeletedMeasurementSheetsAction,
  deleteAdminMeasurementSheetsAction,
  deleteAdminMeasurementSheetsBulkAction,
  restoreAdminMeasurementSheetsBulkAction,
} from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { MeasurementSheetListEntry } from "@/lib/measurements/types";
import { Panel } from "@/components/ui/Panel";
import { formatMeasurementTotalPriceEur } from "@/lib/measurements/measurementPriceTotal";
import {
  filterSheetsByPrintState,
  formatMeasurementPrintLabel,
  isMeasurementSheetPrinted,
  type MeasurementPrintFilter,
} from "@/lib/measurements/printStatus";
import { appendMeasurementSheetDeParam } from "@/lib/measurements/sheetPageBack";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";
import { AdminManualMeasurementsDialog } from "@/components/admin/AdminManualMeasurementsDialog";
import {
  AdminMeasurementsListFilters,
  type MeasurementPriceFilter,
} from "@/components/admin/AdminMeasurementsListFilters";

function daysUntilPurge(deletedAt?: string | null): number | null {
  if (!deletedAt) return null;
  const end = new Date(deletedAt).getTime() + 90 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function AdminMeasurementsList() {
  const [items, setItems] = useState<MeasurementSheetListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [mode, setMode] = useState<"ativas" | "apagadas">("ativas");
  const [manualOpen, setManualOpen] = useState(false);
  const [priceFilter, setPriceFilter] = useState<MeasurementPriceFilter>("todas");
  const [printFilter, setPrintFilter] = useState<MeasurementPrintFilter>("todas");
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    const res =
      mode === "apagadas"
        ? await listDeletedMeasurementSheetsAction(term.trim() || undefined)
        : await listMeasurementSheetsAction(term.trim() || undefined);
    if (!res.success) {
      setError(res.error || "Não foi possível carregar.");
      setItems([]);
    } else {
      setItems(res.data ?? []);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const visibleItems = useMemo(() => {
    let next = items;
    if (priceFilter === "sem-preco") {
      next = next.filter((item) => item.totalPriceEur == null);
    } else if (priceFilter === "com-preco") {
      next = next.filter((item) => item.totalPriceEur != null);
    }
    return filterSheetsByPrintState(next, printFilter);
  }, [items, priceFilter, printFilter]);

  return (
    <div className={adminFullBleedShell.page}>
      <header className={adminFullBleedShell.header}>
        <div className={adminFullBleedShell.headerInner}>
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao painel
          </Link>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted">
              <Ruler className="h-6 w-6 text-primary-ink" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-black text-foreground">Medições</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Última versão por obra — para orçamentação e consulta. Os técnicos registem no terreno;
                aqui vê e abre a ficha completa. As apagadas ficam 90 dias e podem ser recuperadas.
              </p>
            </div>
          </div>
          <AdminMeasurementsListFilters
            search={search}
            onSearchChange={setSearch}
            loading={loading}
            mode={mode}
            onModeChange={(next) => {
              setMode(next);
              setSelected([]);
              setPriceFilter("todas");
              setPrintFilter("todas");
            }}
            priceFilter={priceFilter}
            onPriceFilterChange={setPriceFilter}
            printFilter={printFilter}
            onPrintFilterChange={setPrintFilter}
            onInsertClick={() => setManualOpen(true)}
          />
          <AdminManualMeasurementsDialog
            open={manualOpen}
            onClose={() => setManualOpen(false)}
            onSaved={() => void load(query)}
          />
        </div>
      </header>

      <main className={adminFullBleedShell.scrollMain} data-tour="admin-medicoes-list">
        <div className={adminFullBleedShell.content}>
        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            A carregar medições…
          </div>
        ) : null}

        {!loading && error ? (
          <Panel className="p-4">
            <p className="text-sm font-bold text-danger-fg">{error}</p>
          </Panel>
        ) : null}

        {!loading && !error && visibleItems.length === 0 ? (
          <Panel className="p-6 text-center">
            <p className="text-sm font-bold text-foreground">
              {mode === "apagadas"
                ? "Nada para recuperar."
                : priceFilter !== "todas"
                  ? "Nenhuma obra corresponde a este filtro."
                  : "Sem medições na base de dados."}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {mode === "apagadas"
                ? "As fichas apagadas ficam aqui 90 dias. Depois saem de vez."
                : priceFilter !== "todas"
                  ? "Experimente outro filtro ou limpe a pesquisa."
                  : "Quando um técnico guardar medições (online ou após sincronizar), aparecem aqui."}
            </p>
          </Panel>
        ) : null}

        {!loading && !error && visibleItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-12 items-center gap-3 text-sm font-bold text-foreground">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={visibleItems.every((item) => selected.includes(item.opportunityId))}
                  onChange={(event) => {
                    const visible = visibleItems.map((item) => item.opportunityId);
                    setSelected((current) =>
                      event.target.checked
                        ? [...new Set([...current, ...visible])]
                        : current.filter((id) => !visible.includes(id))
                    );
                  }}
                />
                Selecionar visíveis
              </label>
              <button
                type="button"
                disabled={selected.length === 0 || bulkDeleting}
                onClick={() => {
                  void (async () => {
                    const count = selected.length;
                    const restoring = mode === "apagadas";
                    const ok = await confirm({
                      title: restoring
                        ? count === 1
                          ? "Recuperar esta medição?"
                          : `Recuperar ${count} medições?`
                        : count === 1
                          ? "Apagar esta medição?"
                          : `Apagar ${count} medições?`,
                      description: restoring
                        ? "As fichas voltam à lista Ativas. Cada obra fica com uma nota no CRM, com o seu nome."
                        : "Saem da lista ativa e ficam 90 dias em Apagadas. Os produtos deste serviço no Twenty saem junto e voltam se recuperares a ficha.",
                      confirmLabel: restoring ? "Recuperar selecionadas" : "Apagar selecionadas",
                      cancelLabel: "Cancelar",
                      destructive: !restoring,
                    });
                    if (!ok) return;
                    setBulkDeleting(true);
                    const result = restoring
                      ? await restoreAdminMeasurementSheetsBulkAction(selected)
                      : await deleteAdminMeasurementSheetsBulkAction(selected);
                    setBulkDeleting(false);
                    if (!result.success || !result.data) {
                      toast.error(
                        restoring ? "Não foi possível recuperar" : "Não foi possível apagar",
                        result.error || "Tente outra vez."
                      );
                      return;
                    }
                    const done = "deleted" in result.data ? result.data.deleted : result.data.restored;
                    const { failed, notesMissed } = result.data;
                    toast.success(
                      restoring
                        ? done === 1
                          ? "1 obra recuperada"
                          : `${done} obras recuperadas`
                        : done === 1
                          ? "1 obra apagada"
                          : `${done} obras apagadas`,
                      [
                        failed > 0 ? `${failed} ficaram por tratar.` : null,
                        notesMissed > 0 ? `${notesMissed} sem nota no CRM.` : "Notas gravadas no CRM.",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    );
                    setSelected([]);
                    await load(query);
                  })();
                }}
                className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 text-sm font-black disabled:opacity-50 ${
                  mode === "apagadas"
                    ? "border-border-strong bg-primary text-primary-foreground"
                    : "border-danger-border bg-danger-surface text-danger-fg"
                }`}
              >
                {bulkDeleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : mode === "apagadas" ? (
                  <RotateCcw className="h-5 w-5" aria-hidden />
                ) : (
                  <Trash2 className="h-5 w-5" aria-hidden />
                )}
                {mode === "apagadas" ? "Recuperar selecionadas" : "Apagar selecionadas"}
                {selected.length > 0 ? ` (${selected.length})` : ""}
              </button>
            </div>
          <ul className="flex flex-col gap-3">
            {visibleItems.map((item) => {
              const checked = selected.includes(item.opportunityId);
              return (
              <li
                key={item.sheetId}
                className={`rounded-2xl border-2 bg-card p-4 ${checked ? "border-primary" : "border-border"}`}
              >
                <div className="flex items-start gap-2">
                <label className="flex min-h-12 min-w-12 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={checked}
                    aria-label={`Selecionar ${item.clientName}`}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(item.opportunityId)
                          ? current.filter((id) => id !== item.opportunityId)
                          : [...current, item.opportunityId]
                      )
                    }
                  />
                </label>
                <Link
                  href={
                    mode === "ativas"
                      ? appendMeasurementSheetDeParam(`/medicoes/${item.sheetId}`, "lista")
                      : "/admin/medicoes"
                  }
                  onClick={(event) => {
                    if (mode === "apagadas") event.preventDefault();
                  }}
                  className="block min-w-0 flex-1 transition-colors active:scale-[0.99]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-black text-foreground">
                        <span className="truncate">{item.clientName}</span>
                        {mode === "ativas" ? (
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-xs font-black ${
                              isMeasurementSheetPrinted(item.printedAt)
                                ? "border-success-border bg-success-surface text-success-fg"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            {isMeasurementSheetPrinted(item.printedAt) ? "Impressa" : "Por imprimir"}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground">
                        {item.nsi ? `NSI ${item.nsi}` : "Sem NSI"} · v{item.version}
                        {item.deletedAt
                          ? ` · ${daysUntilPurge(item.deletedAt)} dias para apagar de vez${
                              item.deletedByName ? ` · ${item.deletedByName}` : ""
                            }`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground line-clamp-2">
                        {item.address}
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Técnico
                      </dt>
                      <dd className="font-bold">{item.technicianName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Registo
                      </dt>
                      <dd className="font-bold">
                        {new Date(item.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Produtos
                      </dt>
                      <dd className="font-bold">{item.groupCount}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Unidades
                      </dt>
                      <dd className="font-bold">{item.unitCount}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Impressão
                      </dt>
                      <dd className="font-bold">
                        {formatMeasurementPrintLabel(item.printedAt, item.printedByName)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Preço total
                      </dt>
                      <dd className="font-bold text-primary-ink">
                        {item.totalPriceEur != null
                          ? formatMeasurementTotalPriceEur(item.totalPriceEur)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </Link>
                {mode === "ativas" ? (
                  <Link
                    href={buildAgendaNotificationDeepLink("admin", {
                      opportunityId: item.opportunityId,
                    })}
                    className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-card text-primary-ink transition-colors hover:border-primary"
                    aria-label={`Abrir obra de ${item.clientName} no painel`}
                    title="Abrir obra no painel"
                  >
                    <MapPin className="h-5 w-5" aria-hidden />
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={deletingId === item.opportunityId || bulkDeleting}
                  aria-label={
                    mode === "apagadas"
                      ? `Recuperar medições de ${item.clientName}`
                      : `Apagar medições de ${item.clientName}`
                  }
                  onClick={() => {
                    void (async () => {
                      const restoring = mode === "apagadas";
                      const ok = await confirm({
                        title: restoring ? "Recuperar estas medições?" : "Apagar estas medições?",
                        description: restoring
                          ? `A ficha de ${item.clientName} volta à lista Ativas. Fica uma nota no CRM com o seu nome.`
                          : `A ficha de ${item.clientName} fica 90 dias em Apagadas. Os produtos deste serviço no Twenty saem junto e voltam ao recuperar.`,
                        confirmLabel: restoring ? "Recuperar" : "Apagar medições",
                        cancelLabel: "Cancelar",
                        destructive: !restoring,
                      });
                      if (!ok) return;
                      setDeletingId(item.opportunityId);
                      const result = restoring
                        ? await restoreAdminMeasurementSheetsBulkAction([item.opportunityId])
                        : await deleteAdminMeasurementSheetsAction(item.opportunityId);
                      setDeletingId(null);
                      if (!result.success) {
                        toast.error(
                          mode === "apagadas" ? "Não foi possível recuperar" : "Não foi possível apagar",
                          result.error || "Tente outra vez."
                        );
                        return;
                      }
                      toast.success(
                        mode === "apagadas" ? "Medições recuperadas" : "Medições apagadas",
                        mode === "apagadas"
                          ? "A ficha voltou à lista Ativas."
                          : "Fica 90 dias em Apagadas. A nota ficou no CRM."
                      );
                      await load(query);
                    })();
                  }}
                  className={`flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 disabled:opacity-50 ${
                    mode === "apagadas"
                      ? "border-border-strong bg-primary text-primary-foreground"
                      : "border-danger-border bg-danger-surface text-danger-fg"
                  }`}
                >
                  {deletingId === item.opportunityId ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : mode === "apagadas" ? (
                    <RotateCcw className="h-5 w-5" aria-hidden />
                  ) : (
                    <Trash2 className="h-5 w-5" aria-hidden />
                  )}
                </button>
                </div>
              </li>
              );
            })}
          </ul>
          </div>
        ) : null}
        </div>
      </main>
    </div>
  );
}
