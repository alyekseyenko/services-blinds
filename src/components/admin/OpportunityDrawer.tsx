"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { scrollFocusedFieldIntoView } from "@/lib/scrollFocusedField";
import { X, AlertCircle, Trash2, Calendar as CalendarIcon, Map as MapIcon, FileText, Phone, Mail, CreditCard, Star, Loader2, User, ShieldCheck } from "lucide-react";
import { getServiceTypeColor } from '@/lib/techniciansConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { Opportunity } from '@/types/admin';
import { isNeedsSchedulingStage, isTaskCompleted, isTaskInProgress } from "@/lib/crm/contract";
import ContactPhoneList from "@/components/ui/ContactPhoneList";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";

interface OpportunityDrawerProps {
  selectedOpportunity: Opportunity | null;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  handleCancelAppointment: (opp: Opportunity) => Promise<void> | void;
  handleUpdateGps: (opp: Opportunity) => Promise<void> | void;
  handleManualCoordsUpdate: (opp: Opportunity, lat: string, lng: string) => Promise<void> | void;
  openScheduleModal: (opp: Opportunity) => void;
}

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function OpportunityDrawer({
  selectedOpportunity,
  setSelectedOpportunity,
  handleCancelAppointment,
  handleUpdateGps,
  handleManualCoordsUpdate,
  openScheduleModal
}: OpportunityDrawerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const trapRef = useFocusTrap(Boolean(selectedOpportunity));
  const drawerHandleRef = useRef<HTMLButtonElement>(null);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const closeDrawer = () => setSelectedOpportunity(null);
  useBackToClose(Boolean(selectedOpportunity), closeDrawer, "admin-opp-drawer");
  useSwipeToDismiss({
    enabled: Boolean(selectedOpportunity),
    onDismiss: closeDrawer,
    handleElement: drawerHandleRef.current,
    panelElement: panelEl,
  });

  useEffect(() => {
    if (!selectedOpportunity?.twentyId) {
      setNotes([]);
      return;
    }
    const opportunity = selectedOpportunity;
    const twentyId = opportunity.twentyId;
    let cancelled = false;
    async function loadNotes() {
      if (isOnboardingDemoEntity(opportunity)) {
        setNotes([]);
        setLoadingNotes(false);
        return;
      }
      setLoadingNotes(true);
      try {
        const result = await fetchOpportunityNotesAction(twentyId);
        if (cancelled) return;
        if (result.success) {
          setNotes((result.data as Note[]) || []);
        } else {
          console.error("Erro ao carregar notas no Admin:", result.error);
        }
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedOpportunity?.twentyId, selectedOpportunity?.id]);

  if (!selectedOpportunity) return null;

  const visitInProgress = isTaskInProgress(selectedOpportunity.taskStatus);
  const technicianLabel =
    selectedOpportunity.technician && selectedOpportunity.technician !== "Não Atribuído"
      ? selectedOpportunity.technician
      : null;

  return (
    <>
      <div
        className="admin-opp-backdrop fixed inset-0 z-40 bg-scrim "
        aria-hidden
        onClick={() => setSelectedOpportunity(null)}
      />
      <div
        ref={(node) => {
          trapRef.current = node;
          setPanelEl(node);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-drawer-title"
        data-tour="admin-opp-drawer"
        className="fixed bottom-0 left-0 z-50 flex w-full max-h-[min(88dvh,720px)] flex-col rounded-t-3xl border border-border bg-card text-card-foreground shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-md lg:rounded-3xl"
      >
        <button
          ref={drawerHandleRef}
          type="button"
          className="mx-auto flex min-h-12 w-full max-w-[12rem] shrink-0 touch-manipulation items-center justify-center active:opacity-80"
          onClick={closeDrawer}
          aria-label="Fechar painel — arraste para baixo"
        >
          <span className="h-1.5 w-16 rounded-full bg-muted" aria-hidden />
        </button>
        <div
          data-tour-scroll="admin-opp-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-4 custom-scrollbar md:p-5"
          onFocusCapture={(e) => scrollFocusedFieldIntoView(e.target)}
        >
          {visitInProgress && (
            <div
              className="mb-4 rounded-2xl border border-warning-border/80 bg-warning-surface px-4 py-3 dark:border-warning-border/50 dark:bg-ink/40"
              data-tour="admin-opp-in-progress-banner"
            >
              <p className="text-xs font-black uppercase tracking-wider text-warning-fg dark:text-warning-fg">
                Visita em curso
              </p>
              <p className="mt-1 text-sm font-semibold text-warning-fg dark:text-warning-fg">
                {technicianLabel
                  ? `${technicianLabel} está no local do cliente.`
                  : "O técnico marcou que chegou ao local."}
              </p>
            </div>
          )}

          <div className="mb-3 flex w-full items-start gap-2" data-tour="admin-opp-drawer-header">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="opportunity-drawer-title"
                  className="text-base font-bold leading-snug text-foreground md:text-lg"
                >
                  {selectedOpportunity.title}
                </h2>
                <div className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  NSI #{selectedOpportunity.nsi}
                </div>
                {selectedOpportunity.createdOnSite && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-tighter text-primary-ink">
                    Criado no local
                  </div>
                )}
              </div>

              {selectedOpportunity.serviceType && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const colors = getServiceTypeColor(
                      typeof selectedOpportunity.serviceType === "string"
                        ? selectedOpportunity.serviceType
                        : selectedOpportunity.serviceType[0]
                    );
                    return (
                      <span
                        className="rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: `${colors.text}20`,
                        }}
                      >
                        {colors.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(() => {
                const canSchedule = isNeedsSchedulingStage(selectedOpportunity.stage);
                return (
                  canSchedule &&
                  !selectedOpportunity.hasScheduledTask && (
                    <button
                      type="button"
                      onClick={() => openScheduleModal(selectedOpportunity)}
                      data-tour="admin-opp-schedule-btn"
                      aria-label="Agendar visita"
                      title="Agendar visita"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-info-solid bg-info-solid text-ink-foreground shadow-md shadow-info-border/80 transition-colors hover:border-info-solid hover:bg-info-solid/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95"
                    >
                      <CalendarIcon className="h-4 w-4 text-ink-foreground" strokeWidth={2.25} aria-hidden />
                    </button>
                  )
                );
              })()}
              {(() => {
                const isCompleted =
                  ["PREPARACAO", "CONCLUIDO"].includes((selectedOpportunity.stage || "").toUpperCase()) ||
                  isTaskCompleted(selectedOpportunity.taskStatus);
                return (
                  selectedOpportunity.hasScheduledTask &&
                  !isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleCancelAppointment(selectedOpportunity)}
                      data-tour="admin-opp-cancel-btn"
                      aria-label="Cancelar agendamento"
                      title="Cancelar agendamento"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-danger-border bg-danger-surface text-danger-solid shadow-sm transition-colors hover:border-danger-border hover:bg-danger-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-border focus-visible:ring-offset-2 active:scale-95"
                    >
                      <Trash2 className="h-4 w-4 text-danger-solid" strokeWidth={2.25} aria-hidden />
                    </button>
                  )
                );
              })()}
              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSelectedOpportunity(null)}
                className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2"
              >
                <X className="h-6 w-6" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          
          <div className="mb-6 space-y-3 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Cliente:</span> {selectedOpportunity.client}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
              <p className="text-muted-foreground flex items-start gap-3 text-base flex-1">
                <MapIcon className="w-5 h-5 text-success-solid shrink-0 mt-0.5" /> 
                <span>{selectedOpportunity.address}</span>
              </p>
              <button
                type="button"
                data-tour="admin-opp-gps-btn"
                onClick={() => handleUpdateGps(selectedOpportunity)}
                className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-lg bg-success-surface px-3 py-2 text-xs font-medium text-success-fg shadow-sm transition-colors hover:bg-success-surface active:scale-[0.98]"
              >
                <MapIcon className="w-3.5 h-3.5" /> Atualizar GPS
              </button>
            </div>

            {/* Notas Importantes / Descrição da Avaria e Linha do Tempo de Notas */}
            <div className="bg-muted rounded-2xl p-5 border border-border mb-8 space-y-4" data-tour="admin-opp-notes">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-warning-surface p-1.5 rounded-lg">
                    <FileText className="w-4 h-4 text-warning-solid" />
                  </div>
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Histórico de Notas / Observações</h3>
                </div>
                <span className="text-xs font-black bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {loadingNotes ? "..." : `${notes.length} Notas`}
                </span>
              </div>

              {selectedOpportunity.report && (
                <div className="prose prose-sm max-w-none text-foreground pb-4 border-b border-border/60">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
                          <table className="min-w-full divide-y divide-border" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-black text-muted-foreground uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 text-sm text-muted-foreground border-t border-border font-medium" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold text-foreground mt-6 mb-2 flex items-center gap-2 border-b border-border pb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold text-foreground mt-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm text-muted-foreground font-medium" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-border" {...props} />,
                    }}
                  >
                    {selectedOpportunity.report}
                  </ReactMarkdown>
                </div>
              )}

              {/* Timeline das Notas do CRM */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Linha do Tempo de Notas (CRM)</p>
                {loadingNotes ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-warning-solid" /> Carregar notas do CRM...
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma nota ou instrução registada no histórico.</p>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3.5 bg-card rounded-xl border border-border shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-warning-solid" /> {formatNoteTitleForDisplay(note.title)}
                          </span>
                          <span>
                            {new Date(note.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-foreground text-xs font-medium leading-relaxed whitespace-pre-line">
                          {formatNoteBodyForDisplay(note.body)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!selectedOpportunity.coordinates && (
              <div className="bg-warning-surface border border-warning-border rounded-lg p-3">
                <p className="text-warning-fg text-sm font-medium mb-2">⚠️ Coordenadas não disponíveis</p>
                <p className="text-warning-solid text-xs mb-3">A geolocalização automática falhou para esta morada. Pode preencher manualmente:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Latitude (ex: 39.3576)"
                    className="min-h-12 flex-1 rounded-lg border border-warning-border px-3 py-2 text-base md:text-sm"
                    id="manual-lat"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Longitude (ex: -9.1754)"
                    className="min-h-12 flex-1 rounded-lg border border-warning-border px-3 py-2 text-base md:text-sm"
                    id="manual-lng"
                  />
                </div>
                <button
                  onClick={() => {
                    const latEl = document.getElementById('manual-lat') as HTMLInputElement;
                    const lngEl = document.getElementById('manual-lng') as HTMLInputElement;
                    const lat = latEl ? latEl.value : '';
                    const lng = lngEl ? lngEl.value : '';
                    handleManualCoordsUpdate(selectedOpportunity, lat, lng);
                  }}
                  className="mt-2 min-h-12 w-full rounded-lg bg-warning-solid py-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-warning-solid/90 active:scale-[0.98]"
                >
                  Atualizar Coordenadas
                </button>
              </div>
            )}
            
            <div className="bg-muted rounded-2xl p-4 space-y-3 border border-border" data-tour="admin-opp-client-block">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Contactos do Cliente</p>
              
              <div className="flex items-start gap-3">
                <div className="bg-info-surface p-2 rounded-lg shrink-0">
                  <Phone className="w-4 h-4 text-info-solid" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase leading-none mb-2">Telefones</p>
                  <ContactPhoneList
                    phones={
                      selectedOpportunity.pointOfContactPhones?.length
                        ? selectedOpportunity.pointOfContactPhones
                        : selectedOpportunity.pointOfContactPhone
                          ? [selectedOpportunity.pointOfContactPhone]
                          : []
                    }
                    emptyLabel="Indisponível"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-info-surface p-2 rounded-lg">
                    <Mail className="w-4 h-4 text-info-solid" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase leading-none mb-1">E-mail</p>
                    <p className="text-foreground font-bold truncate max-w-[200px]">{selectedOpportunity.pointOfContactEmail || 'Não disponível'}</p>
                  </div>
                </div>
                {selectedOpportunity.pointOfContactEmail && (
                  <a 
                    href={`mailto:${selectedOpportunity.pointOfContactEmail}`}
                    className="bg-card border border-border p-2 rounded-xl hover:bg-info-surface transition-colors shadow-sm"
                  >
                    <Mail className="w-4 h-4 text-info-solid" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-success-surface rounded-2xl p-4 border border-success-border">
              <div className="flex items-center gap-3">
                <div className="bg-success-surface p-2 rounded-lg">
                  <CreditCard className="w-4 h-4 text-success-solid" />
                </div>
                <div>
                  <p className="text-xs font-bold text-success-solid uppercase leading-none mb-1">Valor do Serviço</p>
                  <p className="text-success-fg font-black text-lg">
                    {selectedOpportunity.amount ? `${selectedOpportunity.amount}€` : 'Sob Orçamento'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-success-solid uppercase leading-none mb-1">Estado</p>
                <span className="bg-success-solid text-ink-foreground text-xs font-black px-2 py-1 rounded-lg">
                  {selectedOpportunity.stage}
                </span>
              </div>
            </div>
            
            {/* Relatório do Técnico (especialmente para Cancelados/Incompletos) */}
            {selectedOpportunity.technicianReport && (
              <div
                className="bg-warning-surface border border-warning-border rounded-2xl p-4 shadow-sm"
                data-tour="admin-opp-report"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-warning-solid" />
                  <p className="text-xs font-black text-warning-solid uppercase tracking-widest">Relatório do Técnico</p>
                </div>
                <p className="text-warning-fg text-sm font-medium leading-relaxed italic">
                  &ldquo;{selectedOpportunity.technicianReport}&rdquo;
                </p>
              </div>
            )}

            {/* Avaliação e Feedback do Cliente */}
            {selectedOpportunity.clientRating && (
              <div className="bg-info-surface border border-info-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-info-solid" />
                    <p className="text-xs font-black text-info-solid uppercase tracking-widest">Avaliação do Cliente</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= (selectedOpportunity.clientRating || 0) ? 'text-warning-solid fill-warning-solid' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                </div>
                {selectedOpportunity.clientFeedback && (
                  <p className="text-foreground text-sm font-medium leading-relaxed italic mt-1 bg-card/50 p-2 rounded-xl border border-info-border/50">
                    &ldquo;{selectedOpportunity.clientFeedback}&rdquo;
                  </p>
                )}
              </div>
            )}

            {(() => {
              const isCompleted =
                ["PREPARACAO", "CONCLUIDO"].includes((selectedOpportunity.stage || "").toUpperCase()) ||
                isTaskCompleted(selectedOpportunity.taskStatus);
              return selectedOpportunity.scheduledAt && (
                <div className={isCompleted ? "bg-success-surface rounded-2xl p-4 border border-success-border flex items-center gap-3" : "bg-info-surface rounded-2xl p-4 border border-info-border flex items-center gap-3"}>
                  <div className={isCompleted ? "bg-success-surface p-2 rounded-lg" : "bg-info-surface p-2 rounded-lg"}>
                    <CalendarIcon className={isCompleted ? "w-4 h-4 text-success-solid" : "w-4 h-4 text-info-solid"} />
                  </div>
                  <div>
                    <p className={isCompleted ? "text-xs font-bold text-success-solid uppercase leading-none mb-1" : "text-xs font-bold text-info-solid uppercase leading-none mb-1"}>
                      {isCompleted ? "Realizado em" : "Agendado para"}
                    </p>
                    <p className={isCompleted ? "text-success-fg font-black" : "text-info-fg font-black"}>
                      {selectedOpportunity.scheduledAt instanceof Date 
                        ? selectedOpportunity.scheduledAt.toLocaleString('pt-PT') 
                        : new Date(selectedOpportunity.scheduledAt).toLocaleString('pt-PT')}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="h-px bg-muted w-full mb-8"></div>

        </div>
      </div>
    </>
  );
}
