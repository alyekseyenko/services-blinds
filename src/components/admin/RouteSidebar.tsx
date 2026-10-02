"use client";

import React, { useMemo, useState } from "react";
import {
  Navigation,
  Brain,
  Loader2,
  MapPin,
  Trash2,
  ShieldCheck,
  X,
  ListOrdered,
  Euro,
  LogOut,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { RouteStop, RouteData } from "@/types/admin";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import { HQ_LABEL } from "@/lib/branding";
import { cn } from "@/lib/cn";

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

function formatDurationMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function RouteFuelInputs({
  fuelPrice,
  setFuelPrice,
  fuelConsumption,
  setFuelConsumption,
  tollCost,
  setTollCost,
  realRouteData,
}: {
  fuelPrice: number;
  setFuelPrice: (v: number) => void;
  fuelConsumption: number;
  setFuelConsumption: (v: number) => void;
  tollCost: number;
  setTollCost: (v: number) => void;
  realRouteData: RouteData | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        Preço gasolina (€/L)
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={fuelPrice}
          onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-border bg-muted px-2 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30/20"
        />
      </label>
      <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        Consumo (L/100 km)
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={fuelConsumption}
          onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-border bg-muted px-2 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30/20"
        />
      </label>
      <label className="col-span-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center justify-between gap-2">
          Portagens total (€)
          {realRouteData?.hasTolls && (
            <span className="rounded-md border border-warning-border bg-warning-surface px-1.5 py-0.5 text-xs font-black uppercase text-warning-fg">
              Portagens detetadas
            </span>
          )}
        </span>
        <div className="relative mt-1">
          <input
            type="number"
            step="0.5"
            inputMode="decimal"
            value={tollCost}
            onChange={(e) => setTollCost(parseFloat(e.target.value) || 0)}
            className={cn(
              "w-full rounded-lg border px-2 py-2.5 pr-20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30/20",
              realRouteData?.hasTolls
                ? "border-warning-border bg-warning-surface/40 text-warning-fg focus:border-warning-solid"
                : "border-border bg-muted text-foreground focus:border-primary focus:bg-card"
            )}
          />
          {realRouteData?.hasTolls && tollCost === 0 && (
            <button
              type="button"
              onClick={() => setTollCost(Math.round(realRouteData.distanceKm * 0.08))}
              className="absolute right-1 top-1 bottom-1 rounded-md bg-warning-solid px-2.5 text-xs font-black uppercase text-ink-foreground hover:bg-warning-solid/90"
            >
              Estimar
            </button>
          )}
        </div>
      </label>
    </div>
  );
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
  setOptimizedRoute,
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
  const [dragVisitIndex, setDragVisitIndex] = useState<number | null>(null);

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

  const listItems = useMemo(() => {
    const rows: {
      key: string;
      kind: "hq-start" | "stop" | "hq-end";
      stop?: RouteStop | OptimizedRouteStop;
      index?: number;
    }[] = [];
    if (stopCount === 0) return rows;
    rows.push({ key: "hq-start", kind: "hq-start" });
    let stopIndex = 0;
    for (const item of displayStops) {
      if (item.isReturn) {
        rows.push({ key: "hq-end", kind: "hq-end", stop: item });
        continue;
      }
      stopIndex += 1;
      rows.push({ key: item.id, kind: "stop", stop: item, index: stopIndex });
    }
    if (!optimizedRoute) {
      rows.push({ key: "hq-end-pending", kind: "hq-end" });
    }
    return rows;
  }, [displayStops, optimizedRoute, stopCount]);

  return (
    <aside
      className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border-l border-border/90 bg-muted lg:max-w-[26rem]"
      aria-label="Planeamento do roteiro"
    >
      {/* Cabeçalho */}
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
              Planeamento
            </p>
            <h2 className="ds-title truncate text-sm tracking-tight text-foreground">
              Roteiro do dia
            </h2>
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

      {/* Tabs */}
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

      {/* Conteúdo */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {tab === "paragens" && (
          <div className="space-y-2">
            {stopCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground">
                  Toque nos pins do mapa para adicionar visitas ao roteiro.
                </p>
              </div>
            ) : (
              <>
                {optimizedRoute && (
                  <p className="mb-2 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-xs font-semibold leading-snug text-warning-fg">
                    {routeManuallyAdjusted
                      ? "Ordem ajustada manualmente — km e custos recalculados para esta sequência."
                      : "Arraste as paragens (ou use as setas) para ajustar a ordem antes de agendar."}
                  </p>
                )}
              <ul className="space-y-1">
                {listItems.map((row) => {
                  if (row.kind === "hq-start") {
                    return (
                      <li
                        key={row.key}
                        className="flex items-center gap-3 rounded-xl border border-primary/30/80 bg-primary/10/80 px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-ink-foreground">
                          HQ
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase text-primary-ink">Partida</p>
                          <p className="truncate text-xs font-bold text-foreground">{HQ_LABEL}</p>
                        </div>
                      </li>
                    );
                  }
                  if (row.kind === "hq-end") {
                    const km =
                      row.stop && "distanceFromLast" in row.stop
                        ? row.stop.distanceFromLast
                        : undefined;
                    return (
                      <li
                        key={row.key}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted-foreground text-xs font-black text-ink-foreground">
                          ↩
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase text-muted-foreground">
                            {optimizedRoute ? "Regresso sede" : "Regresso (após otimizar)"}
                          </p>
                          <p className="text-xs font-bold text-foreground">Sede</p>
                          {km != null && (
                            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                              +{km} km · ~{Math.round(Number(km) * 2)} min
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  }
                  const item = row.stop!;
                  const km = "distanceFromLast" in item ? item.distanceFromLast : undefined;
                  const visitIndex = (row.index ?? 1) - 1;
                  const canReorder = Boolean(optimizedRoute);
                  const routeDragMime = "application/x-route-visit-index";
                  return (
                    <li
                      key={row.key}
                      draggable={canReorder}
                      onDragStart={(e) => {
                        if (!canReorder) return;
                        e.dataTransfer.setData(routeDragMime, String(visitIndex));
                        e.dataTransfer.setData("text/plain", String(visitIndex));
                        e.dataTransfer.effectAllowed = "move";
                        setDragVisitIndex(visitIndex);
                      }}
                      onDragEnd={() => setDragVisitIndex(null)}
                      onDragOver={(e) => {
                        if (!canReorder) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        if (!canReorder) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const raw =
                          e.dataTransfer.getData(routeDragMime) ||
                          e.dataTransfer.getData("text/plain");
                        const fromIndex =
                          raw !== ""
                            ? Number.parseInt(raw, 10)
                            : dragVisitIndex ?? Number.NaN;
                        if (!Number.isNaN(fromIndex) && fromIndex !== visitIndex) {
                          onManualRouteReorder(fromIndex, visitIndex);
                        }
                        setDragVisitIndex(null);
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5",
                        canReorder
                          ? "border-border cursor-grab active:cursor-grabbing"
                          : "border-border",
                        dragVisitIndex === visitIndex && "ring-2 ring-primary/40"
                      )}
                    >
                      {canReorder && (
                        <GripVertical
                          className="mt-2 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-neon">
                        {row.index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-black uppercase leading-snug text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{item.client}</p>
                        {km && (
                          <p className="mt-1 text-xs font-semibold text-primary-ink">
                            +{km} km · ~{Math.round(parseFloat(String(km)) * 2)} min
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        {canReorder && (
                          <>
                            <button
                              type="button"
                              draggable={false}
                              disabled={visitIndex === 0}
                              onClick={() => onManualRouteReorder(visitIndex, visitIndex - 1)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                              aria-label="Mover paragem para cima"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              draggable={false}
                              disabled={visitIndex >= stopCount - 1}
                              onClick={() => onManualRouteReorder(visitIndex, visitIndex + 1)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                              aria-label="Mover paragem para baixo"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => toggleSelectionForRoute(item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger-surface hover:text-danger-solid"
                          aria-label="Remover paragem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </div>
        )}

        {tab === "custos" && stopCount > 0 && (
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
                Poupança estimada:{" "}
                {(unoptimizedTotalDistance - realRouteData.distanceKm).toFixed(1)} km (
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
                <p className="font-black text-foreground">
                  {formatDurationMinutes(stopCount * 90)}
                </p>
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
                    <p className="italic">
                      {(aiAnalysis as { efficiency?: string }).efficiency ?? "—"}
                    </p>
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
        )}
      </div>

      {/* Ações fixas */}
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
