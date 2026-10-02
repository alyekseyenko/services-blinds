"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navigation, X } from "lucide-react";
import RouteSidebar from "@/components/admin/RouteSidebar";
import AdminMapFiltersBar from "@/components/admin/AdminMapFiltersBar";
import { Sheet } from "@/components/ui/Sheet";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";
import type { HqLocation } from "@/lib/hq";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { MapTechnicianOption } from "@/lib/admin/opportunityFilters";
import type {
  MapCategoryFilter,
  MapStallFilter,
  Opportunity,
  RouteData,
  RouteStop,
  ZoneInsight,
} from "@/types/admin";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export interface AdminMapViewProps {
  hqLocation: HqLocation;
  mapOpportunities: Opportunity[];
  allOpportunities: Opportunity[];
  mapTab: string;
  setMapTab: (tab: string) => void;
  serviceTypeFilters: MapCategoryFilter[];
  onToggleServiceTypeFilter: (filter: MapCategoryFilter) => void;
  mapTechnicianFilter: string | null;
  setMapTechnicianFilter: (name: string | null) => void;
  mapTechnicianOptions: MapTechnicianOption[];
  historyOutcomes: MapHistoryOutcome[];
  onToggleHistoryOutcome: (outcome: MapHistoryOutcome) => void;
  onClearServiceTypeFilters: () => void;
  onClearHistoryOutcomes: () => void;
  stallFilter: MapStallFilter;
  setStallFilter: (filter: MapStallFilter) => void;
  techniciansLocations: TechnicianLocation[];
  routeSelectionMode: boolean;
  setRouteSelectionMode: (enabled: boolean) => void;
  onExitRoutePlanning: () => void;
  selectedForRoute: RouteStop[];
  onTaskSelect: (opp: Opportunity) => void;
  onScheduleFromMap: (opp: Opportunity) => void;
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
  routeManuallyAdjusted: boolean;
  onManualRouteReorder: (fromVisitIndex: number, toVisitIndex: number) => void;
  openMassScheduleModal: () => void | Promise<void>;
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
  loading: boolean;
  zoneInsights: ZoneInsight[];
  withoutGpsCount: number;
  onSyncAddresses: () => void;
  isSyncing: boolean;
  autoGenerateRouteForZone: (zone: string) => void;
  mapTextSearch?: string | null;
  onClearMapTextSearch?: () => void;
  mapFocusOpportunityId?: string | null;
}

export default function AdminMapView({
  hqLocation,
  mapOpportunities,
  allOpportunities,
  mapTab,
  setMapTab,
  serviceTypeFilters,
  onToggleServiceTypeFilter,
  mapTechnicianFilter,
  setMapTechnicianFilter,
  mapTechnicianOptions,
  historyOutcomes,
  onToggleHistoryOutcome,
  onClearServiceTypeFilters,
  onClearHistoryOutcomes,
  stallFilter,
  setStallFilter,
  techniciansLocations,
  routeSelectionMode,
  setRouteSelectionMode,
  onExitRoutePlanning,
  selectedForRoute,
  onTaskSelect,
  onScheduleFromMap,
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
  routeManuallyAdjusted,
  onManualRouteReorder,
  openMassScheduleModal,
  cityFilter,
  setCityFilter,
  loading,
  zoneInsights,
  withoutGpsCount,
  onSyncAddresses,
  isSyncing,
  autoGenerateRouteForZone,
  mapTextSearch = null,
  onClearMapTextSearch,
  mapFocusOpportunityId = null,
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
    routeManuallyAdjusted,
    onManualRouteReorder,
    openMassScheduleModal,
  };

  const highlightedIds = useMemo(() => {
    const ids = selectedForRoute.map((s) => s.id);
    if (mapFocusOpportunityId && !ids.includes(mapFocusOpportunityId)) {
      ids.push(mapFocusOpportunityId);
    }
    return ids;
  }, [selectedForRoute, mapFocusOpportunityId]);

  const autoFitKey = `${mapTab}-${serviceTypeFilters.join(",")}-${mapTechnicianFilter ?? "all"}-${historyOutcomes.join(",")}-${stallFilter}-${cityFilter ?? "all"}-${mapTextSearch ?? ""}-${mapFocusOpportunityId ?? ""}-${mapOpportunities.length}`;

  useEffect(() => {
    if (!routeSelectionMode) setShowRouteSheet(false);
  }, [routeSelectionMode, setShowRouteSheet]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (mq.matches) setShowRouteSheet(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [setShowRouteSheet]);

  const closeRoutePanel = () => setShowRouteSheet(false);
  const exitRouteSelection = () => {
    onExitRoutePlanning();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="relative min-h-[50vh] flex-1 lg:min-h-0" data-tour="admin-map-canvas">
          <MapComponent
            tasks={mapOpportunities}
            allOpportunities={allOpportunities}
            onTaskSelect={onTaskSelect}
            markerInteraction="popup"
            onScheduleFromMap={onScheduleFromMap}
            autoFitKey={autoFitKey}
            routeSelectionMode={routeSelectionMode}
            isTaskInRoute={(task) => selectedForRoute.some((s) => s.id === task.id)}
            onToggleRouteFromMap={toggleSelectionForRoute}
            showTechnicianColors={true}
            highlightedIds={highlightedIds}
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
            onboardingMapTourId="admin"
          />

          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            <AdminMapFiltersBar
              mapTab={mapTab}
              setMapTab={setMapTab}
              serviceTypeFilters={serviceTypeFilters}
              onToggleServiceTypeFilter={onToggleServiceTypeFilter}
              mapTechnicianFilter={mapTechnicianFilter}
              setMapTechnicianFilter={setMapTechnicianFilter}
              mapTechnicianOptions={mapTechnicianOptions}
              historyOutcomes={historyOutcomes}
              onToggleHistoryOutcome={onToggleHistoryOutcome}
              onClearServiceTypeFilters={onClearServiceTypeFilters}
              onClearHistoryOutcomes={onClearHistoryOutcomes}
              stallFilter={stallFilter}
              setStallFilter={setStallFilter}
              cityFilter={cityFilter}
              setCityFilter={setCityFilter}
              visibleCount={mapOpportunities.length}
              loading={loading}
              zoneInsights={zoneInsights}
              withoutGpsCount={withoutGpsCount}
              onSyncAddresses={onSyncAddresses}
              isSyncing={isSyncing}
              routeSelectionMode={routeSelectionMode}
              setRouteSelectionMode={setRouteSelectionMode}
              autoGenerateRouteForZone={autoGenerateRouteForZone}
              mapTextSearch={mapTextSearch}
              onClearMapTextSearch={onClearMapTextSearch}
            />

            {techniciansLocations.length > 0 && (
              <div className="pointer-events-auto hidden items-center gap-2 rounded-2xl border border-primary/40 bg-ink/90 px-3 py-2 text-xs font-black uppercase tracking-wider text-ink-foreground shadow-xl backdrop-blur sm:flex">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-neon">{techniciansLocations.length}</span>
                <span>
                  {techniciansLocations.length === 1
                    ? "Técnico em campo"
                    : "Técnicos em campo"}
                </span>
              </div>
            )}

            {routeSelectionMode && (
              <div
                data-tour="admin-route-mode-banner"
                className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-info-border bg-info-solid/95 px-3 py-2 text-xs font-black uppercase tracking-wider text-ink-foreground shadow-lg backdrop-blur"
              >
                <span>Modo de seleção</span>
                <span className="rounded-lg bg-card/20 px-2 py-0.5">{selectedForRoute.length} paragens</span>
                <button
                  type="button"
                  onClick={onExitRoutePlanning}
                  aria-label="Sair do modo de seleção"
                  className="ml-1 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-ink/40 hover:bg-ink/60"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>

        {routeSelectionMode && (
          <div className="hidden lg:flex lg:min-h-0 lg:shrink-0" data-tour="admin-route-sidebar">
            <RouteSidebar {...routeSidebarProps} onExitSelection={exitRouteSelection} />
          </div>
        )}

        {routeSelectionMode && !showRouteSheet && (
          <button
            type="button"
            data-tour="admin-route-open-sheet"
            onClick={() => setShowRouteSheet(true)}
            className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 z-20 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-xs font-black uppercase tracking-wider text-neon shadow-xl lg:hidden"
          >
            <Navigation className="h-5 w-5" aria-hidden />
            Ver roteiro ({selectedForRoute.length})
          </button>
        )}
      </div>

      <Sheet
        open={showRouteSheet}
        onClose={closeRoutePanel}
        title="Roteiro do dia"
        showHeader={false}
        flexBody
      >
        <RouteSidebar
          {...routeSidebarProps}
          onClosePanel={closeRoutePanel}
          onExitSelection={exitRouteSelection}
        />
      </Sheet>
    </div>
  );
}
