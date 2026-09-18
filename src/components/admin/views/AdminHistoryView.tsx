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
import type { Opportunity } from "@/types/admin";

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
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 md:p-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between bg-white border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
            Histórico de Intervenções
          </h2>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-600">
            Registo Geral de Serviços Concluídos, Cancelados e Incompletos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4">
          <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase text-emerald-700">
              {historyData?.summary.completed ?? 0} Concluídos
            </span>
          </div>
          <div className="px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-2.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-xs font-black uppercase text-amber-700">
              {historyData?.summary.incomplete ?? 0} Incompletos
            </span>
          </div>
          <div className="px-4 py-2 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-2.5">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-xs font-black uppercase text-red-700">
              {historyData?.summary.cancelled ?? 0} Cancelados
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {loadingHistory && (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
          </div>
        )}

        {!loadingHistory &&
          historyOpportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity(opp)}
              className="cursor-pointer rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-xl group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4 sm:items-center sm:gap-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                    opp.status === "Concluído" || opp.status === "CONCLUIDO"
                      ? "bg-emerald-50 text-emerald-500"
                      : opp.status === "Cancelado" || opp.status === "CANCELADO"
                        ? "bg-red-50 text-red-500"
                        : "bg-amber-50 text-amber-500"
                  }`}
                >
                  {opp.status === "Concluído" || opp.status === "CONCLUIDO" ? (
                    <CheckCircle className="w-7 h-7" />
                  ) : (
                    <AlertCircle className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors italic">
                      {opp.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                        opp.status === "Concluído" || opp.status === "CONCLUIDO"
                          ? "bg-emerald-500 text-white"
                          : opp.status === "Cancelado" || opp.status === "CANCELADO"
                            ? "bg-red-500 text-white"
                            : "bg-amber-500 text-white"
                      }`}
                    >
                      {opp.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3" /> {opp.technician}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(opp.scheduledAt || opp.dueDate || 0).toLocaleDateString("pt-PT")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {opp.addressCity || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="min-h-12 w-full rounded-xl bg-slate-50 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-all group-hover:bg-slate-950 group-hover:text-white sm:w-auto"
              >
                Ver Detalhes
              </button>
            </div>
          ))}

        {!loadingHistory && historyOpportunities.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <History className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em]">
              Sem registos históricos no período atual
            </p>
          </div>
        )}

        {!loadingHistory && (historyData?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Página {historyData?.page ?? 1} de {historyData?.totalPages ?? 1} ·{" "}
              {historyData?.total ?? 0} registos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                type="button"
                disabled={historyPage >= (historyData?.totalPages ?? 1)}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
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
