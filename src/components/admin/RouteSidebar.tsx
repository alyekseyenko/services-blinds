import React from 'react';
import { Navigation, Brain, Sparkles, Loader2, MapPin, Trash2, ShieldCheck } from "lucide-react";
import { RouteStop, RouteData } from '@/types/admin';

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
  optimizedRoute: any[] | null;
  setOptimizedRoute: (route: any[] | null) => void;
  isOptimizing: boolean;
  calculateOptimizedRoute: () => Promise<void> | void;
  aiAnalysis: any;
  setAiAnalysis: (analysis: any) => void;
  isAiAnalyzing: boolean;
  handleAiAudit: () => Promise<void> | void;
  unoptimizedTotalDistance: number | null;
  savingRatio: number;
  setShowMassScheduleModal: (show: boolean) => void;
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
  savingRatio,
  setShowMassScheduleModal
}: RouteSidebarProps) {
  return (
    <div className="w-full lg:w-[500px] xl:w-[550px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-2xl z-20 h-full max-h-full min-h-0 overflow-hidden shrink-0 animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-right-4 duration-300">
      
      {/* HEADER: Inputs de Custos (Design limpo, light, premium) */}
      <div className="p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-tight italic text-base">
            <div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center border border-lime-200">
              <Navigation className="w-4.5 h-4.5 text-lime-600" />
            </div>
            Roteiro do Dia
          </h3>
          <span className="text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {selectedForRoute.length} {selectedForRoute.length === 1 ? 'Paragem' : 'Paragens'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Preço Gasolina (€/L)</label>
            <input 
              type="number" 
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-lime-400/20 focus:border-lime-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Consumo (L/100km)</label>
            <input 
              type="number" 
              step="0.1"
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-lime-400/20 focus:border-lime-500 outline-none transition-all"
            />
          </div>
          <div className="col-span-2">
            <div className="flex justify-between items-end mb-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Custo Portagens Total (€)</label>
              {realRouteData?.hasTolls && (
                <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 animate-pulse uppercase tracking-widest">
                  Portagens Detetadas
                </span>
              )}
            </div>
            <div className="relative">
              <input 
                type="number" 
                step="0.5"
                value={tollCost}
                onChange={(e) => setTollCost(parseFloat(e.target.value) || 0)}
                className={`w-full pl-3 pr-24 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-lime-400/20 ${realRouteData?.hasTolls ? 'border-amber-400 text-amber-800 bg-amber-50/10 focus:border-amber-500' : 'border-slate-200 text-slate-800 focus:border-lime-500'}`}
              />
              {realRouteData?.hasTolls && tollCost === 0 && (
                <button 
                  onClick={() => setTollCost(Math.round(realRouteData.distanceKm * 0.08))}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-amber-500 text-white text-[9px] font-black rounded-lg hover:bg-amber-600 transition-colors uppercase tracking-wider"
                >
                  Estimar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI STRATEGY (Redesigned with beautiful, premium light purple card layout) */}
      {optimizedRoute && (
        <div className="shrink-0 px-6 mt-4">
          <div className="bg-purple-50/60 rounded-2xl border border-purple-100 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4.5 h-4.5 text-purple-600 animate-pulse" />
                <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-wider">Auditória Estratégica (IA)</h4>
              </div>
              {!aiAnalysis && (
                <button
                  onClick={handleAiAudit}
                  disabled={isAiAnalyzing}
                  className="bg-purple-600 hover:bg-slate-950 text-white text-[9px] font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
                >
                  {isAiAnalyzing ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Sparkles className="w-3 h-3 text-lime-300" />}
                  Auditar ROI
                </button>
              )}
            </div>

            {aiAnalysis ? (
              <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 border border-purple-100/80 shadow-inner space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-purple-50">
                  <span className="text-[9px] font-black text-purple-800 uppercase tracking-wider">Score de Eficiência</span>
                  <div className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${aiAnalysis.score > 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                    {aiAnalysis.score}/100
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px] font-medium text-slate-600 leading-relaxed">
                  <div>
                    <p className="text-[8px] font-black text-purple-800 uppercase tracking-wider mb-0.5">Logística</p>
                    <p className="italic">"{aiAnalysis.efficiency}"</p>
                  </div>
                  <div className="border-l border-purple-50 pl-2.5">
                    <p className="text-[8px] font-black text-purple-800 uppercase tracking-wider mb-0.5">Conselho de ROI</p>
                    <p className="text-emerald-700 font-bold">"{aiAnalysis.roi_advice}"</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiAnalysis(null)}
                  className="w-full text-[8px] text-slate-400 hover:text-slate-600 text-center uppercase font-black tracking-widest pt-1"
                >
                  Limpar Relatório
                </button>
              </div>
            ) : (
              <p className="text-[9px] text-purple-600/70 italic text-center font-bold">Analise esta rota para obter insights automáticos de combustível e impacto de faturação.</p>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO SCROLLABLE: Apenas a Lista de Serviços (Design limpo, light, premium) */}
      <div className="flex-1 min-h-0 relative mt-4">
        <div className="absolute inset-0 overflow-y-auto pr-1">
          <div className="px-6 pb-6 space-y-3">
            {selectedForRoute.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <MapPin className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-normal">Selecione serviços no mapa<br />para construir a sua rota.</p>
              </div>
            ) : (
              <>
                {/* Partida Card */}
                <div className="bg-lime-50/50 border border-lime-100/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                  <div className="w-9 h-9 bg-lime-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-lime-500/15">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-lime-700 uppercase tracking-widest">Partida do Roteiro</p>
                    <p className="text-sm text-slate-800 font-black tracking-tight mt-0.5">Sede - Caldas da Rainha</p>
                  </div>
                </div>

                {/* Timeline connector */}
                <div className="flex flex-col gap-1 items-center justify-center py-1">
                  <div className="w-0.5 h-3 bg-slate-200"></div>
                </div>

                <div className="space-y-3">
                  {(optimizedRoute || selectedForRoute).map((item, idx) => {
                    if (item.isReturn) {
                      return (
                        <div key="return-hq" className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                          <div className="w-9 h-9 bg-slate-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fim do Roteiro</p>
                            <p className="text-sm text-slate-800 font-black tracking-tight mt-0.5">Regresso à Sede (HQ)</p>
                            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                              <span className="text-[10px] text-lime-600 font-black flex items-center gap-1.5 uppercase tracking-wider">
                                <Navigation className="w-3.5 h-3.5" /> +{item.distanceFromLast} km
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                ~{Math.round(item.distanceFromLast * 2)} min (trânsito real)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id}>
                        <div className="group bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-lime-400 hover:shadow-lg transition-all relative">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-widest border border-slate-200">
                              Paragem #{idx + 1}
                            </span>
                            <button 
                              onClick={() => toggleSelectionForRoute(item)} 
                              className="text-slate-300 hover:text-red-500 transition-colors p-1"
                              title="Remover da Rota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="font-black text-slate-800 text-sm leading-snug uppercase tracking-tight italic group-hover:text-lime-600 transition-colors">{item.title}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-lime-500" /> {item.client}
                          </p>
                          
                          {item.distanceFromLast && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-lime-600 font-black flex items-center gap-1.5 uppercase tracking-wider">
                                <Navigation className="w-3.5 h-3.5" /> +{item.distanceFromLast} km
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                ~{Math.round(item.distanceFromLast * 2)} min (trânsito real)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Connector */}
                        <div className="flex flex-col gap-1 items-center justify-center py-1">
                          <div className="w-0.5 h-3 bg-slate-200"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Simulated return if not optimized */}
                {!optimizedRoute && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-start gap-3.5 opacity-60">
                    <div className="w-9 h-9 bg-slate-400 rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim Estimado</p>
                      <p className="text-sm text-slate-700 font-black tracking-tight mt-0.5">Regresso à Sede (HQ)</p>
                      <p className="text-[9px] text-slate-400 mt-1 italic">Distância calculada após otimização IA</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ: Totais Financeiros e Botões de Agendamento (Design de luxo, light) */}
      <div className="p-6 border-t border-slate-200 bg-white shrink-0 space-y-4 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
        {selectedForRoute.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-[9px] font-black text-lime-600 tracking-wider">
              <span>Métricas de Trânsito Real</span>
              <span className="bg-lime-100 px-1.5 py-0.5 rounded border border-lime-200 uppercase">Cálculo Google Maps</span>
            </div>
            
            {unoptimizedTotalDistance && realRouteData && unoptimizedTotalDistance > realRouteData.distanceKm && (
              <div className="space-y-1.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Redução Logística IA</span>
                  </div>
                  <div className="text-right font-black text-emerald-700 text-xs tracking-tighter">
                    <span>-{Math.max(0, (unoptimizedTotalDistance - realRouteData.distanceKm)).toFixed(1)} km</span>
                    <span className="mx-1.5 text-emerald-300">|</span>
                    <span>-{Math.max(0, (unoptimizedTotalDistance - realRouteData.distanceKm) * (fuelConsumption/100) * fuelPrice).toFixed(2)}€</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 border-t border-emerald-100/60 pt-1.5 mt-1.5 uppercase">
                  <span>Custo Não Otimizado</span>
                  <span className="line-through decoration-red-500/60 font-black">
                    {((unoptimizedTotalDistance * (fuelConsumption / 100) * fuelPrice) + tollCost).toFixed(2)}€
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-[10px] font-bold text-slate-500">
              <div>
                <span className="block text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Tempo de Viagem</span>
                <span className="text-slate-800 font-black">{realRouteData ? Math.floor(realRouteData.durationMin / 60) + 'h ' + (realRouteData.durationMin % 60) + 'm' : '...'}</span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="block text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Intervenção Estimada</span>
                <span className="text-slate-800 font-black">{Math.floor((selectedForRoute.length * 90) / 60)}h { (selectedForRoute.length * 90) % 60 }m</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Combustível ({realRouteData ? realRouteData.distanceKm.toFixed(1) : '0'} km)</span>
                <span className="font-black text-slate-800">
                  {realRouteData ? ((realRouteData.distanceKm * (fuelConsumption / 100) * fuelPrice)).toFixed(2) : "0.00"}€
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Portagens Associadas</span>
                <span className="font-black text-slate-800">{tollCost.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm font-black text-lime-700 border-t border-slate-200 pt-2.5 mt-1.5 uppercase">
                <span>Despesa Operacional</span>
                <span className="text-lg tracking-tight">
                  {realRouteData ? ((realRouteData.distanceKm * (fuelConsumption / 100) * fuelPrice) + tollCost).toFixed(2) : "0.00"}€
                </span>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${selectedForRoute.length > 5 ? 'bg-amber-500' : 'bg-lime-500'}`}
                style={{ width: `${Math.min(100, (selectedForRoute.length * 90 + (optimizedRoute ? optimizedRoute.reduce((acc, curr) => acc + (parseFloat(curr.distanceFromLast) || 0) * 2, 0) : 0)) / 4.8)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Buttons Section */}
        {!optimizedRoute ? (
          <button
            disabled={selectedForRoute.length < 1 || isOptimizing}
            onClick={calculateOptimizedRoute}
            className="w-full bg-lime-500 text-slate-950 font-black py-4 rounded-xl shadow-xl shadow-lime-500/10 hover:bg-slate-950 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
          >
            {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4.5 h-4.5" />}
            {selectedForRoute.length === 1 ? 'Calcular Despesas' : 'Otimizar Ordem de Paragens'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setOptimizedRoute(null)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all uppercase text-xs tracking-wider border border-slate-200"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                if (selectedForRoute.length > 0) {
                  setShowMassScheduleModal(true);
                }
              }}
              className="flex-[2] bg-lime-500 text-slate-950 font-black py-4 rounded-xl shadow-xl shadow-lime-500/10 hover:bg-slate-950 hover:text-white transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              Agendar Roteiro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
