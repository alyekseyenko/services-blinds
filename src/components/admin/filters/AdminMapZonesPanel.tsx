"use client";

import type { RefObject } from "react";
import {
  Sparkles,
  Navigation,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Hand,
} from "lucide-react";
import { citiesMatch } from "@/lib/admin/geo";
import { priorityBadgeClass, priorityLabel } from "@/lib/admin/mapFiltersBarHelpers";
import type { UnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import type { ZoneInsight } from "@/types/admin";
import { AdminMapWithoutGpsBox } from "@/components/admin/filters/AdminMapWithoutGpsBox";

type ZoneMethod = "recommend" | "manual" | null;

export function AdminMapZonesPanel(props: {
  zoneStep: number;
  setZoneStep: (step: number) => void;
  zoneMethod: ZoneMethod;
  setZoneMethod: (method: ZoneMethod) => void;
  pickedZone: string | null;
  setPickedZone: (zone: string | null) => void;
  pickedZoneRef: RefObject<string | null>;
  loading: boolean;
  zoneInsights: ZoneInsight[];
  withoutGpsCount: number;
  withoutGpsServices: UnscheduledWithoutGps[];
  onSelectWithoutGps?: (twentyId: string) => void;
  onGeocodeWithoutGps?: (twentyId: string) => Promise<void> | void;
  onSaveWithoutGpsCoords?: (twentyId: string, lat: string, lng: string) => Promise<void> | void;
  onSyncAddresses: () => void;
  isSyncing: boolean;
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
  setMapTab: (tab: string) => void;
  routeSelectionMode: boolean;
  setRouteSelectionMode: (mode: boolean) => void;
  autoGenerateRouteForZone: (zone: string) => void;
  onCloseAll: () => void;
}) {
  const {
    zoneStep,
    setZoneStep,
    zoneMethod,
    setZoneMethod,
    pickedZone,
    setPickedZone,
    pickedZoneRef,
    loading,
    zoneInsights,
    withoutGpsCount,
    withoutGpsServices,
    onSelectWithoutGps,
    onGeocodeWithoutGps,
    onSaveWithoutGpsCoords,
    onSyncAddresses,
    isSyncing,
    cityFilter,
    setCityFilter,
    setMapTab,
    routeSelectionMode,
    setRouteSelectionMode,
    autoGenerateRouteForZone,
    onCloseAll,
  } = props;

  return (
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

      {zoneStep === 1 && (
        <AdminMapWithoutGpsBox
          withoutGpsCount={withoutGpsCount}
          withoutGpsServices={withoutGpsServices}
          onSelectWithoutGps={onSelectWithoutGps}
          onGeocodeWithoutGps={onGeocodeWithoutGps}
          onSaveWithoutGpsCoords={onSaveWithoutGpsCoords}
          onSyncAddresses={onSyncAddresses}
          isSyncing={isSyncing}
        />
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
          <p className="text-xs text-muted-foreground">
            Toque na zona para escolher. Toque outra vez para avançar, como em Seguinte.
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
            </div>
          ) : zoneInsights.length > 0 ? (
            <ul className="space-y-2">
              {zoneInsights.map((insight) => {
                const selected = pickedZone && citiesMatch(pickedZone, insight.name);
                const confirmZone = () => {
                  pickedZoneRef.current = insight.name;
                  setPickedZone(insight.name);
                  setZoneStep(3);
                };
                return (
                  <li key={insight.key}>
                    <button
                      type="button"
                      aria-pressed={Boolean(selected)}
                      onClick={() => {
                        const current = pickedZoneRef.current ?? pickedZone;
                        if (current && citiesMatch(current, insight.name)) {
                          confirmZone();
                          return;
                        }
                        pickedZoneRef.current = insight.name;
                        setPickedZone(insight.name);
                      }}
                      onDoubleClick={confirmZone}
                      className={`w-full min-h-12 touch-manipulation rounded-xl border p-3 text-left transition-all ${
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
                        <span className="text-xs font-black text-primary-ink">{insight.count} pend.</span>
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
                  onCloseAll();
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
                  onCloseAll();
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
              onCloseAll();
            }}
            className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase ${
              routeSelectionMode ? "bg-warning-solid text-ink-foreground" : "bg-ink text-neon"
            }`}
          >
            <Navigation className="h-4 w-4" />
            {zoneMethod === "manual" ? "Começar seleção manual" : "Ajustar paragens à mão"}
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
  );
}