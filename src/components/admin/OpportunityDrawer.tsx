"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { scrollFocusedFieldIntoView } from "@/lib/scrollFocusedField";
import { X, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import { formatVisitServiceTypeLabel } from "@/lib/visitServiceTypeLabel";
import { buildTechVisitDrawerHeader } from "@/lib/techVisitDisplay";
import { Opportunity } from "@/types/admin";
import { isNeedsSchedulingStage, isTaskCompleted, isTaskInProgress } from "@/lib/crm/contract";
import { canOpenRescheduleModal } from "@/lib/admin/scheduleFormPrefill";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { createOnboardingDemoMeasurementSheet } from "@/lib/demo/demoMeasurementSheet";
import AdminOpportunityMeasurements from "@/components/admin/AdminOpportunityMeasurements";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import { fairDurationForOpportunity } from "@/lib/admin/fairDurationDisplay";
import { useAdminOpportunityNotes } from "@/hooks/admin/useAdminOpportunityNotes";
import { OpportunityMetaSections } from "@/components/admin/drawer/OpportunityMetaSections";
import { OpportunityNotesSection } from "@/components/admin/drawer/OpportunityNotesSection";
import { OpportunityTailSections } from "@/components/admin/drawer/OpportunityTailSections";

export interface OpportunityDrawerProps {
  selectedOpportunity: Opportunity | null;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  handleCancelAppointment: (opp: Opportunity) => Promise<void> | void;
  handleUpdateGps: (opp: Opportunity) => Promise<void> | void;
  handleManualCoordsUpdate: (opp: Opportunity, lat: string, lng: string) => Promise<void> | void;
  openScheduleModal: (opp: Opportunity, options?: { reschedule?: boolean }) => void;
  fairServiceTypeDurations?: FairServiceTypeDuration[];
  fairBenchmarksReady?: boolean;
}

export default function OpportunityDrawer({
  selectedOpportunity,
  setSelectedOpportunity,
  handleCancelAppointment,
  handleUpdateGps,
  handleManualCoordsUpdate,
  openScheduleModal,
  fairServiceTypeDurations = [],
  fairBenchmarksReady = false,
}: OpportunityDrawerProps) {
  const {
    notes,
    loadingNotes,
    noteDraft,
    setNoteDraft,
    savingNote,
    scheduleNoteStats,
    scheduleNoteLabel,
    submitNote,
  } = useAdminOpportunityNotes(selectedOpportunity);

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

  const fairTypeDuration = useMemo(() => {
    if (!selectedOpportunity || !fairBenchmarksReady) return undefined;
    return fairDurationForOpportunity(fairServiceTypeDurations, selectedOpportunity);
  }, [fairBenchmarksReady, fairServiceTypeDurations, selectedOpportunity]);

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
  const canReschedule =
    canOpenRescheduleModal(selectedOpportunity) && !visitInProgress && !isCompleted;

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
          if (e.key === "Escape") {
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
                {selectedOpportunity.serviceNumber ? (
                  <span className="ds-chip ds-chip-neutral">
                    N.º <span className="ds-num">{selectedOpportunity.serviceNumber}</span>
                  </span>
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
              {canReschedule ? (
                <IconButton
                  variant="primary"
                  data-tour="admin-opp-reschedule-btn"
                  aria-label="Reagendar ou trocar técnico"
                  title="Reagendar / Trocar técnico"
                  onClick={() => openScheduleModal(selectedOpportunity, { reschedule: true })}
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

            <OpportunityMetaSections
              selectedOpportunity={selectedOpportunity}
              isCompleted={isCompleted}
              contactPhones={contactPhones}
              fairBenchmarksReady={fairBenchmarksReady}
              fairTypeDuration={fairTypeDuration}
              scheduleNoteLabel={scheduleNoteLabel}
              scheduleNoteStats={scheduleNoteStats}
              handleUpdateGps={handleUpdateGps}
            />

            <OpportunityNotesSection
              selectedOpportunity={selectedOpportunity}
              notes={notes}
              loadingNotes={loadingNotes}
              noteDraft={noteDraft}
              setNoteDraft={setNoteDraft}
              savingNote={savingNote}
              onSubmitNote={submitNote}
            />

            {selectedOpportunity.twentyId ? (
              <AdminOpportunityMeasurements
                opportunityId={selectedOpportunity.twentyId}
                initialSheet={demoMeasurementSheet}
                onOpenSheet={navigateFromOpportunityDrawer}
              />
            ) : null}

            <OpportunityTailSections
              selectedOpportunity={selectedOpportunity}
              handleManualCoordsUpdate={handleManualCoordsUpdate}
            />
          </div>
        </div>
      </div>
    </>
  );
}