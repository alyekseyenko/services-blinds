"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Search, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CeoServiceItem } from "@/lib/schemas/ceoMetrics";

const PAGE_SIZE = 25;

interface CommercialServicesTableProps {
  services: CeoServiceItem[];
  totalCount: number;
  selectedYear: number | null;
  monthLabel?: string;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  stageOptions: { stage: string; label: string; count: number }[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

function amountBadge(svc: CeoServiceItem) {
  if (svc.financialStatus === "WON") {
    return (
      <span className="inline-flex items-center rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">
        {svc.formattedAmount}
      </span>
    );
  }
  if (svc.financialStatus === "LOST") {
    return (
      <span className="inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700 line-through">
        {svc.formattedAmount}
      </span>
    );
  }
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
      {svc.formattedAmount}
    </span>
  );
}

export default function CommercialServicesTable({
  services,
  totalCount,
  selectedYear,
  monthLabel,
  stageFilter,
  onStageFilterChange,
  stageOptions,
  searchQuery,
  onSearchQueryChange,
}: CommercialServicesTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(services.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [services.length, page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return services.slice(start, start + PAGE_SIZE);
  }, [services, page]);

  return (
    <div className="glass-panel-light rounded-[2.5rem] border border-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black uppercase italic tracking-tight text-[#090d16]">
            <Package className="h-5 w-5 text-blue-600" />
            Lista de Serviços ({selectedYear || "Geral"})
          </h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-600">
            A exibir {services.length} de {totalCount} serviços
            {monthLabel ? ` em ${monthLabel}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1 sm:flex-none">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar cliente, NSI ou técnico..."
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm font-medium shadow-sm focus:border-[#84cc16] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={stageFilter}
            onChange={(e) => {
              onStageFilterChange(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm focus:border-[#84cc16] focus:outline-none"
          >
            <option value="ALL">Todas as Fases</option>
            {stageOptions.map((f) => (
              <option key={f.stage} value={f.stage}>
                {f.label} ({f.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white/70 py-16 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Nenhum serviço encontrado com os filtros selecionados.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {pageItems.map((svc) => (
              <div key={svc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {svc.nsi ? <Badge variant="muted">#{svc.nsi}</Badge> : null}
                  <Badge variant="success">{svc.stageLabel}</Badge>
                </div>
                <h3 className="text-sm font-black text-slate-900">{svc.name}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {svc.serviceType || "Geral"} · {svc.technician || "Não atribuído"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {amountBadge(svc)}
                  <span className="text-xs font-medium text-slate-600">{svc.formattedDate}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3.5">NSI / Ref</th>
                  <th className="px-4 py-3.5">Cliente / Obra</th>
                  <th className="px-4 py-3.5">Tipo</th>
                  <th className="px-4 py-3.5">Fase</th>
                  <th className="px-4 py-3.5">Técnico</th>
                  <th className="px-4 py-3.5">Valor (€)</th>
                  <th className="px-4 py-3.5">Data</th>
                  <th className="px-4 py-3.5 text-center">Aval.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((svc) => (
                  <tr key={svc.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="sticky left-0 bg-white px-4 py-3 font-mono font-bold text-slate-900">
                      {svc.nsi ? <Badge variant="muted">#{svc.nsi}</Badge> : "—"}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 font-black text-slate-900">{svc.name}</td>
                    <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                      {svc.serviceType || "Geral"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">{svc.stageLabel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">
                      {svc.technician || "Não atribuído"}
                    </td>
                    <td className="px-4 py-3 font-mono">{amountBadge(svc)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{svc.formattedDate}</td>
                    <td className="px-4 py-3 text-center">
                      {svc.rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-slate-800">{svc.rating}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Página seguinte"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
