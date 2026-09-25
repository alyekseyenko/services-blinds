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
  setShowMassScheduleModal: (show: boolean) => void;
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
      <label className="text-[9px] font-black uppercase tracking-wide text-slate-400">
        Preço gasolina (€/L)
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={fuelPrice}
          onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-bold text-slate-800 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/20"
        />
      </label>
      <label className="text-[9px] font-black uppercase tracking-wide text-slate-400">
        Consumo (L/100 km)
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={fuelConsumption}
          onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-bold text-slate-800 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/20"
        />
      </label>
      <label className="col-span-2 text-[9px] font-black uppercase tracking-wide text-slate-400">
        <span className="flex items-center justify-between gap-2">
          Portagens total (€)
          {realRouteData?.hasTolls && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-800">
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
              "w-full rounded-lg border px-2 py-2.5 pr-20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-lime-400/20",
              realRouteData?.hasTolls
                ? "border-amber-300 bg-amber-50/40 text-amber-900 focus:border-amber-500"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:border-lime-500 focus:bg-white"
            )}
          />
          {realRouteData?.hasTolls && tollCost === 0 && (
            <button
              type="button"
              onClick={() => setTollCost(Math.round(realRouteData.distanceKm * 0.08))}
              className="absolute right-1 top-1 bottom-1 rounded-md bg-amber-500 px-2.5 text-[9px] font-black uppercase text-white hover:bg-amber-600"
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
  setShowMassScheduleModal,
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
      className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border-l border-slate-200/90 bg-[#f8fafc] lg:max-w-[26rem]"
      aria-label="Planeamento do roteiro"
    >
      {/* Cabeçalho */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Planeamento
            </p>
            <h2 className="truncate text-sm font-black uppercase tracking-tight text-slate-900">
              Roteiro do dia
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onExitSelection && (
              <button
                type="button"
                onClick={onExitSelection}
                className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-[10px] font-black uppercase tracking-wide text-red-600 hover:bg-red-50"
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
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
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
                "flex-1 rounded-lg py-1.5 text-center text-[9px] font-black uppercase tracking-wide",
                step === n
                  ? "bg-[#84cc16]/20 text-[#3f6212]"
                  : step > n
                    ? "bg-slate-100 text-slate-500"
                    : "bg-slate-50 text-slate-300"
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        {stopCount > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-400">Paragens</p>
              <p className="text-sm font-black text-slate-900">{stopCount}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-[9px] font-bold uppercase text-slate-400">Distância</p>
              <p className="text-sm font-black text-slate-900">{distanceLabel}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-400">Viagem</p>
              <p className="text-sm font-black text-slate-900">{travelLabel}</p>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="mb-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
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
      <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setTab("paragens")}
          className={cn(
            "flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide",
            tab === "paragens" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
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
            "flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide disabled:opacity-40",
            tab === "custos" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
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
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">
                  Toque nos pins do mapa para adicionar visitas ao roteiro.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {listItems.map((row) => {
                  if (row.kind === "hq-start") {
                    return (
                      <li
                        key={row.key}
                        className="flex items-center gap-3 rounded-xl border border-lime-200/80 bg-lime-50/80 px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500 text-[10px] font-black text-white">
                          HQ
                        </span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase text-lime-700">Partida</p>
                          <p className="truncate text-xs font-bold text-slate-800">{HQ_LABEL}</p>
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
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-[10px] font-black text-white">
                          ↩
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            {optimizedRoute ? "Regresso sede" : "Regresso (após otimizar)"}
                          </p>
                          <p className="text-xs font-bold text-slate-700">Sede</p>
                          {km != null && (
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                              +{km} km · ~{Math.round(Number(km) * 2)} min
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  }
                  const item = row.stop!;
                  const km = "distanceFromLast" in item ? item.distanceFromLast : undefined;
                  return (
                    <li
                      key={row.key}
                      className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-[#84cc16]">
                        {row.index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-black uppercase leading-snug text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{item.client}</p>
                        {km && (
                          <p className="mt-1 text-[10px] font-semibold text-lime-700">
                            +{km} km · ~{Math.round(parseFloat(String(km)) * 2)} min
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelectionForRoute(item)}
                        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remover paragem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "custos" && stopCount > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-slate-500">
              Os valores de combustível e portagens estão no topo do painel — ajuste lá e veja o resumo abaixo.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Combustível</span>
                <span className="font-black text-slate-900">{fuelCost.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Portagens</span>
                <span className="font-black text-slate-900">{tollCost.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black uppercase text-lime-800">
                <span>Total operacional</span>
                <span>{totalCost.toFixed(2)} €</span>
              </div>
            </div>

            {unoptimizedTotalDistance && realRouteData && unoptimizedTotalDistance > realRouteData.distanceKm && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
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

            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="font-bold uppercase text-slate-400">Tempo viagem</p>
                <p className="font-black text-slate-900">{travelLabel}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="font-bold uppercase text-slate-400">Em campo (~90m/visita)</p>
                <p className="font-black text-slate-900">
                  {formatDurationMinutes(stopCount * 90)}
                </p>
              </div>
            </div>

            {optimizedRoute && (
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-900">
                    <Brain className="h-3.5 w-3.5" />
                    Auditoria IA
                  </div>
                  {!aiAnalysis && (
                    <button
                      type="button"
                      onClick={handleAiAudit}
                      disabled={isAiAnalyzing}
                      className="rounded-lg bg-purple-600 px-2 py-1 text-[9px] font-black uppercase text-white"
                    >
                      {isAiAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Analisar"}
                    </button>
                  )}
                </div>
                {aiAnalysis &&
                typeof aiAnalysis === "object" &&
                aiAnalysis !== null &&
                "score" in aiAnalysis ? (
                  <div className="mt-2 space-y-2 text-[11px] text-slate-600">
                    <p className="font-black text-purple-800">
                      Score {(aiAnalysis as { score: number }).score}/100
                    </p>
                    <p className="italic">
                      {(aiAnalysis as { efficiency?: string }).efficiency ?? "—"}
                    </p>
                    <p className="font-semibold text-emerald-700">
                      {(aiAnalysis as { roi_advice?: string }).roi_advice ?? "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAiAnalysis(null)}
                      className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600"
                    >
                      Limpar
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-purple-700/80">Opcional: ROI e eficiência da rota.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ações fixas */}
      <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3">
        {!optimizedRoute ? (
          <button
            type="button"
            disabled={stopCount < 1 || isOptimizing}
            onClick={() => {
              calculateOptimizedRoute();
              setTab("custos");
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#84cc16] text-xs font-black uppercase tracking-wide text-[#090d16] disabled:opacity-40"
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
                setOptimizedRoute(null);
                setTab("paragens");
              }}
              className="min-h-12 flex-1 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-600"
            >
              Reordenar
            </button>
            <button
              type="button"
              onClick={() => setShowMassScheduleModal(true)}
              className="flex min-h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-[#84cc16] text-xs font-black uppercase text-[#090d16]"
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
            className="min-h-10 w-full text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-slate-800"
          >
            Voltar ao mapa
          </button>
        )}
      </footer>
    </aside>
  );
}
