"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { scrollFocusedFieldIntoView } from "@/lib/scrollFocusedField";
import {
  X,
  AlertCircle,
  Trash2,
  Calendar as CalendarIcon,
  Map as MapIcon,
  MapPin,
  Mail,
  Star,
  Loader2,
  User,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import { formatVisitServiceTypeLabel } from "@/lib/visitServiceTypeLabel";
import { buildTechVisitDrawerHeader } from "@/lib/techVisitDisplay";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { Opportunity } from '@/types/admin';
import { isNeedsSchedulingStage, isTaskCompleted, isTaskInProgress } from "@/lib/crm/contract";
import ContactPhoneList from "@/components/ui/ContactPhoneList";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { createOnboardingDemoMeasurementSheet } from "@/lib/onboarding/demoMeasurementSheet";
import AdminOpportunityMeasurements from "@/components/admin/AdminOpportunityMeasurements";
import {
  countSchedulingNotes,
  formatScheduleStatsLabel,
} from "@/lib/opportunityScheduleStats";

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

function AdminOppSection({
  title,
  action,
  children,
  className,
  ...props
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Panel className={cn("space-y-3 p-4", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="ds-kicker">{title}</h3>
        {action}
      </div>
      {children}
    </Panel>
  );
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
  const isDesktop = useMediaMinWidth(768);
  const drawerExpanded = !isDesktop;
  const isDemoOpp = isOnboardingDemoEntity(selectedOpportunity);
  const demoMeasurementSheet = useMemo(
    () => (isDemoOpp ? createOnboardingDemoMeasurementSheet() : null),
    [isDemoOpp]
  );

  const router = useAppRouter();
  const closeDrawer = () => setSelectedOpportunity(null);
  const { dismissForNavigation } = useBackToClose(
    Boolean(selectedOpportunity),
    closeDrawer,
    "admin-opp-drawer"
  );
  const navigateFromOpportunityDrawer = useCallback(
    (path: string) => {
      dismissForNavigation();
      router.push(path);
    },
    [dismissForNavigation, router]
  );
  useSwipeToDismiss({
    enabled: Boolean(selectedOpportunity) && drawerExpanded,
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

  const primaryServiceLabel = useMemo(() => {
    if (!selectedOpportunity) return undefined;
    const resolvedServiceType =
      typeof selectedOpportunity.serviceType === "string"
        ? selectedOpportunity.serviceType
        : selectedOpportunity.serviceType?.[0];
    return (
      formatVisitServiceTypeLabel({
        serviceType: resolvedServiceType,
        visitTitle: selectedOpportunity.title,
        stage: selectedOpportunity.stage,
      }) ||
      (resolvedServiceType ? getExtraServiceTypeLabel(resolvedServiceType) : undefined)
    );
  }, [selectedOpportunity]);

  const drawerHeader = useMemo(() => {
    if (!selectedOpportunity) return { heading: "Oportunidade", detail: "" };
    return buildTechVisitDrawerHeader({
      client: selectedOpportunity.client,
      title: selectedOpportunity.title,
      address: selectedOpportunity.address,
      omitServiceLabels: primaryServiceLabel ? [primaryServiceLabel] : undefined,
    });
  }, [selectedOpportunity, primaryServiceLabel]);

  const contactPhones = useMemo(() => {
    if (!selectedOpportunity) return [];
    if (selectedOpportunity.pointOfContactPhones?.length) {
      return selectedOpportunity.pointOfContactPhones;
    }
    if (selectedOpportunity.pointOfContactPhone) {
      return [selectedOpportunity.pointOfContactPhone];
    }
    return [];
  }, [selectedOpportunity]);

  const scheduleNoteStats = useMemo(() => countSchedulingNotes(notes), [notes]);
  const scheduleNoteLabel = useMemo(
    () => formatScheduleStatsLabel(scheduleNoteStats),
    [scheduleNoteStats]
  );

  if (!selectedOpportunity) return null;

  const visitInProgress = isTaskInProgress(selectedOpportunity.taskStatus);
  const technicianLabel =
    selectedOpportunity.technician && selectedOpportunity.technician !== "Não Atribuído"
      ? selectedOpportunity.technician
      : null;

  const canSchedule = isNeedsSchedulingStage(selectedOpportunity.stage);
  const isCompleted =
    ["PREPARACAO", "CONCLUIDO"].includes((selectedOpportunity.stage || "").toUpperCase()) ||
    isTaskCompleted(selectedOpportunity.taskStatus);

  return (
    <>
      <div
        className="admin-opp-backdrop fixed inset-0 z-50 bg-scrim"
        aria-hidden
        onClick={closeDrawer}
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
        className={cn(
          "fixed z-[60] flex min-h-0 flex-col overflow-hidden text-foreground",
          drawerExpanded
            ? "inset-0 max-h-[100dvh] w-full border-0 bg-muted"
            : "bottom-0 left-0 w-full max-h-[min(88dvh,720px)] rounded-t-2xl border-2 border-border-strong bg-muted pb-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:h-full md:max-w-[26rem] md:rounded-none md:border-l-2 md:border-t-0 md:pb-0 md:shadow-none"
        )}
        style={
          drawerExpanded
            ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }
            : undefined
        }
        onKeyDown={(e) => {
          if (e.key === "Escape" && !document.documentElement.hasAttribute("data-onboarding-tour")) {
            closeDrawer();
          }
        }}
      >
        {drawerExpanded ? (
          <button
            ref={drawerHandleRef}
            type="button"
            className="mx-auto flex min-h-10 w-full max-w-[12rem] shrink-0 touch-manipulation items-center justify-center rounded-full active:opacity-80"
            onClick={closeDrawer}
            aria-label="Fechar painel — arraste para baixo"
          >
            <span className="h-1.5 w-16 rounded-full bg-border" aria-hidden />
          </button>
        ) : null}

        <header
          className={cn(
            "shrink-0 border-b-2 border-border-strong bg-card px-4 py-3",
            drawerExpanded && "pt-[max(0.25rem,env(safe-area-inset-top))]"
          )}
        >
          <div className="flex items-start justify-between gap-2" data-tour="admin-opp-drawer-header">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Oportunidade
              </p>
              <h2
                id="opportunity-drawer-title"
                className="ds-title mt-1 truncate text-sm tracking-tight text-foreground"
              >
                {drawerHeader.heading}
              </h2>
              {drawerHeader.detail ? (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{drawerHeader.detail}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {primaryServiceLabel ? (
                  <span className="ds-chip ds-chip-neutral">{primaryServiceLabel}</span>
                ) : null}
                {selectedOpportunity.nsi && selectedOpportunity.nsi !== "N/A" ? (
                  <span className="ds-chip ds-chip-neutral">
                    NSI <span className="ds-num">#{selectedOpportunity.nsi}</span>
                  </span>
                ) : null}
                {selectedOpportunity.createdOnSite ? (
                  <span className="ds-chip ds-chip-info">Criado no local</span>
                ) : null}
                {technicianLabel ? (
                  <span className="ds-chip ds-chip-neutral">{technicianLabel}</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canSchedule && !selectedOpportunity.hasScheduledTask ? (
                <IconButton
                  variant="primary"
                  data-tour="admin-opp-schedule-btn"
                  aria-label="Agendar visita"
                  title="Agendar visita"
                  onClick={() => openScheduleModal(selectedOpportunity)}
                >
                  <CalendarIcon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </IconButton>
              ) : null}
              {selectedOpportunity.hasScheduledTask && !isCompleted ? (
                <IconButton
                  variant="danger"
                  data-tour="admin-opp-cancel-btn"
                  aria-label="Cancelar agendamento"
                  title="Cancelar agendamento"
                  onClick={() => handleCancelAppointment(selectedOpportunity)}
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </IconButton>
              ) : null}
              <IconButton variant="ghost" aria-label="Fechar detalhes" onClick={closeDrawer}>
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </IconButton>
            </div>
          </div>
        </header>

        <div
          data-tour-scroll="admin-opp-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted p-4 custom-scrollbar touch-manipulation"
          onFocusCapture={(e) => scrollFocusedFieldIntoView(e.target)}
        >
          <div className="space-y-4">
          {visitInProgress && (
            <Panel
              className="space-y-2 border-l-4 p-4 ds-accent-warning bg-warning-surface"
              data-tour="admin-opp-in-progress-banner"
            >
              <p className="ds-kicker text-warning-fg">Visita em curso</p>
              <p className="text-sm font-semibold text-warning-fg">
                {technicianLabel
                  ? `${technicianLabel} está no local do cliente.`
                  : "O técnico marcou que chegou ao local."}
              </p>
            </Panel>
          )}

          <AdminOppSection title="Local e agenda">
            <p className="flex items-start gap-3 text-sm font-semibold text-muted-foreground">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
              <span className="text-foreground">{selectedOpportunity.address}</span>
            </p>
            {selectedOpportunity.scheduledAt ? (
              <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <CalendarIcon className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
                <span className="text-foreground">
                  {isCompleted ? "Realizado: " : "Agendado: "}
                  <span className="ds-num">
                    {selectedOpportunity.scheduledAt instanceof Date
                      ? selectedOpportunity.scheduledAt.toLocaleString("pt-PT")
                      : new Date(selectedOpportunity.scheduledAt).toLocaleString("pt-PT")}
                  </span>
                </span>
              </p>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">Sem visita agendada.</p>
            )}
            {selectedOpportunity.visitOnSiteDurationLabel ? (
              <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <Clock className="h-5 w-5 shrink-0 text-info-solid" aria-hidden />
                <span className="text-foreground">
                  Tempo no local:{" "}
                  <span className="ds-num">{selectedOpportunity.visitOnSiteDurationLabel}</span>
                  <span className="block text-xs font-medium text-muted-foreground">
                    Entre «Cheguei ao local» e o encerramento na app.
                  </span>
                </span>
              </p>
            ) : null}
            {scheduleNoteLabel ? (
              <div className="space-y-0.5 text-xs font-semibold text-muted-foreground">
                <p>
                  Histórico: <span className="text-foreground">{scheduleNoteLabel}</span>
                </p>
                {scheduleNoteStats.schedulingNotes >= 2 ? (
                  <p className="font-medium">
                    Cada nota corresponde a um agendamento ou reagendamento pela operação.
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="md"
              className="mt-1 w-full"
              data-tour="admin-opp-gps-btn"
              onClick={() => handleUpdateGps(selectedOpportunity)}
            >
              <MapIcon className="mr-2 h-4 w-4" aria-hidden />
              Atualizar GPS
            </Button>
          </AdminOppSection>

            <AdminOppSection title="Contactos" data-tour="admin-opp-client-block">
              {contactPhones.length > 0 ? (
                <ContactPhoneList phones={contactPhones} emptyLabel="Indisponível" />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Telefone indisponível</p>
              )}
              <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-3">
                <div className="min-w-0">
                  <p className="ds-kicker">E-mail</p>
                  <p className="mt-1 truncate text-sm font-bold text-foreground">
                    {selectedOpportunity.pointOfContactEmail || "Indisponível"}
                  </p>
                </div>
                {selectedOpportunity.pointOfContactEmail ? (
                  <a
                    href={`mailto:${selectedOpportunity.pointOfContactEmail}`}
                    className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary-ink active:scale-95"
                    aria-label="Enviar e-mail ao cliente"
                  >
                    <Mail className="h-4 w-4 text-info-solid" />
                  </a>
                ) : null}
              </div>
            </AdminOppSection>

            <AdminOppSection
              title="Notas do CRM"
              data-tour="admin-opp-notes"
              action={
                <span className="ds-chip ds-chip-neutral">
                  {loadingNotes ? "…" : `${notes.length} notas`}
                </span>
              }
            >

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

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Linha do tempo
                </p>
                {loadingNotes ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden />
                    A carregar notas do CRM…
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhuma nota ou instrução no histórico.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border-2 border-border bg-muted p-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0 text-primary-ink" aria-hidden />
                            <span className="truncate">{formatNoteTitleForDisplay(note.title)}</span>
                          </span>
                          <span className="ds-num shrink-0">
                            {new Date(note.createdAt).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
                          {formatNoteBodyForDisplay(note.body)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminOppSection>

            {selectedOpportunity.twentyId ? (
              <AdminOpportunityMeasurements
                opportunityId={selectedOpportunity.twentyId}
                initialSheet={demoMeasurementSheet}
                onOpenSheet={navigateFromOpportunityDrawer}
              />
            ) : null}

            <AdminOppSection title="Comercial">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-border bg-muted p-3">
                  <p className="ds-kicker">Valor</p>
                  <p className="mt-1 text-lg font-black text-foreground">
                    {selectedOpportunity.amount ? (
                      <span className="ds-num">{selectedOpportunity.amount}€</span>
                    ) : (
                      "Sob orçamento"
                    )}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-border bg-muted p-3 text-right">
                  <p className="ds-kicker">Estado CRM</p>
                  <p className="mt-1 text-sm font-black uppercase text-foreground">
                    {selectedOpportunity.stage}
                  </p>
                </div>
              </div>
            </AdminOppSection>

            {!selectedOpportunity.coordinates && (
              <AdminOppSection
                title="Coordenadas em falta"
                className="border-l-4 ds-accent-warning bg-warning-surface"
              >
                <p className="text-sm font-medium text-warning-fg">
                  A geolocalização automática falhou. Pode indicar latitude e longitude manualmente.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Latitude"
                    className="ds-input min-h-12 flex-1 px-3 py-2 text-sm"
                    id="manual-lat"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Longitude"
                    className="ds-input min-h-12 flex-1 px-3 py-2 text-sm"
                    id="manual-lng"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    const latEl = document.getElementById("manual-lat") as HTMLInputElement;
                    const lngEl = document.getElementById("manual-lng") as HTMLInputElement;
                    handleManualCoordsUpdate(
                      selectedOpportunity,
                      latEl?.value ?? "",
                      lngEl?.value ?? ""
                    );
                  }}
                >
                  Guardar coordenadas
                </Button>
              </AdminOppSection>
            )}

            {selectedOpportunity.technicianReport ? (
              <AdminOppSection
                title="Relatório do técnico"
                className="border-l-4 ds-accent-warning bg-warning-surface"
                data-tour="admin-opp-report"
              >
                <p className="flex gap-2 text-sm font-medium leading-relaxed text-warning-fg">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-solid" aria-hidden />
                  <span className="italic">&ldquo;{selectedOpportunity.technicianReport}&rdquo;</span>
                </p>
              </AdminOppSection>
            ) : null}

            {selectedOpportunity.clientRating ? (
              <AdminOppSection title="Avaliação do cliente" className="border-l-4 ds-accent-info">
                <div className="flex items-center justify-between gap-2">
                  <ShieldCheck className="h-5 w-5 text-info-solid" aria-hidden />
                  <div className="flex gap-0.5" aria-label={`${selectedOpportunity.clientRating} em 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-4 w-4",
                          s <= (selectedOpportunity.clientRating || 0)
                            ? "fill-warning-solid text-warning-solid"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                </div>
                {selectedOpportunity.clientFeedback ? (
                  <p className="rounded-xl border-2 border-border bg-muted p-3 text-sm font-medium italic text-foreground">
                    &ldquo;{selectedOpportunity.clientFeedback}&rdquo;
                  </p>
                ) : null}
              </AdminOppSection>
            ) : null}

          </div>
        </div>
      </div>
    </>
  );
}
