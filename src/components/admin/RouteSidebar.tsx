"use client";

import { useMemo, useState } from "react";
import {
  Navigation,
  Loader2,
  X,
  ListOrdered,
  Euro,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { RouteStop, RouteData } from "@/types/admin";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import { cn } from "@/lib/cn";
import { RouteFuelInputs } from "@/components/admin/route/RouteFuelInputs";
import { RouteStopsList } from "@/components/admin/route/RouteStopsList";
import { RouteCostsTab } from "@/components/admin/route/RouteCostsTab";
import { buildRouteStopRows, formatDurationMinutes } from "@/components/admin/route/routeSidebarUtils";

type RouteTab = "paragens" | "custos";

interface RouteSidebarProps {
  selectedForRoute: RouteStop[];
  toggleSelectionForRoute: (item: RouteStop) => void;
  fuelPrice: number;
  setFuelPrice: (price: number) => void;
  fuelConsumption: number;
  setFuelConsumption: (consumption: number) => void;
  tollCost: number;
  setTollCost: (cost: number) => void;
  realRouteData: RouteData | null;
  optimizedRoute: OptimizedRouteStop[] | null;
  setOptimizedRoute: (route: OptimizedRouteStop[] | null) => void;
  isOptimizing: boolean;
  calculateOptimizedRoute: () => Promise<void> | void;
  aiAnalysis: unknown;
  setAiAnalysis: (analysis: unknown) => void;
  isAiAnalyzing: boolean;
  handleAiAudit: () => Promise<void> | void;
  unoptimizedTotalDistance: number | null;
  savingRatio: number;
  routeManuallyAdjusted: boolean;
  onManualRouteReorder: (fromVisitIndex: number, toVisitIndex: number) => void;
  openMassScheduleModal: () => void | Promise<void>;
  onClosePanel?: () => void;
  onExitSelection?: () => void;
}

export default function RouteSidebar({
  selectedForRoute,
  toggleSelectionForRoute,
  fuelPrice,
  setFuelPrice,
  fuelConsumption,
  setFuelConsumption,
  tollCost,
  setTollCost,
  realRouteData,
  optimizedRoute,
  isOptimizing,
  calculateOptimizedRoute,
  aiAnalysis,
  setAiAnalysis,
  isAiAnalyzing,
  handleAiAudit,
  unoptimizedTotalDistance,
  routeManuallyAdjusted,
  onManualRouteReorder,
  openMassScheduleModal,
  onClosePanel,
  onExitSelection,
}: RouteSidebarProps) {
  const [tab, setTab] = useState<RouteTab>("paragens");

  const displayStops: (RouteStop | OptimizedRouteStop)[] = optimizedRoute ?? selectedForRoute;
  const stopCount = selectedForRoute.length;
  const step = optimizedRoute ? 3 : stopCount > 0 ? 2 : 1;

  const fuelCost = realRouteData
    ? realRouteData.distanceKm * (fuelConsumption / 100) * fuelPrice
    : 0;
  const totalCost = fuelCost + tollCost;

  const travelLabel = realRouteData
    ? formatDurationMinutes(realRouteData.durationMin)
    : "—";
  const distanceLabel = realRouteData ? `${realRouteData.distanceKm.toFixed(1)} km` : "—";

  const listItems = useMemo(
    () => buildRouteStopRows(displayStops, optimizedRoute, stopCount),
    [displayStops, optimizedRoute, stopCount]
  );

  return (
    <aside
      className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border-l border-border/90 bg-muted lg:max-w-[26rem]"
      aria-label="Planeamento do roteiro"
    >
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
              Planeamento
            </p>
            <h2 className="ds-title truncate text-sm tracking-tight text-foreground">Roteiro do dia</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onExitSelection && (
              <button
                type="button"
                onClick={onExitSelection}
                className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-black uppercase tracking-wide text-danger-solid hover:bg-danger-surface"
                title="Terminar seleção"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
            {onClosePanel && (
              <button
                type="button"
                onClick={onClosePanel}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <ol className="mt-3 flex gap-1" aria-label="Passos do roteiro">
          {[
            { n: 1, label: "Selecionar" },
            { n: 2, label: "Otimizar" },
            { n: 3, label: "Agendar" },
          ].map(({ n, label }) => (
            <li
              key={n}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center text-xs font-black uppercase tracking-wide",
                step === n
                  ? "bg-primary/20 text-primary-ink"
                  : step > n
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        {stopCount > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted p-2 text-center">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Paragens</p>
              <p className="text-sm font-black text-foreground">{stopCount}</p>
            </div>
            <div className="border-x border-border">
              <p className="text-xs font-bold uppercase text-muted-foreground">Distância</p>
              <p className="text-sm font-black text-foreground">{distanceLabel}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Viagem</p>
              <p className="text-sm font-black text-foreground">{travelLabel}</p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-border bg-muted/80 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Parâmetros de combustível
          </p>
          <RouteFuelInputs
            fuelPrice={fuelPrice}
            setFuelPrice={setFuelPrice}
            fuelConsumption={fuelConsumption}
            setFuelConsumption={setFuelConsumption}
            tollCost={tollCost}
            setTollCost={setTollCost}
            realRouteData={realRouteData}
          />
        </div>
      </header>

      <div className="flex shrink-0 gap-1 border-b border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={() => setTab("paragens")}
          className={cn(
            "flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase tracking-wide",
            tab === "paragens" ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          Paragens
        </button>
        <button
          type="button"
          onClick={() => setTab("custos")}
          disabled={stopCount === 0}
          className={cn(
            "flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase tracking-wide disabled:opacity-40",
            tab === "custos" ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Euro className="h-3.5 w-3.5" />
          Custos
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {tab === "paragens" && (
          <RouteStopsList
            stopCount={stopCount}
            listItems={listItems}
            optimizedRoute={optimizedRoute}
            routeManuallyAdjusted={routeManuallyAdjusted}
            onManualRouteReorder={onManualRouteReorder}
            toggleSelectionForRoute={toggleSelectionForRoute}
          />
        )}

        {tab === "custos" && stopCount > 0 && (
          <RouteCostsTab
            fuelCost={fuelCost}
            tollCost={tollCost}
            totalCost={totalCost}
            travelLabel={travelLabel}
            stopCount={stopCount}
            fuelConsumption={fuelConsumption}
            fuelPrice={fuelPrice}
            unoptimizedTotalDistance={unoptimizedTotalDistance}
            realRouteData={realRouteData}
            optimizedRoute={optimizedRoute}
            aiAnalysis={aiAnalysis}
            setAiAnalysis={setAiAnalysis}
            isAiAnalyzing={isAiAnalyzing}
            handleAiAudit={handleAiAudit}
          />
        )}
      </div>

      <footer className="shrink-0 space-y-2 border-t border-border bg-card p-3" data-tour="admin-route-actions">
        {!optimizedRoute ? (
          <button
            type="button"
            disabled={stopCount < 1 || isOptimizing}
            onClick={() => {
              calculateOptimizedRoute();
              setTab("custos");
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black uppercase tracking-wide text-foreground disabled:opacity-40"
          >
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {stopCount <= 1 ? "Calcular rota" : "Otimizar paragens"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                calculateOptimizedRoute();
                setTab("custos");
              }}
              className="min-h-12 flex-1 rounded-xl border border-border text-xs font-black uppercase text-muted-foreground"
            >
              Otimizar outra vez
            </button>
            <button
              type="button"
              onClick={() => openMassScheduleModal()}
              className="flex min-h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-black uppercase text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              Agendar
            </button>
          </div>
        )}

        {onClosePanel && (
          <button
            type="button"
            onClick={onClosePanel}
            className="min-h-10 w-full text-xs font-black uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Voltar ao mapa
          </button>
        )}
      </footer>
    </aside>
  );
}