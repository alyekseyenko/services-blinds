"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import {
  Filter,
  X,
  Sparkles,
  Navigation,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Hand,
} from "lucide-react";
import {
  MAP_HISTORY_OUTCOME_OPTIONS,
  MAP_SERVICE_TYPE_OPTIONS,
  MAP_STALL_FILTERS,
  MAP_STATUS_TABS,
} from "@/lib/admin/mapFilterConfig";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { MapTechnicianOption } from "@/lib/admin/opportunityFilters";
import { citiesMatch } from "@/lib/admin/geo";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import type { MapCategoryFilter, MapStallFilter, ZoneInsight } from "@/types/admin";

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
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
  visibleCount: number;
  loading: boolean;
  zoneInsights: ZoneInsight[];
  withoutGpsCount: number;
  onSyncAddresses: () => void;
  isSyncing: boolean;
  routeSelectionMode: boolean;
  setRouteSelectionMode: (mode: boolean) => void;
  autoGenerateRouteForZone: (zone: string) => void;
  mapTextSearch?: string | null;
  onClearMapTextSearch?: () => void;
}

type MapPanel = null | "filters" | "zones";
type ZoneMethod = "recommend" | "manual" | null;

function countActiveFilters(
  mapTab: string,
  serviceTypeFilters: MapCategoryFilter[],
  stallFilter: MapStallFilter,
  cityFilter: string | null,
  mapTechnicianFilter: string | null,
  historyOutcomes: MapHistoryOutcome[]
): number {
  let n = 0;
  if (mapTab !== "unscheduled") n += 1;
  if (serviceTypeFilters.length > 0) n += 1;
  if (stallFilter !== "all") n += 1;
  if (cityFilter) n += 1;
  if (mapTechnicianFilter) n += 1;
  if (historyOutcomes.length > 0) n += 1;
  return n;
}

function priorityBadgeClass(priority: ZoneInsight["priority"]): string {
  switch (priority) {
    case "Critical":
      return "bg-danger-solid text-ink-foreground";
    case "High":
      return "bg-warning-solid text-primary-foreground";
    case "Medium":
      return "bg-primary text-primary-foreground";
    default:
      return "bg-secondary text-foreground";
  }
}

function priorityLabel(priority: ZoneInsight["priority"]): string {
  switch (priority) {
    case "Critical":
      return "Crítica";
    case "High":
      return "Alta";
    case "Medium":
      return "Média";
    default:
      return "Baixa";
  }
}

function PanelShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-[min(100vw-2rem,22rem)] max-h-[min(85vh,34rem)] flex-col overflow-hidden rounded-2xl border border-border/90 bg-card/98 shadow-2xl backdrop-blur"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-foreground">{title}</p>
          {subtitle && <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>
      {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
    </div>
  );
}

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
  cityFilter,
  setCityFilter,
  visibleCount,
  loading,
  zoneInsights,
  withoutGpsCount,
  onSyncAddresses,
  isSyncing,
  routeSelectionMode,
  setRouteSelectionMode,
  autoGenerateRouteForZone,
  mapTextSearch = null,
  onClearMapTextSearch,
}: AdminMapFiltersBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<MapPanel>(null);
  const [zoneStep, setZoneStep] = useState(1);
  const [zoneMethod, setZoneMethod] = useState<ZoneMethod>(null);
  const [pickedZone, setPickedZone] = useState<string | null>(null);

  const activeCount = countActiveFilters(
    mapTab,
    serviceTypeFilters,
    stallFilter,
    cityFilter,
    mapTechnicianFilter,
    historyOutcomes
  );
  const activeTypeLabel =
    serviceTypeFilters.length === 0
      ? "Todos os tipos"
      : serviceTypeFilters.length === 1
        ? MAP_SERVICE_TYPE_OPTIONS.find((o) => o.value === serviceTypeFilters[0])?.label ??
          serviceTypeFilters[0]
        : `${serviceTypeFilters.length} tipos`;

  const serviceTypeChips = MAP_SERVICE_TYPE_OPTIONS.filter((o) => o.value !== "all");

  const closeAll = () => {
    setPanel(null);
    setZoneStep(1);
    setZoneMethod(null);
    setPickedZone(null);
  };

  const openZones = () => {
    setPanel("zones");
    setZoneStep(1);
    setZoneMethod(null);
    setPickedZone(cityFilter);
  };

  useEffect(() => {
    const onTourAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;
      switch (action) {
        case "openAdminMapFiltersPanel":
          setPanel("filters");
          break;
        case "closeAdminMapFiltersPanel":
          setPanel((current) => (current === "filters" ? null : current));
          break;
        case "openAdminMapZonesPanel":
          openZones();
          break;
        case "closeAdminMapZonesPanel":
          closeAll();
          break;
        default:
          break;
      }
    };
    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
  }, [panel, cityFilter]);

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
    setCityFilter(null);
    setMapTechnicianFilter(null);
    onClearHistoryOutcomes();
  };

  const zoneStepLabels = ["Método", "Zona", "Ação"];

  return (
    <div
      ref={rootRef}
      data-tour="admin-map-filters"
      className="pointer-events-auto flex max-w-[min(100%,24rem)] flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center"
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
            <span className="max-w-[7rem] truncate rounded-lg bg-ink px-2 py-0.5 text-xs font-bold text-ink-foreground">
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
        <PanelShell
          title="Filtros do mapa"
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
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Estado</p>
              <div className="grid grid-cols-3 gap-1.5" data-tour="admin-map-status-tabs">
                {MAP_STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setMapTab(tab.value)}
                    className={`min-h-11 rounded-xl px-1 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                      mapTab === tab.value
                        ? "bg-ink text-ink-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Tipos de serviço
                </p>
                {serviceTypeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearServiceTypeFilters}
                    className="text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Toque para combinar vários (ex. MD + IN). Nenhum seleccionado = todos.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {serviceTypeChips.map((option) => {
                  const selected = serviceTypeFilters.includes(option.value);
                  const badge = serviceTypeConfig[option.value]?.badge ?? "";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onToggleServiceTypeFilter(option.value)}
                      className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                          : "border-border bg-card hover:border-border"
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-ink-foreground"
                        style={{ backgroundColor: option.pin }}
                      >
                        {badge}
                      </span>
                      <span className="text-xs font-bold leading-tight text-foreground">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                Técnico
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapTechnicianFilter(null)}
                  className={`min-h-10 rounded-xl px-3 text-xs font-black uppercase tracking-wide ${
                    !mapTechnicianFilter
                      ? "bg-ink text-ink-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Todos
                </button>
                {mapTechnicianOptions.map((tech) => (
                  <button
                    key={tech.name}
                    type="button"
                    onClick={() => setMapTechnicianFilter(tech.name)}
                    className={`flex min-h-10 max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left ${
                      mapTechnicianFilter === tech.name
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border bg-card hover:border-border"
                    }`}
                    aria-pressed={mapTechnicianFilter === tech.name}
                  >
                    {tech.isLive && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse"
                        title="Em campo (GPS ativo)"
                        aria-hidden
                      />
                    )}
                    <span className="truncate text-xs font-bold text-foreground">{tech.name}</span>
                  </button>
                ))}
              </div>
              {mapTechnicianOptions.length === 0 && (
                <p className="text-xs italic text-muted-foreground">Sem técnicos com visitas ou GPS.</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Histórico no mapa
                </p>
                {historyOutcomes.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistoryOutcomes}
                    className="text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Mostra intervenções terminadas com GPS (como no separador Histórico).
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {MAP_HISTORY_OUTCOME_OPTIONS.map((item) => {
                  const selected = historyOutcomes.includes(item.value);
                  const tone =
                    item.value === "completed"
                      ? selected
                        ? "border-success-solid bg-success-surface text-success-fg"
                        : "border-border bg-card text-muted-foreground"
                      : item.value === "incomplete"
                        ? selected
                          ? "border-warning-solid bg-warning-surface text-warning-fg"
                          : "border-border bg-card text-muted-foreground"
                        : selected
                          ? "border-danger-solid bg-danger-surface text-danger-fg"
                          : "border-border bg-card text-muted-foreground";
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onToggleHistoryOutcome(item.value)}
                      className={`min-h-11 rounded-xl border px-1 py-2 text-xs font-black uppercase tracking-wide ${tone}`}
                      aria-pressed={selected}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Tempo parado</p>
              <div className="space-y-1">
                {MAP_STALL_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStallFilter(item.value)}
                    className={`w-full min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-black transition-all ${
                      stallFilter === item.value
                        ? "border-warning-border bg-warning-surface text-foreground"
                        : "border-border bg-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {cityFilter && (
              <p className="text-xs font-bold text-muted-foreground">
                Zona ativa: <span className="text-primary-ink">{cityFilter}</span> — use o botão Zonas
              </p>
            )}
          </div>
        </PanelShell>
      )}

      {panel === "zones" && (
        <PanelShell
          title="Zonas sugeridas"
          subtitle={`Passo ${zoneStep} de 3 · ${zoneStepLabels[zoneStep - 1]}`}
          onClose={closeAll}
        >
          <div className="space-y-5" data-tour="admin-map-zones-panel">
          <div className="mb-4 flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${n <= zoneStep ? "bg-primary" : "bg-secondary"}`}
                aria-hidden
              />
            ))}
          </div>

          {withoutGpsCount > 0 && zoneStep === 1 && (
            <div className="mb-4 rounded-xl border border-warning-border bg-warning-surface/90 p-3 space-y-2">
              <p className="text-xs font-black uppercase text-warning-fg">
                {withoutGpsCount} serviços sem GPS nas sugestões
              </p>
              <button
                type="button"
                onClick={onSyncAddresses}
                disabled={isSyncing}
                className="flex w-full min-h-9 items-center justify-center gap-2 rounded-lg bg-warning-solid text-xs font-black uppercase text-ink-foreground disabled:opacity-60"
              >
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar moradas
              </button>
            </div>
          )}

          {zoneStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Escolha como quer organizar visitas por zona. Os filtros do mapa aplicam-se às sugestões.
              </p>
              <button
                type="button"
                onClick={() => {
                  setZoneMethod("recommend");
                  setZoneStep(2);
                }}
                className="flex w-full min-h-14 items-start gap-3 rounded-xl border border-border bg-muted p-3 text-left hover:border-primary hover:bg-card"
              >
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" />
                <div>
                  <p className="text-xs font-black text-foreground">Usar recomendações</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Lista por prioridade, distância e custo estimado
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoneMethod("manual");
                  setCityFilter(null);
                  setZoneStep(3);
                }}
                className="flex w-full min-h-14 items-start gap-3 rounded-xl border border-border bg-muted p-3 text-left hover:border-primary hover:bg-card"
              >
                <Hand className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                <div>
                  <p className="text-xs font-black text-foreground">Seleção manual no mapa</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Escolher paragens uma a uma, sem zona fixa
                  </p>
                </div>
              </button>
            </div>
          )}

          {zoneStep === 2 && zoneMethod === "recommend" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Toque na zona para continuar.</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
                </div>
              ) : zoneInsights.length > 0 ? (
                <ul className="space-y-2">
                  {zoneInsights.map((insight) => {
                    const selected =
                      pickedZone && citiesMatch(pickedZone, insight.name);
                    return (
                      <li key={insight.key}>
                        <button
                          type="button"
                          onClick={() => setPickedZone(insight.name)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                              : "border-border bg-muted hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-xs font-black uppercase px-1.5 py-0.5 rounded ${priorityBadgeClass(insight.priority)}`}
                            >
                              {priorityLabel(insight.priority)}
                            </span>
                            <span className="text-xs font-black text-primary-ink">
                              {insight.count} pend.
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-black text-foreground">{insight.name}</p>
                          <p className="mt-1 text-xs font-bold text-muted-foreground">
                            {insight.distance} km · ~{insight.logisticsCost} €
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-6 text-center text-xs italic text-muted-foreground">
                  Sem zonas com os filtros atuais.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneStep(1)}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-border text-xs font-black uppercase text-muted-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={!pickedZone}
                  onClick={() => setZoneStep(3)}
                  className="flex min-h-10 flex-[2] items-center justify-center gap-1 rounded-xl bg-ink text-xs font-black uppercase text-ink-foreground disabled:opacity-40"
                >
                  Seguinte <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {zoneStep === 3 && (
            <div className="space-y-3">
              {zoneMethod === "recommend" && pickedZone && (
                <div className="rounded-xl border border-primary/30 bg-primary/10/80 p-3">
                  <p className="text-xs font-black uppercase text-primary-ink">Zona escolhida</p>
                  <p className="text-sm font-black text-foreground">{pickedZone}</p>
                </div>
              )}
              {zoneMethod === "manual" && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ative a seleção no mapa e toque nos pinos para montar o roteiro.
                </p>
              )}

              {zoneMethod === "recommend" && pickedZone && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCityFilter(pickedZone);
                      setMapTab("unscheduled");
                      closeAll();
                    }}
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-black uppercase text-foreground hover:border-primary"
                  >
                    <MapPin className="h-4 w-4 text-primary-ink" />
                    Ver só esta zona no mapa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      autoGenerateRouteForZone(pickedZone);
                      closeAll();
                    }}
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black uppercase text-primary-foreground hover:bg-ink hover:text-ink-foreground"
                  >
                    <Sparkles className="h-4 w-4" />
                    Planear rota automática
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (zoneMethod === "recommend" && pickedZone) {
                    setCityFilter(pickedZone);
                    setMapTab("unscheduled");
                  }
                  setRouteSelectionMode(true);
                  closeAll();
                }}
                className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase ${
                  routeSelectionMode ? "bg-warning-solid text-ink-foreground" : "bg-ink text-neon"
                }`}
              >
                <Navigation className="h-4 w-4" />
                {zoneMethod === "manual"
                  ? "Começar seleção manual"
                  : "Ajustar paragens à mão"}
              </button>

              {cityFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setCityFilter(null);
                    setPickedZone(null);
                  }}
                  className="w-full min-h-10 text-xs font-black uppercase text-danger-solid hover:underline"
                >
                  Remover filtro de zona
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (zoneMethod === "manual") setZoneStep(1);
                  else setZoneStep(2);
                }}
                className="flex w-full min-h-10 items-center justify-center gap-1 text-xs font-black uppercase text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            </div>
          )}
          </div>
        </PanelShell>
      )}
    </div>
  );
}
