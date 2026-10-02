"use client";

import { RefreshCw, Loader2, Search, CheckCircle, Layers, CheckSquare, Clock } from "lucide-react";
import { WarehouseFeedSkeleton } from "@/components/ui/Skeleton";
import PreparationCard from "@/components/warehouse/PreparationCard";
import type { WarehouseService, WarehouseStats } from "@/lib/warehouse/types";

export interface WarehouseDashboardViewProps {
  loading: boolean;
  isSyncing: boolean;
  syncTime: Date | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSync: () => void;
  stats: WarehouseStats;
  services: WarehouseService[];
  onComplete: (serviceId: string) => Promise<void>;
}

export default function WarehouseDashboardView({
  loading,
  isSyncing,
  syncTime,
  searchQuery,
  onSearchQueryChange,
  onSync,
  stats,
  services,
  onComplete,
}: WarehouseDashboardViewProps) {
  return (
    <main className="max-w-full mx-auto px-6 md:px-12 py-10">
      <div className="mb-10 bg-surface-card-dark/5 border border-surface-card-dark/10 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <p className="text-foreground text-sm font-semibold">
            Sincronizado em tempo real com o CRM central.
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Última atualização: {syncTime ? syncTime.toLocaleTimeString("pt-PT") : "A carregar..."}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary-ink transition-colors" />
          <input
            type="text"
            data-tour="warehouse-search"
            placeholder="Pesquisar por NSI, Nome de Cliente, Localidade ou Detalhes..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl py-4 flex pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          data-tour="warehouse-sync"
          className="px-8 py-4 bg-surface-card-dark hover:bg-ink/90 text-ink-foreground rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest active:scale-95 shadow-md"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-ink" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Sincronizar CRM
        </button>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-tour="warehouse-stats">
        <div className="brutal-panel p-8 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all group">
          <div>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-2">
              Ordens Pendentes
            </p>
            <p className="text-4xl font-black text-foreground tracking-tight group-hover:scale-105 transition-transform origin-left">
              {stats.pending}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-surface-card-dark text-ink-foreground flex items-center justify-center group-hover:text-primary-ink transition-colors">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="brutal-panel p-8 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all group">
          <div>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-2">
              Prontas para Instalação
            </p>
            <p className="text-4xl font-black text-success-solid tracking-tight group-hover:scale-105 transition-transform origin-left">
              {stats.fullyPrepared}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-surface-card-dark text-ink-foreground flex items-center justify-center group-hover:text-success-solid transition-colors">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="brutal-panel p-8 rounded-2xl flex items-center justify-between hover:border-danger-solid/30 transition-all group">
          <div>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-2">
              Com Alertas / Impedimentos
            </p>
            <p className="text-4xl font-black text-danger-solid tracking-tight group-hover:scale-105 transition-transform origin-left">
              {stats.withProblems}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-surface-card-dark text-ink-foreground flex items-center justify-center group-hover:text-danger-solid transition-colors">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {loading ? (
        <WarehouseFeedSkeleton />
      ) : services.length > 0 ? (
        <div className="grid gap-8">
          {services.map((service) => (
            <PreparationCard key={service.id} service={service} onComplete={onComplete} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-[3rem] shadow-sm">
          <div className="w-20 h-20 bg-surface-card-dark rounded-3xl flex items-center justify-center mb-6 shadow-md">
            <CheckCircle className="w-10 h-10 text-primary-ink" />
          </div>
          <h2 className="ds-title mb-2 text-2xl tracking-tight text-foreground">Tudo em Dia!</h2>
          <p className="text-muted-foreground text-sm font-semibold text-center max-w-xs leading-relaxed">
            Não existem encomendas pendentes para fabrico de momento.
          </p>
        </div>
      )}
    </main>
  );
}
