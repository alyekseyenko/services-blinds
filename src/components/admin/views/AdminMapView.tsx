"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Filter, Navigation } from "lucide-react";
import RouteSidebar from "@/components/admin/RouteSidebar";
import { Sheet } from "@/components/ui/Sheet";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";
import type { HqLocation } from "@/lib/hq";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { MapCategoryFilter, Opportunity, RouteData, RouteStop } from "@/types/admin";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

const CATEGORY_OPTIONS: { value: MapCategoryFilter; label: string; activeClass: string }[] = [
  { value: "all", label: "Todos", activeClass: "bg-[#090d16] text-[#84cc16]" },
  { value: "medicoes", label: "Medições", activeClass: "bg-[#84cc16] text-[#090d16]" },
  { value: "instalacoes", label: "Instalações", activeClass: "bg-blue-600 text-white" },
  { value: "assistencia", label: "Assistência", activeClass: "bg-orange-600 text-white" },
];

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
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const activeCategory =
    CATEGORY_OPTIONS.find((option) => option.value === categoryFilter) ?? CATEGORY_OPTIONS[0];

  useEffect(() => {
    if (!showCategoryMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showCategoryMenu]);

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
            <div ref={categoryMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryMenu((open) => !open)}
                className={`flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur transition-all hover:bg-white ${
                  showCategoryMenu ? "ring-2 ring-[#84cc16]/40" : ""
                }`}
                aria-expanded={showCategoryMenu}
                aria-haspopup="menu"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                <span className={`rounded-lg px-2 py-1 ${activeCategory.activeClass}`}>
                  {activeCategory.label}
                </span>
              </button>

              {showCategoryMenu && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+0.5rem)] min-w-[12rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCategoryFilter(option.value);
                        setShowCategoryMenu(false);
                      }}
                      className={`flex w-full min-h-12 items-center rounded-xl px-3 py-2 text-left text-xs font-black uppercase tracking-wider transition-all ${
                        categoryFilter === option.value
                          ? option.activeClass
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
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
