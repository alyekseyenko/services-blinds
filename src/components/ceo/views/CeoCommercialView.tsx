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
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-warning-surface text-warning-fg text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-warning-solid" />
                      Gestão de contactos e funil
                    </span>
                  </div>
                  <h2 className="ds-title mt-2 flex items-center gap-2 text-xl tracking-tight text-foreground">
                    <CalendarDays className="w-5 h-5 text-warning-solid" />
                    Próximos contactos de acompanhamento
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Clientes e oportunidades com data de recontacto agendada no Twenty CRM
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-card px-4 py-2 rounded-2xl border border-border text-foreground shadow-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-warning-solid" />
                    <span>{metrics.upcomingFollowUps.length} acompanhamentos agendados</span>
                  </span>
                </div>
              </div>

              {metrics.upcomingFollowUps.length === 0 ? (
                <div className="text-center py-12 bg-card/70 rounded-2xl border border-border">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                        className={`p-5 rounded-2xl bg-card border transition-all flex flex-col justify-between group hover:shadow-md ${
                          isOverdue 
                            ? "border-danger-border hover:border-danger-border shadow-danger-surface" 
                            : isToday 
                            ? "border-success-border hover:border-success-border shadow-success-border"
                            : "border-border hover:border-border"
                        }`}
                      >
                        <div>
                          {/* Top Row: Urgency Tag & Stage */}
                          <div className="flex items-center justify-between mb-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-danger-surface text-danger-fg px-2 py-0.5 rounded-lg animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                Atrasado ({Math.abs(fu.daysRemaining)}d)
                              </span>
                            ) : isToday ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-success-surface text-success-fg px-2 py-0.5 rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-success-solid" />
                                Recontactar Hoje
                              </span>
                            ) : isTomorrow ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-warning-surface text-warning-fg px-2 py-0.5 rounded-lg">
                                <Clock className="w-3 h-3 text-warning-solid" />
                                Amanhã
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                                Em {fu.daysRemaining} dias
                              </span>
                            )}

                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                              {fu.stageLabel}
                            </span>
                          </div>

                          {/* Client / Deal Name */}
                          <div className="text-sm font-black text-foreground group-hover:text-info-solid transition-colors line-clamp-2 mb-1">
                            {fu.clientName}
                          </div>

                          {/* NSI & Contact Person */}
                          <div className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-2">
                            {fu.nsi && (
                              <span className="bg-muted ds-num font-black text-foreground px-1.5 py-0.5 rounded text-xs">
                                #{fu.nsi}
                              </span>
                            )}
                            {fu.contactPerson && (
                              <span className="truncate">{fu.contactPerson}</span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Phone, Amount & Date */}
                        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                          <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              {fu.formattedFollowUpDate}
                            </div>
                            <div className="ds-num font-black text-foreground mt-0.5">
                              {fu.formattedAmount}
                            </div>
                          </div>

                          {fu.contactPhone ? (
                            <a
                              href={`tel:${fu.contactPhone}`}
                              className="p-2.5 rounded-xl bg-ink text-primary-ink hover:bg-ink/90 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                              title={`Ligar para ${fu.contactPhone}`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span className="text-xs ds-num">{fu.contactPhone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem telefone</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. FUNIL COMERCIAL DO TWENTY CRM */}
            <div className="brutal-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div>
                  <h2 className="ds-title flex items-center gap-2 text-xl tracking-tight text-foreground">
                    <Layers className="w-5 h-5 text-primary-ink" />
                    Funil de Conversão Comercial (Twenty CRM)
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Distribuição das oportunidades pelas etapas do ciclo de vida no ano selecionado
                  </p>
                </div>
                <span className="text-xs font-bold bg-muted text-muted-foreground px-3 py-1.5 rounded-xl border border-border">
                  Total: {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities} Oportunidades
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {metrics.pipelineFunnel.map((item, index) => (
                  <div 
                    key={item.stage}
                    className="p-4 rounded-2xl bg-card border border-border shadow-sm hover:border-border transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Fase {index + 1}
                        </span>
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></span>
                      </div>
                      <div className="text-sm font-black text-foreground mb-1">
                        {item.label}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-foreground">
                          {item.count}
                        </div>
                        {item.totalAmount > 0 && (
                          <div className="text-xs font-black text-foreground mt-0.5">
                            {item.formattedTotalAmount}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">
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
