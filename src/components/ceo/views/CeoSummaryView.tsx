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
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-600" />
                      Revenue & Commercial Pipeline
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    Desempenho Financeiro & Forecasting ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Faturação Conquistada (Closed Won) • Obras em Curso • Valor Perdido (Closed Lost) • Win Rate
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-sm text-xs font-black">
                  <span className="text-[#84cc16]">Ticket Médio:</span>
                  <span>{metrics.financial.formattedAverageDealSize} / obra</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Receita Ganha (Closed Won) */}
                <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                      Closed Won
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedWonRevenue}
                  </div>
                  <div className="text-xs font-black text-emerald-700 uppercase tracking-wider mt-1">
                    Faturação Conquistada
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>Obras Adjudicadas:</span>
                    <span className="font-bold text-slate-800">{metrics.financial.wonDealsCount} concluídas</span>
                  </div>
                </div>

                {/* 2. Pipeline Forecast (Obras em Curso) */}
                <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
                      Pipeline Ativo
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedForecastPipeline}
                  </div>
                  <div className="text-xs font-black text-blue-700 uppercase tracking-wider mt-1">
                    Forecasting Bruto
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>Previsão Ponderada:</span>
                    <span className="font-black text-blue-600">{metrics.financial.formattedWeightedForecast}</span>
                  </div>
                </div>

                {/* 3. Valor Perdido (Closed Lost) */}
                <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg">
                      Closed Lost
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedLostRevenue}
                  </div>
                  <div className="text-xs font-black text-rose-600 uppercase tracking-wider mt-1">
                    Valor Perdido / Cancelado
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>Orçamentos Recusados:</span>
                    <span className="font-bold text-rose-600">{metrics.financial.lostDealsCount} perdidos</span>
                  </div>
                </div>

                {/* 4. Win Rate Financeiro (%) */}
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-slate-900 text-[#84cc16] rounded-2xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      Win Rate
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                    <span>{metrics.financial.financialWinRate}</span>
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                  <div className="text-xs font-black text-slate-600 uppercase tracking-wider mt-1">
                    Taxa Sucesso em Valor
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#84cc16] h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(Math.max(metrics.financial.financialWinRate, 5), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 font-bold flex justify-between">
                    <span>{metrics.financial.dealWinRate}% em volume</span>
                    <span>Meta: &gt;70%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. KPIs OPERACIONAIS DO ANO (4 CARDS FULL WIDTH) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Oportunidades no Ano */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {selectedYear ? `Ano ${selectedYear}` : "Geral"}
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities}
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Total de Serviços no Ano
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Concluídos com Sucesso:</span>
                  <span className="font-bold text-emerald-600">{metrics.overview.completedOpportunities}</span>
                </div>
              </div>

              {/* Taxa de Conversão */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#84cc16]/10 text-[#84cc16] rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-lime-600" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Conversão
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.globalConversionRate}%
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Taxa de Conclusão Anual
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#84cc16] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(metrics.overview.globalConversionRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Eficiência 1ª Visita */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    No Terreno
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.firstTimeSuccessRate}%
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Sucesso à 1ª Visita
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Reagendadas:</span>
                  <span className="font-bold text-amber-600">{metrics.fieldEfficiency.incompleteTasks} visitas</span>
                </div>
              </div>

              {/* NPS / Avaliação Cliente */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                    <Star className="w-6 h-6 fill-amber-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    NPS Clientes
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-[#090d16] tracking-tight">
                    {metrics.overview.averageRating}
                  </div>
                  <div className="text-xs font-bold text-slate-400">/ 5.0</div>
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Satisfação Registada
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Opiniões:</span>
                  <span className="font-bold text-slate-900">{metrics.overview.totalRatingsCount} avaliações</span>
                </div>
              </div>
            </div>

            {/* 2. EVOLUÇÃO MENSAL DOS SERVIÇOS NO ANO SELECIONADO (12 MESES) */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#84cc16]" />
                    Distribuição Mensal de Serviços ({selectedYear || "Todos os Anos"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Clica num mês para filtrar detalhadamente os serviços na tabela abaixo
                  </p>
                </div>

                {selectedMonth !== null && (
                  <button
                    onClick={() => onSelectedMonthChange(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all w-fit"
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
                          ? "bg-[#121622] text-white border-[#121622] shadow-lg shadow-slate-900/10 scale-102"
                          : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? "text-[#84cc16]" : "text-slate-400"}`}>
                            {m.shortName}
                          </span>
                          {m.completed > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${m.completed} concluídos`}></span>
                          )}
                        </div>
                        <div className="text-2xl font-black tracking-tight">
                          {m.total}
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          Serviços
                        </div>
                        {m.revenue > 0 && (
                          <div className={`text-xs font-black mt-1 ${isSelected ? "text-[#84cc16]" : "text-emerald-600"}`}>
                            {m.formattedRevenue}
                          </div>
                        )}
                      </div>

                      {/* Mini Barra Indicadora de Volume */}
                      <div className="mt-4 pt-2 border-t border-slate-100/30">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-[#84cc16]" : "bg-slate-400 group-hover:bg-[#84cc16]"}`}
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
