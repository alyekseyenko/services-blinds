"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, X, Sparkles, List, Map as MapIcon } from "lucide-react";
import type { AdminMapDisplayMode } from "@/lib/admin/mapDisplayMode";
import { cn } from "@/lib/cn";
import { MAP_HISTORY_OUTCOME_OPTIONS } from "@/lib/admin/mapFilterConfig";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { MapTechnicianOption } from "@/lib/admin/opportunityFilters";
import type { UnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import { countActiveFilters, formatActiveTypeLabel } from "@/lib/admin/mapFiltersBarHelpers";
import { technicianFilterBorderStyle } from "@/lib/admin/technicianFilterChip";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import type { MapCategoryFilter, MapStallFilter, ZoneInsight } from "@/types/admin";
import { MapFilterPanelShell } from "@/components/admin/filters/MapFilterPanelShell";
import { AdminMapFiltersPanel } from "@/components/admin/filters/AdminMapFiltersPanel";
import { AdminMapZonesPanel } from "@/components/admin/filters/AdminMapZonesPanel";

export interface AdminMapFiltersBarProps {
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
  pendingClosureOnly: boolean;
  setPendingClosureOnly: (only: boolean) => void;
  pendingClosureCount: number;
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
  visibleCount: number;
  loading: boolean;
  zoneInsights: ZoneInsight[];
  withoutGpsCount: number;
  withoutGpsServices?: UnscheduledWithoutGps[];
  onSelectWithoutGps?: (twentyId: string) => void;
  onGeocodeWithoutGps?: (twentyId: string) => Promise<void> | void;
  onSaveWithoutGpsCoords?: (twentyId: string, lat: string, lng: string) => Promise<void> | void;
  onSyncAddresses: () => void;
  isSyncing: boolean;
  routeSelectionMode: boolean;
  setRouteSelectionMode: (mode: boolean) => void;
  autoGenerateRouteForZone: (zone: string) => void;
  mapTextSearch?: string | null;
  onClearMapTextSearch?: () => void;
  layout?: "overlay" | "inline";
  mapDisplayMode?: AdminMapDisplayMode;
  setMapDisplayMode?: (mode: AdminMapDisplayMode) => void;
}

type MapPanel = null | "filters" | "zones";
type ZoneMethod = "recommend" | "manual" | null;

const ZONE_STEP_LABELS = ["Método", "Zona", "Ação"];

export default function AdminMapFiltersBar({
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
  pendingClosureOnly,
  setPendingClosureOnly,
  pendingClosureCount,
  cityFilter,
  setCityFilter,
  visibleCount,
  loading,
  zoneInsights,
  withoutGpsCount,
  withoutGpsServices = [],
  onSelectWithoutGps,
  onGeocodeWithoutGps,
  onSaveWithoutGpsCoords,
  onSyncAddresses,
  isSyncing,
  routeSelectionMode,
  setRouteSelectionMode,
  autoGenerateRouteForZone,
  mapTextSearch = null,
  onClearMapTextSearch,
  layout = "overlay",
  mapDisplayMode = "map",
  setMapDisplayMode,
}: AdminMapFiltersBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<MapPanel>(null);
  const [zoneStep, setZoneStep] = useState(1);
  const [zoneMethod, setZoneMethod] = useState<ZoneMethod>(null);
  const [pickedZone, setPickedZone] = useState<string | null>(null);
  const pickedZoneRef = useRef<string | null>(null);

  const activeCount = countActiveFilters(
    mapTab,
    serviceTypeFilters,
    stallFilter,
    pendingClosureOnly,
    cityFilter,
    mapTechnicianFilter,
    historyOutcomes
  );
  const activeTypeLabel = formatActiveTypeLabel(serviceTypeFilters);

  const closeAll = () => {
    setPanel(null);
    setZoneStep(1);
    setZoneMethod(null);
    setPickedZone(null);
    pickedZoneRef.current = null;
  };

  const openZones = () => {
    setPanel("zones");
    setZoneStep(1);
    setZoneMethod(null);
    setPickedZone(cityFilter);
    pickedZoneRef.current = cityFilter;
  };

  useEffect(() => {
    if (!panel) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeAll();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panel]);

  const resetFilters = () => {
    setMapTab("unscheduled");
    onClearServiceTypeFilters();
    setStallFilter("all");
    setPendingClosureOnly(false);
    setCityFilter(null);
    setMapTechnicianFilter(null);
    onClearHistoryOutcomes();
  };

  const panelPlacement = layout === "inline" ? "dock" : "dropdown";
  const isListView = mapDisplayMode === "list";

  useEffect(() => {
    if (isListView && panel === "zones") {
      closeAll();
    }
  }, [isListView, panel]);

  return (
    <div
      ref={rootRef}
      data-tour="admin-map-filters"
      className={cn(
        "relative flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        layout === "overlay"
          ? "pointer-events-auto w-full max-w-[min(100%,40rem)] sm:max-w-[min(100%,42rem)]"
          : "w-full"
      )}
    >
      {mapTextSearch && onClearMapTextSearch && (
        <button
          type="button"
          onClick={onClearMapTextSearch}
          className="flex min-h-12 max-w-[min(100%,16rem)] items-center gap-2 rounded-2xl border border-warning-border bg-warning-surface px-3 py-2 text-xs font-black uppercase tracking-wide text-warning-fg shadow-lg backdrop-blur"
          aria-label="Limpar pesquisa no mapa"
        >
          <span className="truncate">«{mapTextSearch}»</span>
          <X className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {setMapDisplayMode && !routeSelectionMode ? (
          <div
            className="flex min-h-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur"
            role="group"
            aria-label="Vista mapa ou lista"
            data-tour="admin-map-display-mode"
          >
            <button
              type="button"
              aria-pressed={mapDisplayMode === "map"}
              onClick={() => setMapDisplayMode("map")}
              className={cn(
                "flex min-h-12 min-w-[4.5rem] items-center justify-center gap-1.5 px-3 text-xs font-black uppercase tracking-wide",
                mapDisplayMode === "map"
                  ? "bg-neon text-neon-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <MapIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <button
              type="button"
              aria-pressed={mapDisplayMode === "list"}
              onClick={() => setMapDisplayMode("list")}
              className={cn(
                "flex min-h-12 min-w-[4.5rem] items-center justify-center gap-1.5 border-l border-border px-3 text-xs font-black uppercase tracking-wide",
                mapDisplayMode === "list"
                  ? "bg-neon text-neon-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setPanel(panel === "filters" ? null : "filters")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card/95 px-4 py-2 text-xs font-bold shadow-lg backdrop-blur transition-all hover:bg-card sm:flex-none sm:justify-start ${
            panel === "filters" ? "ring-2 ring-primary/30" : ""
          }`}
          aria-expanded={panel === "filters"}
        >
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span>Filtros</span>
          {activeCount > 0 && (
            <span className="rounded-lg bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
          <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {visibleCount}
          </span>
        </button>

        {!isListView ? (
          <button
            type="button"
            onClick={() => (panel === "zones" ? closeAll() : openZones())}
            data-tour="admin-map-zones-button"
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card/95 px-4 py-2 text-xs font-bold shadow-lg backdrop-blur transition-all hover:bg-card sm:flex-none sm:justify-start ${
              panel === "zones" || cityFilter ? "ring-2 ring-primary/25" : ""
            }`}
            aria-expanded={panel === "zones"}
          >
            <Sparkles className="h-4 w-4 text-primary-ink" aria-hidden />
            <span>Zonas</span>
            {cityFilter && (
              <span className="max-w-[5.5rem] truncate text-xs font-semibold normal-case text-primary-ink">
                {cityFilter}
              </span>
            )}
          </button>
        ) : null}
        {isListView && cityFilter ? (
          <button
            type="button"
            onClick={() => setCityFilter(null)}
            className="flex min-h-12 max-w-full items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary-ink"
          >
            <span className="truncate">Zona: {cityFilter}</span>
            <X className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : null}
      </div>
      {(serviceTypeFilters.length > 0 || mapTechnicianFilter || historyOutcomes.length > 0) && (
        <div className="flex max-w-[min(100%,20rem)] flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/95 px-2 py-1 shadow-md backdrop-blur">
          {serviceTypeFilters.map((key) => (
            <span
              key={key}
              className="rounded-lg bg-primary/15 px-2 py-0.5 text-xs font-black text-primary-ink"
            >
              {serviceTypeConfig[key]?.badge ?? key}
            </span>
          ))}
          {mapTechnicianFilter && (
            <span
              className="max-w-[7rem] truncate rounded-lg border-2 bg-card px-2 py-0.5 text-xs font-bold text-foreground"
              style={technicianFilterBorderStyle(mapTechnicianFilter)}
            >
              {mapTechnicianFilter}
            </span>
          )}
          {historyOutcomes.map((o) => (
            <span
              key={o}
              className="rounded-lg bg-info-surface px-2 py-0.5 text-xs font-black text-info-fg"
            >
              {MAP_HISTORY_OUTCOME_OPTIONS.find((x) => x.value === o)?.label ?? o}
            </span>
          ))}
        </div>
      )}

      {panel === "filters" && (
        <MapFilterPanelShell
          placement={panelPlacement}
          title={isListView ? "Filtros da lista" : "Filtros do mapa"}
          subtitle={activeTypeLabel}
          onClose={closeAll}
          footer={
            <button
              type="button"
              onClick={resetFilters}
              className="w-full min-h-10 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              Repor filtros
            </button>
          }
        >
          <AdminMapFiltersPanel
            isListView={isListView}
            mapTab={mapTab}
            setMapTab={setMapTab}
            serviceTypeFilters={serviceTypeFilters}
            onToggleServiceTypeFilter={onToggleServiceTypeFilter}
            onClearServiceTypeFilters={onClearServiceTypeFilters}
            mapTechnicianFilter={mapTechnicianFilter}
            setMapTechnicianFilter={setMapTechnicianFilter}
            mapTechnicianOptions={mapTechnicianOptions}
            historyOutcomes={historyOutcomes}
            onToggleHistoryOutcome={onToggleHistoryOutcome}
            onClearHistoryOutcomes={onClearHistoryOutcomes}
            pendingClosureOnly={pendingClosureOnly}
            setPendingClosureOnly={setPendingClosureOnly}
            pendingClosureCount={pendingClosureCount}
            stallFilter={stallFilter}
            setStallFilter={setStallFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
          />
        </MapFilterPanelShell>
      )}

      {panel === "zones" && !isListView ? (
        <MapFilterPanelShell
          placement={panelPlacement}
          title="Zonas sugeridas"
          subtitle={`Passo ${zoneStep} de 3 · ${ZONE_STEP_LABELS[zoneStep - 1]}`}
          onClose={closeAll}
        >
          <AdminMapZonesPanel
            zoneStep={zoneStep}
            setZoneStep={setZoneStep}
            zoneMethod={zoneMethod}
            setZoneMethod={setZoneMethod}
            pickedZone={pickedZone}
            setPickedZone={setPickedZone}
            pickedZoneRef={pickedZoneRef}
            loading={loading}
            zoneInsights={zoneInsights}
            withoutGpsCount={withoutGpsCount}
            withoutGpsServices={withoutGpsServices}
            onSelectWithoutGps={onSelectWithoutGps}
            onGeocodeWithoutGps={onGeocodeWithoutGps}
            onSaveWithoutGpsCoords={onSaveWithoutGpsCoords}
            onSyncAddresses={onSyncAddresses}
            isSyncing={isSyncing}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            setMapTab={setMapTab}
            routeSelectionMode={routeSelectionMode}
            setRouteSelectionMode={setRouteSelectionMode}
            autoGenerateRouteForZone={autoGenerateRouteForZone}
            onCloseAll={closeAll}
          />
        </MapFilterPanelShell>
      ) : null}
    </div>
  );
}