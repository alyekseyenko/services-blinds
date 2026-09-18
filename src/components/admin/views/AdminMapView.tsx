"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";
import RouteSidebar from "@/components/admin/RouteSidebar";
import { Sheet } from "@/components/ui/Sheet";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";
import type { HqLocation } from "@/lib/hq";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { MapCategoryFilter, Opportunity, RouteData, RouteStop } from "@/types/admin";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export interface AdminMapViewProps {
  hqLocation: HqLocation;
  mapOpportunities: Opportunity[];
  allOpportunities: Opportunity[];
  categoryFilter: MapCategoryFilter;
  setCategoryFilter: (filter: MapCategoryFilter) => void;
  techniciansLocations: TechnicianLocation[];
  routeSelectionMode: boolean;
  selectedForRoute: RouteStop[];
  onTaskSelect: (opp: Opportunity) => void;
  optimizedRoute: OptimizedRouteStop[] | null;
  fuelPrice: number;
  setFuelPrice: (price: number) => void;
  fuelConsumption: number;
  setFuelConsumption: (consumption: number) => void;
  tollCost: number;
  setTollCost: (cost: number) => void;
  realRouteData: RouteData | null;
  setRealRouteData: (data: RouteData | null) => void;
  savingRatio: number;
  setUnoptimizedTotalDistance: (distance: number | null) => void;
  setOptimizedRoute: (route: OptimizedRouteStop[] | null) => void;
  isOptimizing: boolean;
  calculateOptimizedRoute: () => void;
  toggleSelectionForRoute: (item: RouteStop) => void;
  aiAnalysis: unknown;
  setAiAnalysis: (analysis: unknown) => void;
  isAiAnalyzing: boolean;
  handleAiAudit: () => void;
  unoptimizedTotalDistance: number | null;
  showRouteSheet: boolean;
  setShowRouteSheet: (open: boolean) => void;
  setShowMassScheduleModal: (open: boolean) => void;
}

export default function AdminMapView({
  hqLocation,
  mapOpportunities,
  allOpportunities,
  categoryFilter,
  setCategoryFilter,
  techniciansLocations,
  routeSelectionMode,
  selectedForRoute,
  onTaskSelect,
  optimizedRoute,
  fuelPrice,
  setFuelPrice,
  fuelConsumption,
  setFuelConsumption,
  tollCost,
  setTollCost,
  realRouteData,
  setRealRouteData,
  savingRatio,
  setUnoptimizedTotalDistance,
  setOptimizedRoute,
  isOptimizing,
  calculateOptimizedRoute,
  toggleSelectionForRoute,
  aiAnalysis,
  setAiAnalysis,
  isAiAnalyzing,
  handleAiAudit,
  unoptimizedTotalDistance,
  showRouteSheet,
  setShowRouteSheet,
  setShowMassScheduleModal,
}: AdminMapViewProps) {
  const routeSidebarProps = {
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
    setOptimizedRoute,
    isOptimizing,
    calculateOptimizedRoute,
    aiAnalysis,
    setAiAnalysis,
    isAiAnalyzing,
    handleAiAudit,
    unoptimizedTotalDistance,
    savingRatio,
    setShowMassScheduleModal,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="relative min-h-[50vh] flex-1 lg:min-h-0">
          <MapComponent
            tasks={mapOpportunities}
            allOpportunities={allOpportunities}
            onTaskSelect={onTaskSelect}
            showTechnicianColors={true}
            highlightedIds={selectedForRoute.map((s) => s.id)}
            hqLocation={hqLocation}
            optimizedRoute={optimizedRoute}
            fuelPrice={fuelPrice}
            fuelConsumption={fuelConsumption}
            techniciansLocations={techniciansLocations}
            onRouteUpdate={(data) => {
              setRealRouteData(data);
              setUnoptimizedTotalDistance(
                data && savingRatio > 1 ? data.distanceKm * savingRatio : null
              );
            }}
          />

          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <div className="flex bg-white/95 backdrop-blur shadow-2xl rounded-2xl border border-slate-200/80 p-1.5 gap-1.5 transition-all">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`flex min-h-12 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  categoryFilter === "all"
                    ? "bg-[#090d16] text-[#84cc16] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("medicoes")}
                className={`flex min-h-12 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  categoryFilter === "medicoes"
                    ? "bg-[#84cc16] text-[#090d16] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Medições
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("instalacoes")}
                className={`flex min-h-12 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  categoryFilter === "instalacoes"
                    ? "bg-blue-600 text-white shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Instalações
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("assistencia")}
                className={`flex min-h-12 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  categoryFilter === "assistencia"
                    ? "bg-orange-600 text-white shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Assistência
              </button>
            </div>

            {techniciansLocations.length > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#84cc16]/40 bg-[#090d16]/90 px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xl backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
                <span className="text-[#84cc16]">{techniciansLocations.length}</span>
                <span>
                  {techniciansLocations.length === 1
                    ? "Técnico em Campo"
                    : "Técnicos em Campo"}
                </span>
              </div>
            )}
          </div>

          {routeSelectionMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl font-bold animate-pulse z-10 border-2 border-white text-xs">
              Modo de Seleção Ativo
            </div>
          )}
        </div>

        {routeSelectionMode && (
          <div className="hidden lg:flex lg:min-h-0 lg:shrink-0">
            <RouteSidebar {...routeSidebarProps} />
          </div>
        )}

        {routeSelectionMode && (
          <button
            type="button"
            onClick={() => setShowRouteSheet(true)}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-20 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#090d16] text-xs font-black uppercase tracking-wider text-[#84cc16] shadow-xl lg:hidden"
          >
            <Navigation className="h-5 w-5" />
            Rota ({selectedForRoute.length} paragens)
          </button>
        )}
      </div>

      <Sheet
        open={showRouteSheet}
        onClose={() => setShowRouteSheet(false)}
        title="Roteiro do dia"
        description={`${selectedForRoute.length} paragens selecionadas`}
      >
        <RouteSidebar {...routeSidebarProps} />
      </Sheet>
    </div>
  );
}
