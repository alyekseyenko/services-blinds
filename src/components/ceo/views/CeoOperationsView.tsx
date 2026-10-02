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
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-info-surface text-info-fg text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-info-solid" />
                      Ponto de Partida: {HQ_LABEL}
                    </span>
                  </div>
                  <h2 className="ds-title mt-2 flex items-center gap-2 text-xl tracking-tight text-foreground">
                    <Navigation className="w-5 h-5 text-info-solid" />
                    Previsão de Quilómetros Percorridos por Técnico ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Cálculo geodésico diário (Sede ➔ Intervenções ➔ Regresso) ajustado com coeficiente de rede viária real (1.28)
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-card px-5 py-3 rounded-2xl border border-border shadow-sm">
                  <Gauge className="w-6 h-6 text-primary-ink" />
                  <div>
                    <div className="text-xs font-black text-muted-foreground uppercase tracking-wider">Total Frota Estimado</div>
                    <div className="text-xl font-black text-foreground">{metrics.fleetKmStats.totalFleetKm.toLocaleString("pt-PT")} km</div>
                  </div>
                </div>
              </div>

              {metrics.fleetKmStats.technicians.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
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
                        className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between hover:border-border transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-ink text-ink-foreground font-black text-xs flex items-center justify-center">
                                {tech.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-black text-foreground">{tech.name}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  {tech.servicesCount} serviços • {tech.daysOnRoad} dias em rota
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="bg-muted p-4 rounded-xl border border-border/80 mb-4">
                            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
                              Quilometragem Prevista
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-foreground">{tech.totalKm.toLocaleString("pt-PT")}</span>
                              <span className="text-xs font-black text-primary-ink">KM</span>
                            </div>

                            {/* Barra de Proporção */}
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-3">
                              <div 
                                className="bg-primary h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(percent, 8)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
                          <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase">Média / Serviço</div>
                            <div className="font-black text-foreground mt-0.5">{tech.avgKmPerService} km</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase">Média / Dia</div>
                            <div className="font-black text-foreground mt-0.5">{tech.avgKmPerDay} km</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOVO: RANKING EXECUTIVO DOS TÉCNICOS COM TAXA DE SUCESSO */}
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-foreground text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-warning-solid" />
                      Classificação de técnicos
                    </span>
                  </div>
                  <h2 className="ds-title mt-2 flex items-center gap-2 text-xl tracking-tight text-foreground">
                    <Award className="w-5 h-5 text-warning-solid" />
                    Ranking de Técnicos: Serviços e Taxa de Sucesso
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Classificação por volume de serviços concluídos e taxa de sucesso real (Concluídos vs Incompletos & Cancelados)
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-card px-3.5 py-2 rounded-2xl border border-border/80 shadow-sm">
                  <span>Fórmula de Sucesso:</span>
                  <span className="ds-num text-foreground font-black">Concluídos ÷ (Concluídos + Incompletos + Cancelados)</span>
                </div>
              </div>

              {metrics.technicianRankings.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
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
                        className={`p-5 rounded-2xl bg-card border shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                          isFirst 
                            ? "border-warning-border ring-2 ring-warning-border/30" 
                            : isSecond 
                            ? "border-border ring-1 ring-border/40" 
                            : isThird 
                            ? "border-warning-border/30" 
                            : "border-border"
                        }`}
                      >
                        {/* Rank Badge / Medal */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              {isFirst ? (
                                <div className="w-9 h-9 rounded-full bg-warning-solid text-ink-foreground font-black text-sm flex items-center justify-center shadow-md shadow-warning-solid/40">
                                  🥇
                                </div>
                              ) : isSecond ? (
                                <div className="w-9 h-9 rounded-full bg-secondary text-foreground font-black text-sm flex items-center justify-center">
                                  🥈
                                </div>
                              ) : isThird ? (
                                <div className="w-9 h-9 rounded-full bg-warning-solid/20 text-warning-fg font-black text-sm flex items-center justify-center">
                                  🥉
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-muted text-foreground font-black text-xs flex items-center justify-center">
                                  #{tech.rank}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-black text-foreground group-hover:text-info-solid transition-colors">
                                  {tech.name}
                                </div>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  {tech.totalTasks} tarefas totais
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-black text-foreground bg-primary/20 px-2.5 py-1 rounded-xl">
                              {tech.successRate}%
                            </span>
                          </div>

                          {/* Success Rate Progress Bar */}
                          <div className="my-3">
                            <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              <span>Taxa de sucesso</span>
                              <span className="text-foreground font-black">{tech.successRate}%</span>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                  tech.successRate >= 80 
                                    ? "bg-primary" 
                                    : tech.successRate >= 50 
                                    ? "bg-warning-solid" 
                                    : "bg-danger-surface"
                                }`}
                                style={{ width: `${Math.max(tech.successRate, 5)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Breakdown: Concluídos, Incompletos, Cancelados */}
                          <div className="grid grid-cols-3 gap-1.5 bg-muted p-2.5 rounded-xl border border-border/80 text-center my-2">
                            <div>
                              <div className="text-sm font-black text-success-solid">
                                {tech.completedCount}
                              </div>
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Concluídos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.incompleteCount > 0 ? "text-warning-solid" : "text-muted-foreground"}`}>
                                {tech.incompleteCount}
                              </div>
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Incompletos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.cancelledCount > 0 ? "text-danger-solid" : "text-muted-foreground"}`}>
                                {tech.cancelledCount}
                              </div>
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Cancelados
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: KM */}
                        {tech.totalKm > 0 && (
                          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>Quilómetros:</span>
                            <span className="ds-num font-black text-foreground">{tech.totalKm.toLocaleString("pt-PT")} km</span>
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
              <div className="brutal-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="ds-title mb-2 flex items-center gap-2 text-lg tracking-tight text-foreground">
                    <Users className="w-5 h-5 text-info-solid" />
                    Desempenho da Equipa Técnica
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                    Estado das intervenções agendadas no terreno
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-success-surface border border-success-border rounded-2xl p-4">
                      <div className="text-success-fg font-black text-xl">
                        {metrics.fieldEfficiency.completedTasks}
                      </div>
                      <div className="text-xs font-black text-success-fg uppercase tracking-wider mt-1">
                        Concluídas
                      </div>
                    </div>
                    <div className="bg-warning-surface border border-warning-border rounded-2xl p-4">
                      <div className="text-warning-solid font-black text-xl">
                        {metrics.fieldEfficiency.incompleteTasks}
                      </div>
                      <div className="text-xs font-black text-warning-fg uppercase tracking-wider mt-1">
                        Reagendar
                      </div>
                    </div>
                    <div className="bg-info-surface border border-info-border rounded-2xl p-4">
                      <div className="text-info-fg font-black text-xl">
                        {metrics.fieldEfficiency.scheduledTasks}
                      </div>
                      <div className="text-xs font-black text-info-fg uppercase tracking-wider mt-1">
                        Agendadas
                      </div>
                    </div>
                  </div>

                  {/* Top Técnicos */}
                  <div className="space-y-3">
                    <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      Ranking de Resolução por Técnico
                    </div>
                    {metrics.topTechnicians.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sem tarefas registadas neste período.</p>
                    ) : (
                      metrics.topTechnicians.map((tech) => (
                        <div 
                          key={tech.name} 
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-black text-xs text-foreground">
                              {tech.name.charAt(0)}
                            </div>
                            <span className="text-xs font-black text-foreground">{tech.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-muted-foreground">{tech.completedCount} intervenções</span>
                            <span className="bg-primary/15 text-foreground font-black px-2.5 py-1 rounded-lg text-xs">
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
              <div className="brutal-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="ds-title mb-2 flex items-center gap-2 text-lg tracking-tight text-foreground">
                    <Package className="w-5 h-5 text-warning-solid" />
                    Fluxo Logístico & Armazém
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                    Preparação de peças para montagem e prontidão de materiais
                  </p>

                  <div className="p-6 rounded-3xl bg-ink text-ink-foreground mb-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black uppercase tracking-widest text-primary-ink">
                        Prontidão de Encomendas
                      </span>
                      <span className="text-2xl font-black text-ink-foreground">
                        {metrics.warehouseStats.preparationRate}%
                      </span>
                    </div>

                    <div className="w-full bg-secondary h-3 rounded-full overflow-hidden mb-6">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(metrics.warehouseStats.preparationRate, 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-strong text-xs">
                      <div>
                        <div className="text-muted-foreground font-medium">Peças Prontas</div>
                        <div className="text-lg font-black text-ink-foreground mt-1">
                          {metrics.warehouseStats.preparedItems} un.
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground font-medium">Em Preparação / Falta</div>
                        <div className="text-lg font-black text-warning-solid mt-1">
                          {metrics.warehouseStats.pendingItems} un.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-warning-surface border border-warning-border/60 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-solid shrink-0 mt-0.5" />
                    <div className="text-xs text-warning-fg leading-relaxed font-medium">
                      Obras só avançam para <strong>Agendamento de Instalação</strong> no Twenty CRM após 100% dos itens da encomenda estarem preparados pelo armazém.
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </>
  );
}
