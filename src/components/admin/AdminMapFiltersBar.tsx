"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
      return "bg-red-500 text-white";
    case "High":
      return "bg-amber-500 text-slate-950";
    case "Medium":
      return "bg-lime-500 text-slate-950";
    default:
      return "bg-slate-200 text-slate-700";
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
      className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-[min(100vw-2rem,22rem)] max-h-[min(85vh,34rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 shadow-2xl backdrop-blur"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</p>
          {subtitle && <p className="text-[10px] font-medium text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>
      {footer && <div className="shrink-0 border-t border-slate-100 p-3">{footer}</div>}
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
    <div ref={rootRef} className="pointer-events-auto flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setPanel(panel === "filters" ? null : "filters")}
        className={`flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur transition-all hover:bg-white ${
          panel === "filters" ? "ring-2 ring-[#84cc16]/40" : ""
        }`}
        aria-expanded={panel === "filters"}
      >
        <Filter className="h-4 w-4 text-slate-500" aria-hidden />
        <span>Filtros</span>
        {activeCount > 0 && (
          <span className="rounded-lg bg-[#84cc16] px-2 py-0.5 text-[10px] text-[#090d16]">{activeCount}</span>
        )}
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{visibleCount}</span>
      </button>

      {(serviceTypeFilters.length > 0 || mapTechnicianFilter || historyOutcomes.length > 0) && (
        <div className="flex max-w-[min(100%,20rem)] flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 px-2 py-1 shadow-lg backdrop-blur">
          {serviceTypeFilters.map((key) => (
            <span
              key={key}
              className="rounded-lg bg-lime-100 px-2 py-0.5 text-[10px] font-black text-lime-900"
            >
              {serviceTypeConfig[key]?.badge ?? key}
            </span>
          ))}
          {mapTechnicianFilter && (
            <span className="max-w-[7rem] truncate rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
              {mapTechnicianFilter}
            </span>
          )}
          {historyOutcomes.map((o) => (
            <span
              key={o}
              className="rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-900"
            >
              {MAP_HISTORY_OUTCOME_OPTIONS.find((x) => x.value === o)?.label ?? o}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => (panel === "zones" ? closeAll() : openZones())}
        className={`flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur transition-all hover:bg-white ${
          panel === "zones" || cityFilter ? "ring-2 ring-lime-400/50" : ""
        }`}
        aria-expanded={panel === "zones"}
      >
        <Sparkles className="h-4 w-4 text-lime-600" aria-hidden />
        <span>Zonas</span>
        {cityFilter && (
          <span className="max-w-[5.5rem] truncate text-[10px] font-bold normal-case text-lime-700">
            {cityFilter}
          </span>
        )}
      </button>

      {panel === "filters" && (
        <PanelShell
          title="Filtros do mapa"
          subtitle={activeTypeLabel}
          onClose={closeAll}
          footer={
            <button
              type="button"
              onClick={resetFilters}
              className="w-full min-h-10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50"
            >
              Repor filtros
            </button>
          }
        >
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MAP_STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setMapTab(tab.value)}
                    className={`min-h-11 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                      mapTab === tab.value
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tipos de serviço
                </p>
                {serviceTypeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearServiceTypeFilters}
                    className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mb-2 text-[10px] font-medium text-slate-500">
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
                          ? "border-lime-500 bg-lime-50 ring-1 ring-lime-400"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                        style={{ backgroundColor: option.pin }}
                      >
                        {badge}
                      </span>
                      <span className="text-[10px] font-bold leading-tight text-slate-800">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Técnico
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapTechnicianFilter(null)}
                  className={`min-h-10 rounded-xl px-3 text-[10px] font-black uppercase tracking-wide ${
                    !mapTechnicianFilter
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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
                        ? "border-lime-500 bg-lime-50 ring-1 ring-lime-400"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    aria-pressed={mapTechnicianFilter === tech.name}
                  >
                    {tech.isLive && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-[#84cc16] animate-pulse"
                        title="Em campo (GPS activo)"
                        aria-hidden
                      />
                    )}
                    <span className="truncate text-[10px] font-bold text-slate-800">{tech.name}</span>
                  </button>
                ))}
              </div>
              {mapTechnicianOptions.length === 0 && (
                <p className="text-[10px] italic text-slate-400">Sem técnicos com visitas ou GPS.</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Histórico no mapa
                </p>
                {historyOutcomes.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistoryOutcomes}
                    className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mb-2 text-[10px] font-medium text-slate-500">
                Mostra intervenções terminadas com GPS (como no separador Histórico).
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {MAP_HISTORY_OUTCOME_OPTIONS.map((item) => {
                  const selected = historyOutcomes.includes(item.value);
                  const tone =
                    item.value === "completed"
                      ? selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600"
                      : item.value === "incomplete"
                        ? selected
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-600"
                        : selected
                          ? "border-red-500 bg-red-50 text-red-900"
                          : "border-slate-200 bg-white text-slate-600";
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onToggleHistoryOutcome(item.value)}
                      className={`min-h-11 rounded-xl border px-1 py-2 text-[10px] font-black uppercase tracking-wide ${tone}`}
                      aria-pressed={selected}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo parado</p>
              <div className="space-y-1">
                {MAP_STALL_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStallFilter(item.value)}
                    className={`w-full min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-black transition-all ${
                      stallFilter === item.value
                        ? "border-amber-400 bg-amber-50 text-slate-800"
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {cityFilter && (
              <p className="text-[10px] font-bold text-slate-500">
                Zona ativa: <span className="text-lime-700">{cityFilter}</span> — use o botão Zonas
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
          <div className="mb-4 flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${n <= zoneStep ? "bg-lime-500" : "bg-slate-200"}`}
                aria-hidden
              />
            ))}
          </div>

          {withoutGpsCount > 0 && zoneStep === 1 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase text-amber-800">
                {withoutGpsCount} serviços sem GPS nas sugestões
              </p>
              <button
                type="button"
                onClick={onSyncAddresses}
                disabled={isSyncing}
                className="flex w-full min-h-9 items-center justify-center gap-2 rounded-lg bg-amber-500 text-[10px] font-black uppercase text-white disabled:opacity-60"
              >
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar moradas
              </button>
            </div>
          )}

          {zoneStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                Escolha como quer organizar visitas por zona. Os filtros do mapa aplicam-se às sugestões.
              </p>
              <button
                type="button"
                onClick={() => {
                  setZoneMethod("recommend");
                  setZoneStep(2);
                }}
                className="flex w-full min-h-14 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-lime-400 hover:bg-white"
              >
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />
                <div>
                  <p className="text-xs font-black text-slate-900">Usar recomendações</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
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
                className="flex w-full min-h-14 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-lime-400 hover:bg-white"
              >
                <Hand className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <div>
                  <p className="text-xs font-black text-slate-900">Seleção manual no mapa</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    Escolher paragens uma a uma, sem zona fixa
                  </p>
                </div>
              </button>
            </div>
          )}

          {zoneStep === 2 && zoneMethod === "recommend" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">Toque na zona para continuar.</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-lime-600" />
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
                              ? "border-lime-500 bg-lime-50 ring-1 ring-lime-400"
                              : "border-slate-200 bg-slate-50 hover:border-lime-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${priorityBadgeClass(insight.priority)}`}
                            >
                              {priorityLabel(insight.priority)}
                            </span>
                            <span className="text-[10px] font-black text-lime-700">
                              {insight.count} pend.
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-black text-slate-800">{insight.name}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-500">
                            {insight.distance} km · ~{insight.logisticsCost} €
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-6 text-center text-xs italic text-slate-400">
                  Sem zonas com os filtros atuais.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneStep(1)}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-600"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={!pickedZone}
                  onClick={() => setZoneStep(3)}
                  className="flex min-h-10 flex-[2] items-center justify-center gap-1 rounded-xl bg-slate-900 text-[10px] font-black uppercase text-white disabled:opacity-40"
                >
                  Seguinte <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {zoneStep === 3 && (
            <div className="space-y-3">
              {zoneMethod === "recommend" && pickedZone && (
                <div className="rounded-xl border border-lime-200 bg-lime-50/80 p-3">
                  <p className="text-[10px] font-black uppercase text-lime-800">Zona escolhida</p>
                  <p className="text-sm font-black text-slate-900">{pickedZone}</p>
                </div>
              )}
              {zoneMethod === "manual" && (
                <p className="text-xs leading-relaxed text-slate-600">
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
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-800 hover:border-lime-400"
                  >
                    <MapPin className="h-4 w-4 text-lime-600" />
                    Ver só esta zona no mapa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      autoGenerateRouteForZone(pickedZone);
                      closeAll();
                    }}
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-500 text-[10px] font-black uppercase text-slate-950 hover:bg-slate-900 hover:text-white"
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
                className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase ${
                  routeSelectionMode ? "bg-amber-500 text-white" : "bg-[#090d16] text-[#84cc16]"
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
                  className="w-full min-h-10 text-[10px] font-black uppercase text-red-600 hover:underline"
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
                className="flex w-full min-h-10 items-center justify-center gap-1 text-[10px] font-black uppercase text-slate-500"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            </div>
          )}
        </PanelShell>
      )}
    </div>
  );
}
