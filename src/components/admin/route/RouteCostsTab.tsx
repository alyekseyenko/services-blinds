"use client";

import { Brain, Loader2 } from "lucide-react";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { RouteData } from "@/types/admin";
import { formatDurationMinutes } from "@/components/admin/route/routeSidebarUtils";

export function RouteCostsTab(props: {
  fuelCost: number;
  tollCost: number;
  totalCost: number;
  travelLabel: string;
  stopCount: number;
  fuelConsumption: number;
  fuelPrice: number;
  unoptimizedTotalDistance: number | null;
  realRouteData: RouteData | null;
  optimizedRoute: OptimizedRouteStop[] | null;
  aiAnalysis: unknown;
  setAiAnalysis: (analysis: unknown) => void;
  isAiAnalyzing: boolean;
  handleAiAudit: () => Promise<void> | void;
}) {
  const {
    fuelCost,
    tollCost,
    totalCost,
    travelLabel,
    stopCount,
    fuelConsumption,
    fuelPrice,
    unoptimizedTotalDistance,
    realRouteData,
    optimizedRoute,
    aiAnalysis,
    setAiAnalysis,
    isAiAnalyzing,
    handleAiAudit,
  } = props;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Os valores de combustível e portagens estão no topo do painel — ajuste lá e veja o resumo abaixo.
      </p>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
        <div className="flex justify-between font-semibold text-muted-foreground">
          <span>Combustível</span>
          <span className="font-black text-foreground">{fuelCost.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-semibold text-muted-foreground">
          <span>Portagens</span>
          <span className="font-black text-foreground">{tollCost.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-black uppercase text-primary-ink">
          <span>Total operacional</span>
          <span>{totalCost.toFixed(2)} €</span>
        </div>
      </div>

      {unoptimizedTotalDistance && realRouteData && unoptimizedTotalDistance > realRouteData.distanceKm && (
        <p className="rounded-lg bg-success-surface px-3 py-2 text-xs font-semibold text-success-fg">
          Poupança estimada: {(unoptimizedTotalDistance - realRouteData.distanceKm).toFixed(1)} km (
          {(
            (unoptimizedTotalDistance - realRouteData.distanceKm) *
            (fuelConsumption / 100) *
            fuelPrice
          ).toFixed(2)}{" "}
          €)
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="font-bold uppercase text-muted-foreground">Tempo viagem</p>
          <p className="font-black text-foreground">{travelLabel}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="font-bold uppercase text-muted-foreground">Em campo (~90m/visita)</p>
          <p className="font-black text-foreground">{formatDurationMinutes(stopCount * 90)}</p>
        </div>
      </div>

      {optimizedRoute && (
        <div className="rounded-xl border border-info-border bg-info-surface/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-info-fg">
              <Brain className="h-3.5 w-3.5" />
              Auditoria IA
            </div>
            {!aiAnalysis && (
              <button
                type="button"
                onClick={handleAiAudit}
                disabled={isAiAnalyzing}
                className="rounded-lg bg-info-solid px-2 py-1 text-xs font-black uppercase text-ink-foreground"
              >
                {isAiAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Analisar"}
              </button>
            )}
          </div>
          {aiAnalysis &&
          typeof aiAnalysis === "object" &&
          aiAnalysis !== null &&
          "score" in aiAnalysis ? (
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              <p className="font-black text-info-fg">
                Pontuação {(aiAnalysis as { score: number }).score}/100
              </p>
              <p className="italic">{(aiAnalysis as { efficiency?: string }).efficiency ?? "—"}</p>
              <p className="font-semibold text-success-fg">
                {(aiAnalysis as { roi_advice?: string }).roi_advice ?? "—"}
              </p>
              <button
                type="button"
                onClick={() => setAiAnalysis(null)}
                className="text-xs font-black uppercase text-muted-foreground hover:text-muted-foreground"
              >
                Limpar
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-info-fg/80">Opcional: ROI e eficiência da rota.</p>
          )}
        </div>
      )}
    </div>
  );
}