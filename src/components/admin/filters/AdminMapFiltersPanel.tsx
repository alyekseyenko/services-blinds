"use client";

import {
  MAP_FIELD_CLOSURE_FILTER,
  MAP_HISTORY_OUTCOME_OPTIONS,
  MAP_SERVICE_TYPE_OPTIONS,
  MAP_STALL_FILTERS,
  MAP_STATUS_TABS,
} from "@/lib/admin/mapFilterConfig";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { MapTechnicianOption } from "@/lib/admin/opportunityFilters";
import { technicianFilterBorderStyle } from "@/lib/admin/technicianFilterChip";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import type { MapCategoryFilter, MapStallFilter } from "@/types/admin";

export function AdminMapFiltersPanel(props: {
  isListView: boolean;
  mapTab: string;
  setMapTab: (tab: string) => void;
  serviceTypeFilters: MapCategoryFilter[];
  onToggleServiceTypeFilter: (filter: MapCategoryFilter) => void;
  onClearServiceTypeFilters: () => void;
  mapTechnicianFilter: string | null;
  setMapTechnicianFilter: (name: string | null) => void;
  mapTechnicianOptions: MapTechnicianOption[];
  historyOutcomes: MapHistoryOutcome[];
  onToggleHistoryOutcome: (outcome: MapHistoryOutcome) => void;
  onClearHistoryOutcomes: () => void;
  pendingClosureOnly: boolean;
  setPendingClosureOnly: (only: boolean) => void;
  pendingClosureCount: number;
  stallFilter: MapStallFilter;
  setStallFilter: (filter: MapStallFilter) => void;
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
}) {
  const {
    isListView,
    mapTab,
    setMapTab,
    serviceTypeFilters,
    onToggleServiceTypeFilter,
    onClearServiceTypeFilters,
    mapTechnicianFilter,
    setMapTechnicianFilter,
    mapTechnicianOptions,
    historyOutcomes,
    onToggleHistoryOutcome,
    onClearHistoryOutcomes,
    pendingClosureOnly,
    setPendingClosureOnly,
    pendingClosureCount,
    stallFilter,
    setStallFilter,
    cityFilter,
    setCityFilter,
  } = props;

  const serviceTypeChips = MAP_SERVICE_TYPE_OPTIONS.filter((o) => o.value !== "all");

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Estado</p>
        <div className="grid grid-cols-3 gap-1.5" data-tour="admin-map-status-tabs">
          {MAP_STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMapTab(tab.value)}
              className={`relative min-h-11 rounded-xl px-1 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                mapTab === tab.value
                  ? "bg-ink text-ink-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              {tab.value === "scheduled" && pendingClosureCount > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-xs font-black leading-none text-ink-foreground"
                  aria-label={`${pendingClosureCount} por fechar no terreno`}
                >
                  {pendingClosureCount > 9 ? "9+" : pendingClosureCount}
                </span>
              ) : null}
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
                <span className="text-xs font-bold leading-tight text-foreground">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Técnico</p>
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
              className={`flex min-h-10 max-w-full items-center gap-1.5 rounded-xl border-2 px-2.5 py-1.5 text-left ${
                mapTechnicianFilter === tech.name
                  ? "bg-muted ring-1 ring-foreground/20"
                  : "bg-card hover:bg-muted"
              }`}
              style={technicianFilterBorderStyle(tech.name)}
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
          {isListView
            ? "Incluir concluídos, incompletos ou cancelados na lista."
            : "Mostra intervenções terminadas com GPS (como no separador Histórico)."}
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
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          Fecho no terreno
        </p>
        <button
          type="button"
          onClick={() => {
            setPendingClosureOnly(!pendingClosureOnly);
            if (!pendingClosureOnly) setMapTab("scheduled");
          }}
          className={`mb-4 w-full min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-black transition-all ${
            pendingClosureOnly
              ? "border-danger-border bg-danger-surface text-danger-fg"
              : "border-border bg-muted text-muted-foreground hover:border-border"
          }`}
          aria-pressed={pendingClosureOnly}
        >
          <span className="block">{MAP_FIELD_CLOSURE_FILTER.label}</span>
          <span className="mt-0.5 block text-xs font-semibold normal-case tracking-normal opacity-90">
            {MAP_FIELD_CLOSURE_FILTER.hint}
            {pendingClosureCount > 0 ? ` · ${pendingClosureCount} agora` : ""}
          </span>
        </button>
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

      {cityFilter && !isListView ? (
        <p className="text-xs font-bold text-muted-foreground">
          Zona ativa: <span className="text-primary-ink">{cityFilter}</span> — use o botão Zonas
        </p>
      ) : null}
      {cityFilter && isListView ? (
        <button
          type="button"
          onClick={() => setCityFilter(null)}
          className="w-full min-h-10 rounded-xl border border-border text-xs font-black uppercase text-muted-foreground hover:bg-muted"
        >
          Remover filtro de zona ({cityFilter})
        </button>
      ) : null}
    </div>
  );
}