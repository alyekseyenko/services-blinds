"use client";

import {
  Clock,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Flame,
  CalendarDays,
  Layers,
} from "lucide-react";
import CommercialServicesTable from "@/components/ceo/CommercialServicesTable";
import type { CeoMetrics, CeoServiceItem } from "@/lib/schemas/ceoMetrics";

export interface CeoCommercialViewProps {
  metrics: CeoMetrics;
  filteredServices: CeoServiceItem[];
  selectedYear: number | null;
  selectedMonth: number | null;
  stageFilter: string;
  onStageFilterChange: (stage: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export default function CeoCommercialView({
  metrics,
  filteredServices,
  selectedYear,
  selectedMonth,
  stageFilter,
  onStageFilterChange,
  searchQuery,
  onSearchQueryChange,
}: CeoCommercialViewProps) {
  return (
    <>
<CommercialServicesTable
              services={filteredServices}
              totalCount={metrics.servicesList.length}
              selectedYear={selectedYear}
              monthLabel={
                selectedMonth !== null
                  ? metrics.monthlyEvolution[selectedMonth - 1]?.monthName
                  : undefined
              }
              stageFilter={stageFilter}
              onStageFilterChange={onStageFilterChange}
              stageOptions={metrics.pipelineFunnel}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
            />

            {/* NOVO: PRÓXIMOS FOLLOW-UPS COMERCIAIS / CLIENTES */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Gestão de Contactos & Pipeline
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <CalendarDays className="w-5 h-5 text-amber-600" />
                    Próximos Follow-ups de Clientes
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Clientes e oportunidades com data de recontacto agendada no Twenty CRM
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-white px-4 py-2 rounded-2xl border border-slate-200 text-slate-800 shadow-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{metrics.upcomingFollowUps.length} follow-ups agendados</span>
                  </span>
                </div>
              </div>

              {metrics.upcomingFollowUps.length === 0 ? (
                <div className="text-center py-12 bg-white/70 rounded-2xl border border-slate-100">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Não existem follow-ups agendados para este período.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {metrics.upcomingFollowUps.map((fu) => {
                    const isOverdue = fu.urgencyStatus === "OVERDUE";
                    const isToday = fu.urgencyStatus === "TODAY";
                    const isTomorrow = fu.urgencyStatus === "TOMORROW";

                    return (
                      <div
                        key={fu.id}
                        className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between group hover:shadow-md ${
                          isOverdue 
                            ? "border-rose-200 hover:border-rose-300 shadow-rose-50" 
                            : isToday 
                            ? "border-emerald-200 hover:border-emerald-300 shadow-emerald-50"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div>
                          {/* Top Row: Urgency Tag & Stage */}
                          <div className="flex items-center justify-between mb-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                Atrasado ({Math.abs(fu.daysRemaining)}d)
                              </span>
                            ) : isToday ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Recontactar Hoje
                              </span>
                            ) : isTomorrow ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Amanhã
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                Em {fu.daysRemaining} dias
                              </span>
                            )}

                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                              {fu.stageLabel}
                            </span>
                          </div>

                          {/* Client / Deal Name */}
                          <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                            {fu.clientName}
                          </div>

                          {/* NSI & Contact Person */}
                          <div className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-2">
                            {fu.nsi && (
                              <span className="bg-slate-100 font-mono font-black text-slate-700 px-1.5 py-0.5 rounded text-xs">
                                #{fu.nsi}
                              </span>
                            )}
                            {fu.contactPerson && (
                              <span className="truncate">{fu.contactPerson}</span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Phone, Amount & Date */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              {fu.formattedFollowUpDate}
                            </div>
                            <div className="font-mono font-black text-slate-800 mt-0.5">
                              {fu.formattedAmount}
                            </div>
                          </div>

                          {fu.contactPhone ? (
                            <a
                              href={`tel:${fu.contactPhone}`}
                              className="p-2.5 rounded-xl bg-slate-900 text-[#84cc16] hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                              title={`Ligar para ${fu.contactPhone}`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span className="text-xs font-mono">{fu.contactPhone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sem telefone</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. FUNIL COMERCIAL DO TWENTY CRM */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#84cc16]" />
                    Funil de Conversão Comercial (Twenty CRM)
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Distribuição das oportunidades pelas etapas do ciclo de vida no ano selecionado
                  </p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                  Total: {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities} Oportunidades
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {metrics.pipelineFunnel.map((item, index) => (
                  <div 
                    key={item.stage}
                    className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Fase {index + 1}
                        </span>
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></span>
                      </div>
                      <div className="text-sm font-black text-[#090d16] mb-1">
                        {item.label}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {item.count}
                        </div>
                        {item.totalAmount > 0 && (
                          <div className="text-xs font-black text-slate-700 mt-0.5">
                            {item.formattedTotalAmount}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {item.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
    </>
  );
}
