"use client";

import {
  Users,
  Package,
  AlertTriangle,
  Award,
  Navigation,
  Gauge,
  MapPin,
  Trophy,
} from "lucide-react";
import { HQ_LABEL } from "@/lib/branding";
import type { CeoMetrics } from "@/lib/schemas/ceoMetrics";

export interface CeoOperationsViewProps {
  metrics: CeoMetrics;
  selectedYear: number | null;
}

export default function CeoOperationsView({ metrics, selectedYear }: CeoOperationsViewProps) {
  return (
    <>
{/* NOVO: PREVISÃO DE QUILÓMETROS PERCORRIDOS (ROTAS A PARTIR DA SEDE) */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      Ponto de Partida: {HQ_LABEL}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    Previsão de Quilómetros Percorridos por Técnico ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Cálculo geodésico diário (Sede ➔ Intervenções ➔ Regresso) ajustado com coeficiente de rede viária real (1.28)
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                  <Gauge className="w-6 h-6 text-[#84cc16]" />
                  <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Frota Estimado</div>
                    <div className="text-xl font-black text-slate-900">{metrics.fleetKmStats.totalFleetKm.toLocaleString("pt-PT")} km</div>
                  </div>
                </div>
              </div>

              {metrics.fleetKmStats.technicians.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Sem registo de viagens para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.fleetKmStats.technicians.map((tech, idx) => {
                    const maxKm = Math.max(...metrics.fleetKmStats.technicians.map(t => t.totalKm)) || 1;
                    const percent = Math.round((tech.totalKm / maxKm) * 100);

                    return (
                      <div 
                        key={tech.name} 
                        className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                {tech.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900">{tech.name}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  {tech.servicesCount} serviços • {tech.daysOnRoad} dias em rota
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 mb-4">
                            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                              Quilometragem Prevista
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-slate-900">{tech.totalKm.toLocaleString("pt-PT")}</span>
                              <span className="text-xs font-black text-lime-600">KM</span>
                            </div>

                            {/* Barra de Proporção */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                              <div 
                                className="bg-[#84cc16] h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(percent, 8)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Média / Serviço</div>
                            <div className="font-black text-slate-800 mt-0.5">{tech.avgKmPerService} km</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Média / Dia</div>
                            <div className="font-black text-slate-800 mt-0.5">{tech.avgKmPerDay} km</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOVO: RANKING EXECUTIVO DOS TÉCNICOS COM TAXA DE SUCESSO */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#84cc16]/20 text-[#090d16] text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Leaderboard Técnico
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Ranking de Técnicos: Serviços & Success Rate
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Classificação por volume de serviços concluídos e taxa de sucesso real (Concluídos vs Incompletos & Cancelados)
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span>Fórmula de Sucesso:</span>
                  <span className="font-mono text-slate-900 font-black">Concluídos ÷ (Concluídos + Incompletos + Cancelados)</span>
                </div>
              </div>

              {metrics.technicianRankings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Sem técnicos registados neste período.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.technicianRankings.map((tech) => {
                    const isFirst = tech.rank === 1;
                    const isSecond = tech.rank === 2;
                    const isThird = tech.rank === 3;

                    return (
                      <div
                        key={tech.name}
                        className={`p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                          isFirst 
                            ? "border-amber-300 ring-2 ring-amber-400/30" 
                            : isSecond 
                            ? "border-slate-300 ring-1 ring-slate-300/40" 
                            : isThird 
                            ? "border-amber-700/30" 
                            : "border-slate-100"
                        }`}
                      >
                        {/* Rank Badge / Medal */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              {isFirst ? (
                                <div className="w-9 h-9 rounded-full bg-amber-400 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-400/40">
                                  🥇
                                </div>
                              ) : isSecond ? (
                                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center">
                                  🥈
                                </div>
                              ) : isThird ? (
                                <div className="w-9 h-9 rounded-full bg-amber-700/20 text-amber-900 font-black text-sm flex items-center justify-center">
                                  🥉
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">
                                  #{tech.rank}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {tech.name}
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  {tech.totalTasks} tarefas totais
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-black text-slate-900 bg-[#84cc16]/20 px-2.5 py-1 rounded-xl">
                              {tech.successRate}%
                            </span>
                          </div>

                          {/* Success Rate Progress Bar */}
                          <div className="my-3">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              <span>Success Rate</span>
                              <span className="text-slate-800 font-black">{tech.successRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                  tech.successRate >= 80 
                                    ? "bg-[#84cc16]" 
                                    : tech.successRate >= 50 
                                    ? "bg-amber-400" 
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.max(tech.successRate, 5)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Breakdown: Concluídos, Incompletos, Cancelados */}
                          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 text-center my-2">
                            <div>
                              <div className="text-sm font-black text-emerald-600">
                                {tech.completedCount}
                              </div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Concluídos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.incompleteCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                                {tech.incompleteCount}
                              </div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Incompletos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.cancelledCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                {tech.cancelledCount}
                              </div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Cancelados
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: KM */}
                        {tech.totalKm > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Quilómetros:</span>
                            <span className="font-mono font-black text-slate-800">{tech.totalKm.toLocaleString("pt-PT")} km</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. COLUNA DUPLA: OPERAÇÃO NO TERRENO & ARMAZÉM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Eficiência dos Técnicos & Visitas */}
              <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Desempenho da Equipa Técnica
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Estado das intervenções agendadas no terreno
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <div className="text-emerald-700 font-black text-xl">
                        {metrics.fieldEfficiency.completedTasks}
                      </div>
                      <div className="text-xs font-black text-emerald-800 uppercase tracking-wider mt-1">
                        Concluídas
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <div className="text-amber-700 font-black text-xl">
                        {metrics.fieldEfficiency.incompleteTasks}
                      </div>
                      <div className="text-xs font-black text-amber-800 uppercase tracking-wider mt-1">
                        Reagendar
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="text-blue-700 font-black text-xl">
                        {metrics.fieldEfficiency.scheduledTasks}
                      </div>
                      <div className="text-xs font-black text-blue-800 uppercase tracking-wider mt-1">
                        Agendadas
                      </div>
                    </div>
                  </div>

                  {/* Top Técnicos */}
                  <div className="space-y-3">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Ranking de Resolução por Técnico
                    </div>
                    {metrics.topTechnicians.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sem tarefas registadas neste período.</p>
                    ) : (
                      metrics.topTechnicians.map((tech) => (
                        <div 
                          key={tech.name} 
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                              {tech.name.charAt(0)}
                            </div>
                            <span className="text-xs font-black text-slate-800">{tech.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-slate-500">{tech.completedCount} intervenções</span>
                            <span className="bg-[#84cc16]/15 text-[#090d16] font-black px-2.5 py-1 rounded-lg text-xs">
                              {tech.successRate}% taxa
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Fluxo do Armazém */}
              <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-amber-500" />
                    Fluxo Logístico & Armazém
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Preparação de peças para montagem e prontidão de materiais
                  </p>

                  <div className="p-6 rounded-3xl bg-slate-900 text-white mb-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black uppercase tracking-widest text-[#84cc16]">
                        Prontidão de Encomendas
                      </span>
                      <span className="text-2xl font-black text-white">
                        {metrics.warehouseStats.preparationRate}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
                      <div 
                        className="bg-[#84cc16] h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(metrics.warehouseStats.preparationRate, 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                      <div>
                        <div className="text-slate-400 font-medium">Peças Prontas</div>
                        <div className="text-lg font-black text-white mt-1">
                          {metrics.warehouseStats.preparedItems} un.
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">Em Preparação / Falta</div>
                        <div className="text-lg font-black text-amber-400 mt-1">
                          {metrics.warehouseStats.pendingItems} un.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed font-medium">
                      Obras só avançam para <strong>Agendamento de Instalação</strong> no Twenty CRM após 100% dos itens da encomenda estarem preparados pelo armazém.
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </>
  );
}
