"use client";

import {
  TrendingUp,
  TrendingDown,
  Star,
  Layers,
  Award,
  Target,
  BarChart3,
  Wallet,
  X,
} from "lucide-react";
import type { CeoMetrics } from "@/lib/schemas/ceoMetrics";

export interface CeoSummaryViewProps {
  metrics: CeoMetrics;
  selectedYear: number | null;
  selectedMonth: number | null;
  onSelectedMonthChange: (month: number | null) => void;
  maxMonthTotal: number;
}

export default function CeoSummaryView({
  metrics,
  selectedYear,
  selectedMonth,
  onSelectedMonthChange,
  maxMonthTotal,
}: CeoSummaryViewProps) {
  return (
    <>
{/* 0. INTELIGÊNCIA FINANCEIRA & REVENUE INTELLIGENCE (CLOSED WON, PIPELINE, LOST & WIN RATE) */}
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-success-surface text-success-fg text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-success-solid" />
                      Receita e pipeline comercial
                    </span>
                  </div>
                  <h2 className="ds-title mt-2 flex items-center gap-2 text-2xl tracking-tight text-foreground">
                    Desempenho Financeiro e Previsões ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Faturação conquistada • Obras em curso • Valor perdido • Taxa de vitória
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-ink text-ink-foreground px-4 py-2 rounded-2xl shadow-sm text-xs font-black">
                  <span className="text-primary-ink">Ticket Médio:</span>
                  <span>{metrics.financial.formattedAverageDealSize} / obra</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Receita Ganha (Closed Won) */}
                <div className="p-6 rounded-2xl bg-card border border-success-border shadow-sm relative overflow-hidden group hover:border-success-border transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-success-surface text-success-solid rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-success-surface text-success-fg px-2 py-0.5 rounded-lg">
                      Ganhas
                    </span>
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {metrics.financial.formattedWonRevenue}
                  </div>
                  <div className="text-xs font-black text-success-fg uppercase tracking-wider mt-1">
                    Faturação Conquistada
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                    <span>Obras Adjudicadas:</span>
                    <span className="font-bold text-foreground">{metrics.financial.wonDealsCount} concluídas</span>
                  </div>
                </div>

                {/* 2. Pipeline Forecast (Obras em Curso) */}
                <div className="p-6 rounded-2xl bg-card border border-info-border shadow-sm relative overflow-hidden group hover:border-info-border transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-info-surface text-info-solid rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-info-surface text-info-fg px-2 py-0.5 rounded-lg">
                      Pipeline Ativo
                    </span>
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {metrics.financial.formattedForecastPipeline}
                  </div>
                  <div className="text-xs font-black text-info-fg uppercase tracking-wider mt-1">
                    Previsão bruta
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                    <span>Previsão Ponderada:</span>
                    <span className="font-black text-info-solid">{metrics.financial.formattedWeightedForecast}</span>
                  </div>
                </div>

                {/* 3. Valor Perdido (Closed Lost) */}
                <div className="p-6 rounded-2xl bg-card border border-danger-border shadow-sm relative overflow-hidden group hover:border-danger-border transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-danger-surface text-danger-solid rounded-2xl">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-danger-surface text-danger-fg px-2 py-0.5 rounded-lg">
                      Perdidas
                    </span>
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {metrics.financial.formattedLostRevenue}
                  </div>
                  <div className="text-xs font-black text-danger-solid uppercase tracking-wider mt-1">
                    Valor Perdido / Cancelado
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                    <span>Orçamentos Recusados:</span>
                    <span className="font-bold text-danger-solid">{metrics.financial.lostDealsCount} perdidos</span>
                  </div>
                </div>

                {/* 4. Win Rate Financeiro (%) */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-sm relative overflow-hidden group hover:border-border transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-ink text-primary-ink rounded-2xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-muted text-foreground px-2 py-0.5 rounded-lg">
                      Taxa de vitória
                    </span>
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
                    <span>{metrics.financial.financialWinRate}</span>
                    <span className="text-sm font-bold text-muted-foreground">%</span>
                  </div>
                  <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1">
                    Taxa Sucesso em Valor
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(Math.max(metrics.financial.financialWinRate, 5), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground font-bold flex justify-between">
                    <span>{metrics.financial.dealWinRate}% em volume</span>
                    <span>Meta: &gt;70%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. KPIs OPERACIONAIS DO ANO (4 CARDS FULL WIDTH) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Oportunidades no Ano */}
              <div className="brutal-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-info-surface text-info-solid rounded-2xl">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {selectedYear ? `Ano ${selectedYear}` : "Geral"}
                  </span>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities}
                </div>
                <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1">
                  Total de Serviços no Ano
                </div>
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                  <span>Concluídos com Sucesso:</span>
                  <span className="font-bold text-success-solid">{metrics.overview.completedOpportunities}</span>
                </div>
              </div>

              {/* Taxa de Conversão */}
              <div className="brutal-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 text-primary-ink rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-primary-ink" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Conversão
                  </span>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  {metrics.overview.globalConversionRate}%
                </div>
                <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1">
                  Taxa de Conclusão Anual
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(metrics.overview.globalConversionRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Eficiência 1ª Visita */}
              <div className="brutal-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-info-surface text-info-solid rounded-2xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    No Terreno
                  </span>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  {metrics.overview.firstTimeSuccessRate}%
                </div>
                <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1">
                  Sucesso à 1ª Visita
                </div>
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                  <span>Reagendadas:</span>
                  <span className="font-bold text-warning-solid">{metrics.fieldEfficiency.incompleteTasks} visitas</span>
                </div>
              </div>

              {/* NPS / Avaliação Cliente */}
              <div className="brutal-panel rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-warning-surface text-warning-solid rounded-2xl">
                    <Star className="w-6 h-6 fill-warning-solid" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    NPS Clientes
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {metrics.overview.averageRating}
                  </div>
                  <div className="text-xs font-bold text-muted-foreground">/ 5.0</div>
                </div>
                <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1">
                  Satisfação Registada
                </div>
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                  <span>Opiniões:</span>
                  <span className="font-bold text-foreground">{metrics.overview.totalRatingsCount} avaliações</span>
                </div>
              </div>
            </div>

            {/* 2. EVOLUÇÃO MENSAL DOS SERVIÇOS NO ANO SELECIONADO (12 MESES) */}
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="ds-title flex items-center gap-2 text-xl tracking-tight text-foreground">
                    <BarChart3 className="w-5 h-5 text-primary-ink" />
                    Distribuição Mensal de Serviços ({selectedYear || "Todos os Anos"})
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Clica num mês para filtrar detalhadamente os serviços na tabela abaixo
                  </p>
                </div>

                {selectedMonth !== null && (
                  <button
                    onClick={() => onSelectedMonthChange(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-muted text-foreground text-xs font-bold transition-all w-fit"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar filtro de mês
                  </button>
                )}
              </div>

              {/* Matriz dos 12 Meses */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3">
                {metrics.monthlyEvolution.map((m) => {
                  const isSelected = selectedMonth === m.monthIndex;
                  const ratio = Math.round((m.total / maxMonthTotal) * 100);

                  return (
                    <button
                      key={m.monthIndex}
                      onClick={() => onSelectedMonthChange(isSelected ? null : m.monthIndex)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group ${
                        isSelected 
                          ? "bg-surface-card-dark text-ink-foreground border-surface-card-dark shadow-lg shadow-ink/10 scale-102"
                          : "bg-card text-foreground border-border hover:border-border hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? "text-primary-ink" : "text-muted-foreground"}`}>
                            {m.shortName}
                          </span>
                          {m.completed > 0 && (
                            <span className="w-2 h-2 rounded-full bg-success-solid" title={`${m.completed} concluídos`}></span>
                          )}
                        </div>
                        <div className="text-2xl font-black tracking-tight">
                          {m.total}
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-muted-foreground" : "text-muted-foreground"}`}>
                          Serviços
                        </div>
                        {m.revenue > 0 && (
                          <div className={`text-xs font-black mt-1 ${isSelected ? "text-primary-ink" : "text-success-solid"}`}>
                            {m.formattedRevenue}
                          </div>
                        )}
                      </div>

                      {/* Mini Barra Indicadora de Volume */}
                      <div className="mt-4 pt-2 border-t border-border/30">
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-primary" : "bg-muted-foreground/60 group-hover:bg-primary"}`}
                            style={{ width: `${Math.max(ratio, 8)}%` }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
    </>
  );
}
