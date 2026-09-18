"use client";

import React, { useEffect } from 'react';
import { X, Brain, Sparkles, Navigation, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface ZoneInsight {
  name: string;
  priority: string;
  count: number;
  distance: number;
  logisticsCost: number;
  score: number;
}

interface AdminControlCenterProps {
  view: string;
  setView: (view: string) => void;
  isAdminMenuOpen: boolean;
  setIsAdminMenuOpen: (open: boolean) => void;
  loading: boolean;
  zoneInsights: ZoneInsight[];
  cityFilter: string | null;
  setCityFilter: (city: string | null) => void;
  mapTab: string;
  setMapTab: (tab: string) => void;
  categoryFilter: "all" | "medicoes" | "instalacoes" | "assistencia";
  setCategoryFilter: (filter: "all" | "medicoes" | "instalacoes" | "assistencia") => void;
  opportunitiesCount: number;
  unscheduledCount: number;
  scheduledCount: number;
  completedCount: number;
  cancelledCount: number;
  routeSelectionMode: boolean;
  setRouteSelectionMode: (mode: boolean) => void;
  autoGenerateRouteForZone: (zone: string) => void;
}

export default function AdminControlCenter({
  view,
  setView,
  isAdminMenuOpen,
  setIsAdminMenuOpen,
  loading,
  zoneInsights,
  cityFilter,
  setCityFilter,
  mapTab,
  setMapTab,
  categoryFilter,
  setCategoryFilter,
  opportunitiesCount,
  unscheduledCount,
  scheduledCount,
  completedCount,
  cancelledCount,
  routeSelectionMode,
  setRouteSelectionMode,
  autoGenerateRouteForZone
}: AdminControlCenterProps) {
  const trapRef = useFocusTrap(isAdminMenuOpen);

  useEffect(() => {
    if (!isAdminMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAdminMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isAdminMenuOpen, setIsAdminMenuOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={() => setIsAdminMenuOpen(false)}
        className={`fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-40 transition-opacity duration-300 ${isAdminMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Slide-over Control Center Drawer (PREMIUM LIGHT & GLASS DESIGN) */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-control-center-title"
        className={`fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white/95 backdrop-blur-xl border-l border-slate-200 text-slate-800 shadow-2xl z-50 transform transition-transform duration-500 ease-out flex flex-col ${isAdminMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center border border-lime-200">
              <Brain className="w-5 h-5 text-lime-600 animate-pulse" />
            </div>
            <div>
              <h2 id="admin-control-center-title" className="text-base font-black uppercase tracking-tight italic text-slate-900">Hub Estratégico IA</h2>
              <p className="mt-0.5 text-xs font-black uppercase tracking-widest text-slate-500">Filtros & Otimização Logística</p>
            </div>
          </div>
          <button 
            type="button"
            aria-label="Fechar painel"
            onClick={() => setIsAdminMenuOpen(false)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all border border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* Section: Filtro de Estados e Categorias */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Estado dos Serviços</h3>
              {cityFilter && (
                <span className="text-xs font-black text-lime-700 bg-lime-100 px-2.5 py-0.5 rounded-lg border border-lime-200 uppercase tracking-wider">
                  Filtro: {cityFilter}
                </span>
              )}
            </div>
            
            {/* Abas de Estado */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMapTab("all")}
                className={`py-3 px-1 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${mapTab === "all" ? "bg-slate-900 text-white border-slate-900 shadow-md animate-scale-in" : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800"}`}
              >
                Todos ({opportunitiesCount})
              </button>
              <button
                onClick={() => setMapTab("unscheduled")}
                className={`py-3 px-1 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${mapTab === "unscheduled" ? "bg-amber-500 text-white border-amber-500 shadow-md animate-scale-in" : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800"}`}
              >
                Pendentes ({unscheduledCount})
              </button>
              <button
                onClick={() => setMapTab("scheduled")}
                className={`py-3 px-1 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${mapTab === "scheduled" ? "bg-lime-500 text-slate-950 border-lime-500 shadow-md animate-scale-in" : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800"}`}
              >
                Agendados ({scheduledCount})
              </button>
            </div>

            {/* Abas de Categoria de Serviço */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest block">Categoria de Serviço</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`py-2 px-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all ${categoryFilter === "all" ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  📍 Ver Tudo
                </button>
                <button
                  onClick={() => setCategoryFilter("medicoes")}
                  className={`py-2 px-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all ${categoryFilter === "medicoes" ? "bg-pink-600 text-white border-pink-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  📐 Medições
                </button>
                <button
                  onClick={() => setCategoryFilter("instalacoes")}
                  className={`py-2 px-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all ${categoryFilter === "instalacoes" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  🔧 Instalações
                </button>
                <button
                  onClick={() => setCategoryFilter("assistencia")}
                  className={`py-2 px-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all ${categoryFilter === "assistencia" ? "bg-orange-600 text-white border-orange-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  🛠 Assistência
                </button>
              </div>
            </div>

            {cityFilter && (
              <button
                onClick={() => setCityFilter(null)}
                className="w-full py-2.5 bg-red-100/50 border border-red-200 text-red-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
              >
                Limpar Filtro Geográfico ({cityFilter})
              </button>
            )}
          </div>

          {/* Section: AI Logistics Insights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-lime-600" />
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Zonas Sugeridas (IA)</h3>
              </div>
              <span className="text-xs font-black text-lime-700 bg-lime-100 px-2 py-0.5 rounded-full border border-lime-200 uppercase tracking-widest">Sugerido</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-lime-600" />
              </div>
            ) : zoneInsights.length > 0 ? (
              <div className="space-y-3">
                {zoneInsights.map((insight, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setCityFilter(insight.name);
                      setMapTab("unscheduled");
                    }}
                    className={`p-4 bg-slate-50 rounded-2xl border transition-all cursor-pointer hover:border-lime-400 hover:bg-white group ${cityFilter === insight.name ? 'border-lime-500 ring-2 ring-lime-500/10 bg-white' : 'border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        insight.priority === 'Crítica' ? 'bg-red-500 text-white' : 
                        insight.priority === 'Alta' ? 'bg-amber-500 text-slate-950' : 'bg-lime-500 text-slate-950'
                      }`}>
                        {insight.priority}
                      </span>
                      <span className="text-xs font-black bg-white text-lime-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {insight.count} pendentes
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight italic group-hover:text-lime-600 transition-colors">
                      {insight.name}
                    </h4>

                    <div className="grid grid-cols-3 gap-2 mt-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-400">
                      <div>
                        <span className="block text-xs text-slate-400 uppercase tracking-wider">Distância</span>
                        <span className="text-slate-800 font-black text-xs">{insight.distance}km</span>
                      </div>
                      <div className="border-l border-slate-200 pl-2">
                        <span className="block text-xs text-slate-400 uppercase tracking-wider">Combustível</span>
                        <span className="text-red-500 font-black text-xs">~{insight.logisticsCost}€</span>
                      </div>
                      <div className="border-l border-slate-200 pl-2">
                        <span className="block text-xs text-slate-400 uppercase tracking-wider">Impacto</span>
                        <span className="text-lime-600 font-black text-xs">ALTO</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        autoGenerateRouteForZone(insight.name);
                        setIsAdminMenuOpen(false); // Auto close
                      }}
                      className="mt-3 w-full py-2.5 bg-lime-500 hover:bg-slate-950 text-slate-950 hover:text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-md shadow-lime-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Planear Roteiro de {insight.count}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">Nenhum insight disponível no momento.</p>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50/80 backdrop-blur-md">
          <button
            onClick={() => {
              setRouteSelectionMode(!routeSelectionMode);
              setIsAdminMenuOpen(false); // Close drawer to show map
            }}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-xl ${routeSelectionMode ? "bg-amber-500 text-white" : "bg-lime-500 text-slate-950 hover:bg-slate-950 hover:text-white shadow-lime-500/10"}`}
          >
            <Navigation className="w-4 h-4" />
            {routeSelectionMode ? "Concluir Seleção no Mapa" : "Ativar Seleção Manual (Mapa)"}
          </button>
        </div>
      </div>
    </>
  );
}
