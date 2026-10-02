"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  History,
  Calendar as CalendarIcon,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSync } from "@/hooks/useSync";
import { normalizeOpportunityList } from "@/lib/admin/opportunityNormalizers";
import { isTaskCompleted } from "@/lib/crm/contract";
import type { Opportunity } from "@/types/admin";
import { NOT_AVAILABLE_LABEL } from "@/lib/ui/ptPtDisplay";

interface HistoryPageData {
  items: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { completed: number; incomplete: number; cancelled: number };
}

export interface AdminHistoryViewProps {
  onSelectOpportunity: (opp: Opportunity) => void;
}

export default function AdminHistoryView({ onSelectOpportunity }: AdminHistoryViewProps) {
  const [historyPage, setHistoryPage] = useState(1);

  const { data: historyData, isLoading: loadingHistory } = useSync<HistoryPageData>(
    `/api/opportunities/history?page=${historyPage}`
  );

  const historyOpportunities = useMemo<Opportunity[]>(
    () => normalizeOpportunityList(historyData?.items ?? []),
    [historyData]
  );

  return (
    <div
      className="h-full flex flex-col bg-muted overflow-hidden animate-in fade-in duration-500"
      data-tour="admin-history"
    >
      <div className="shrink-0 flex flex-col gap-3 border-b border-border bg-card p-4 md:flex-row md:items-center md:justify-between lg:gap-4 lg:p-5">
        <div className="min-w-0">
          <h2 className="ds-title text-xl tracking-tighter text-foreground lg:text-2xl">
            Histórico de Intervenções
          </h2>
          <p className="mt-0.5 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground lg:text-xs lg:tracking-[0.2em]">
            Registo Geral de Serviços Concluídos, Cancelados e Incompletos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3">
          <div className="px-4 py-2 bg-success-surface rounded-2xl border border-success-border flex items-center gap-2.5">
            <div className="w-2 h-2 bg-success-solid rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase text-success-fg">
              {historyData?.summary.completed ?? 0} Concluídos
            </span>
          </div>
          <div className="px-4 py-2 bg-warning-surface rounded-2xl border border-warning-border flex items-center gap-2.5">
            <div className="w-2 h-2 bg-warning-solid rounded-full" />
            <span className="text-xs font-black uppercase text-warning-solid">
              {historyData?.summary.incomplete ?? 0} Incompletos
            </span>
          </div>
          <div className="px-4 py-2 bg-danger-surface rounded-2xl border border-danger-border flex items-center gap-2.5">
            <div className="w-2 h-2 bg-danger-solid rounded-full" />
            <span className="text-xs font-black uppercase text-danger-fg">
              {historyData?.summary.cancelled ?? 0} Cancelados
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-6">
        {loadingHistory && (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loadingHistory && historyOpportunities.length > 0 && (
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          {historyOpportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity(opp)}
              className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-success-border hover:shadow-md lg:rounded-[1.5rem] lg:p-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner lg:h-12 lg:w-12 lg:rounded-2xl ${
                    isTaskCompleted(opp.taskStatus || opp.status)
                      ? "bg-success-surface text-success-solid"
                      : opp.status === "Cancelado" || opp.status === "CANCELADO"
                        ? "bg-danger-surface text-danger-solid"
                        : "bg-warning-surface text-warning-solid"
                  }`}
                >
                  {isTaskCompleted(opp.taskStatus || opp.status) ? (
                    <CheckCircle className="h-6 w-6 lg:h-7 lg:w-7" />
                  ) : (
                    <AlertCircle className="h-6 w-6 lg:h-7 lg:w-7" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="ds-title truncate text-base tracking-tighter text-foreground transition-colors group-hover:text-success-solid lg:text-lg">
                      {opp.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-widest lg:px-2.5 lg:py-1 lg:text-xs ${
                        isTaskCompleted(opp.taskStatus || opp.status)
                          ? "bg-success-solid text-ink-foreground"
                          : opp.status === "Cancelado" || opp.status === "CANCELADO"
                            ? "bg-danger-solid text-ink-foreground"
                            : "bg-warning-solid text-ink-foreground"
                      }`}
                    >
                      {opp.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:text-xs">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3" /> {opp.technician}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(opp.scheduledAt || opp.dueDate || 0).toLocaleDateString("pt-PT")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {opp.addressCity || NOT_AVAILABLE_LABEL}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="min-h-10 w-full rounded-lg bg-muted px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all group-hover:bg-ink group-hover:text-ink-foreground lg:min-h-9 lg:w-auto lg:self-end lg:px-5"
              >
                Ver Detalhes
              </button>
            </div>
          ))}
          </div>
        )}

        {!loadingHistory && historyOpportunities.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center bg-card rounded-[3rem] border-2 border-dashed border-border">
            <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-black text-xs uppercase tracking-[0.2em]">
              Sem registos históricos no período atual
            </p>
          </div>
        )}

        {!loadingHistory && (historyData?.totalPages ?? 0) > 1 && (
          <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-border pt-4 lg:col-span-2">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Página {historyData?.page ?? 1} de {historyData?.totalPages ?? 1} ·{" "}
              {historyData?.total ?? 0} registos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                type="button"
                disabled={historyPage >= (historyData?.totalPages ?? 1)}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                Seguinte <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
