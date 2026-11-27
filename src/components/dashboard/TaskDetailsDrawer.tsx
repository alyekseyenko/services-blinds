"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { isTaskActive, isTaskInProgress } from "@/lib/crm/contract";
import { type RepairPaymentNote } from "@/lib/visits/repairPayment";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useBackToClose } from "@/hooks/useBackToClose";
import type { MeasurementsFormHandle } from "@/components/features/measurements/MeasurementsForm";
import type { MeasurementsFocusedStatus } from "@/components/features/measurements/MeasurementsFocusStatusBar";
import AddVisitServiceSheet from "@/components/dashboard/AddVisitServiceSheet";
import { VisitPhotoTray } from "@/components/dashboard/VisitPhotoTray";
import { VisitServiceFiles } from "@/components/dashboard/VisitServiceFiles";
import type { VisitService } from "@/lib/schemas";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { toUserMessage } from "@/lib/userMessages";
import { scrollFocusedFieldIntoView } from "@/lib/scrollFocusedField";
import { cn } from "@/lib/cn";
import { useTaskOpportunityNotes } from "@/components/dashboard/drawer/useTaskOpportunityNotes";
import { TaskDrawerHeader } from "@/components/dashboard/drawer/TaskDrawerHeader";
import { TaskDrawerClientSection } from "@/components/dashboard/drawer/TaskDrawerClientSection";
import { TaskDrawerServicesSection } from "@/components/dashboard/drawer/TaskDrawerServicesSection";
import { TaskDrawerNotesSection } from "@/components/dashboard/drawer/TaskDrawerNotesSection";
import { TaskDrawerFinalizeSection } from "@/components/dashboard/drawer/TaskDrawerFinalizeSection";
import { useTaskDrawerVisitActions } from "@/components/dashboard/drawer/useTaskDrawerVisitActions";
import { useRepairPaymentDrawerState } from "@/components/dashboard/drawer/useRepairPaymentDrawerState";
import { useTaskDrawerVisitModel } from "@/components/dashboard/drawer/useTaskDrawerVisitModel";
import { VisitTeamBanner } from "@/components/dashboard/drawer/VisitTeamBanner";
import {
  TaskDrawerMeasurementsTab,
  TaskDrawerMeasurementsSaveBar,
  TaskDrawerStatusSubmitBar,
} from "@/components/dashboard/drawer/TaskDrawerMeasurementsTab";
type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

interface TaskDetailsDrawerProps {
  selectedTask: any;
  setSelectedTask: (t: any) => void;
  isOnline: boolean;
  userName: string;
  mutateTasks: () => void;
  enqueueStatusUpdate: (
    id: string,
    status: string,
    reason: string,
    photos: string[],
    oppId: string,
    paymentNotes?: RepairPaymentNote[]
  ) => Promise<QueueEnqueueResult>;
  enqueueMeasurementsSave: (id: string, oppId: string, data: any) => Promise<QueueEnqueueResult>;
  enqueueNote: (
    oppId: string,
    personId: string | null,
    title: string,
    body: string,
    taskId?: string
  ) => Promise<QueueEnqueueResult>;
  enqueueVisitService: (payload: Record<string, unknown>) => Promise<QueueEnqueueResult & { opportunityId?: string }>;
  technicianId?: string;
  onRequestPhotoSync?: () => void;
  onPhotoQueueChanged?: () => void;
}

export default function TaskDetailsDrawer({
  selectedTask,
  setSelectedTask,
  isOnline,
  userName,
  mutateTasks,
  enqueueStatusUpdate,
  enqueueMeasurementsSave,
  enqueueNote,
  enqueueVisitService,
  technicianId,
  onRequestPhotoSync,
  onPhotoQueueChanged,
}: TaskDetailsDrawerProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const isDesktop = useMediaMinWidth(768);
  const drawerRef = useFocusTrap(!!selectedTask);
  const [reason, setReason] = useState("");
  const [reasonPreset, setReasonPreset] = useState("");
  const repairPayment = useRepairPaymentDrawerState();
  const [statusAction, setStatusAction] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "measurements">("info");
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<VisitService | null>(null);
  const [measurementOppId, setMeasurementOppId] = useState<string | undefined>();
  const measurementsFormRef = useRef<MeasurementsFormHandle>(null);
  const drawerHandleRef = useRef<HTMLButtonElement>(null);
  const finalizeSectionRef = useRef<HTMLDivElement>(null);
  const startVisitRef = useRef<HTMLDivElement>(null);
  const arrivalReminderTaskIdRef = useRef<string | null>(null);
  const [drawerPanelEl, setDrawerPanelEl] = useState<HTMLElement | null>(null);
  const [measurementsSaving, setMeasurementsSaving] = useState(false);
  const [measurementsDirty, setMeasurementsDirty] = useState(false);
  const [measurementsFocusedStatus, setMeasurementsFocusedStatus] =
    useState<MeasurementsFocusedStatus | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const {
    notes,
    loadingNotes,
    notesFromCache,
    newNoteText,
    setNewNoteText,
    isCreatingNote,
    hasUrgentNote,
    handleAddNote,
  } = useTaskOpportunityNotes({
    selectedTask,
    isOnline,
    userName,
    enqueueNote,
  });

  const guardMeasurementsDraft = useCallback(async (): Promise<boolean> => {
    const form = measurementsFormRef.current;
    if (!form?.hasUnsavedChanges) return true;
    if (form.canAutoSubmitDraft()) {
      await form.save();
      return true;
    }
    const ok = await confirm({
      title: "Medições por guardar",
      description:
        "Há alterações nas medições que ainda não foram enviadas. Sair sem guardar?",
      confirmLabel: "Sair sem guardar",
      cancelLabel: "Continuar a editar",
      destructive: true,
    });
    return ok;
  }, [confirm]);

  const refreshVisit = () => {
    mutateTasks();
  };

  const visitModel = useTaskDrawerVisitModel({
    selectedTask,
    setSelectedTask,
    mutateTasks,
    isOnline,
    statusAction,
    repairPayments: repairPayment.repairPayments,
    repairPaymentDetails: repairPayment.repairPaymentDetails,
  });

  const {
    deletingOppId,
    handleDeleteExtraService,
    visitServices,
    repairServices,
    repairPaymentMissing,
    filesOpportunityId,
    primaryServiceLabel,
    visitDrawerHeader,
    clientPhones,
    clientNifDisplay,
    showPrimaryServiceInList,
    primaryServiceColors,
    measurementServices,
    showMeasurementsTab,
    showActiveInstallationFicha,
    showMeasurementsUi,
  } = visitModel;

  useEffect(() => {
    const defaultOpp =
      measurementServices[0]?.opportunityId || selectedTask?.opportunityId;
    setMeasurementOppId(defaultOpp);
    setMeasurementsDirty(false);
    setMeasurementsFocusedStatus(null);
  }, [selectedTask?.id, measurementServices.length, selectedTask?.opportunityId]);

  // Automatically switch tab if not measurement service
  useEffect(() => {
    if (!showMeasurementsUi) {
      setActiveTab("info");
    }
  }, [selectedTask, showMeasurementsUi]);

  const mobileDrawerExpanded = !isDesktop;
  const isAssistantOnVisit = Boolean(
    technicianId &&
      selectedTask?.assigneeId &&
      technicianId !== selectedTask.assigneeId &&
      (selectedTask.assistantTechnicianIds ?? []).includes(technicianId)
  );
  const needsArrivalCheckIn =
    !isAssistantOnVisit &&
    isTaskActive(selectedTask.status) &&
    !isTaskInProgress(selectedTask.status);

  const promptArrivalCheckIn = useCallback(
    (detail?: string) => {
      toast.warning(
        "Registe a chegada",
        detail ??
          "Toque em «Cheguei ao local» assim que estiver no cliente — o escritório só conta o tempo de visita depois disso."
      );
      startVisitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [toast]
  );

  useEffect(() => {
    if (!selectedTask?.id || !needsArrivalCheckIn) return;
    if (arrivalReminderTaskIdRef.current === selectedTask.id) return;
    arrivalReminderTaskIdRef.current = selectedTask.id;
    const id = window.requestAnimationFrame(() => {
      promptArrivalCheckIn();
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedTask?.id, needsArrivalCheckIn, promptArrivalCheckIn]);

  const { isUploading, isStartingVisit, handleStartVisit, handleStatusUpdate } =
    useTaskDrawerVisitActions({
      selectedTask,
      setSelectedTask,
      mutateTasks,
      enqueueStatusUpdate,
      showMeasurementsTab,
      measurementOppId,
      setActiveTab,
      visitServices,
      repairPayment,
      statusAction,
      reason,
      reasonPreset,
      setReason,
      setReasonPreset,
      setStatusAction,
      needsArrivalCheckIn,
      promptArrivalCheckIn,
    });

  const drawerLocked = isUploading || isStartingVisit || isGeocoding;

  const closeDrawer = useCallback(async () => {
    if (drawerLocked) return;
    if (activeTab === "measurements" || measurementsDirty) {
      const canProceed = await guardMeasurementsDraft();
      if (!canProceed) return;
    }
    const dirty = Boolean(statusAction || reason.trim() || newNoteText.trim());
    if (dirty) {
      const ok = await confirm({
        title: "Descartar alterações?",
        description: "Tem texto ou uma ação de estado por submeter. Fechar mesmo assim?",
        confirmLabel: "Fechar",
        cancelLabel: "Continuar",
        destructive: true,
      });
      if (!ok) return;
    }
    arrivalReminderTaskIdRef.current = null;
    setMeasurementsDirty(false);
    setSelectedTask(null);
  }, [
    drawerLocked,
    activeTab,
    measurementsDirty,
    guardMeasurementsDraft,
    statusAction,
    reason,
    newNoteText,
    confirm,
    setSelectedTask,
  ]);

  const measurementsFullscreen =
    mobileDrawerExpanded && showMeasurementsUi && activeTab === "measurements";

  useEffect(() => {
    const root = document.documentElement;
    if (measurementsFullscreen) {
      root.dataset.techImmersive = "measurements";
    } else {
      delete root.dataset.techImmersive;
    }
    return () => {
      delete root.dataset.techImmersive;
    };
  }, [measurementsFullscreen]);

  const showMeasurementsSaveBar =
    activeTab === "measurements" &&
    showMeasurementsTab &&
    isTaskActive(selectedTask.status);

  const showStatusSubmitBar =
    mobileDrawerExpanded &&
    activeTab === "info" &&
    Boolean(statusAction) &&
    isTaskActive(selectedTask.status);

  useEffect(() => {
    if (!statusAction) return;
    const id = window.requestAnimationFrame(() => {
      finalizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [statusAction]);

  const leaveMeasurementsTab = useCallback(async (): Promise<boolean> => {
    const canProceed = await guardMeasurementsDraft();
    if (canProceed) {
      setActiveTab("info");
      return true;
    }
    return false;
  }, [guardMeasurementsDraft]);

  const handleDrawerBackClose = useCallback(() => {
    if (showAddService) {
      setShowAddService(false);
      setEditingService(null);
      return;
    }
    if (measurementsFullscreen) {
      void leaveMeasurementsTab();
      return;
    }
    void closeDrawer();
  }, [showAddService, measurementsFullscreen, closeDrawer, leaveMeasurementsTab]);

  useBackToClose(Boolean(selectedTask), handleDrawerBackClose, "tech-task-drawer");

  useSwipeToDismiss({
    enabled: Boolean(selectedTask) && !drawerLocked && !measurementsFullscreen,
    onDismiss: () => void closeDrawer(),
    handleElement: drawerHandleRef.current,
    panelElement: drawerPanelEl,
  });

  const handleDrawerMeasurementsSave = async () => {
    setMeasurementsSaving(true);
    try {
      await measurementsFormRef.current?.save();
    } finally {
      setMeasurementsSaving(false);
    }
  };

  const addServiceTask = useMemo(
    () => ({
      id: selectedTask.id,
      nsi: selectedTask.nsi || "",
      serviceNumber: selectedTask.serviceNumber,
      client: selectedTask.client,
      address: selectedTask.address,
      opportunityId: selectedTask.opportunityId,
      serviceType: selectedTask.serviceType,
    }),
    [
      selectedTask.id,
      selectedTask.nsi,
      selectedTask.serviceNumber,
      selectedTask.client,
      selectedTask.address,
      selectedTask.opportunityId,
      selectedTask.serviceType,
    ]
  );

  return (
    <>
      {/* Drawer Overlay */}
      <div
        className={cn(
          "task-drawer-backdrop fixed inset-0 z-50 bg-scrim transition-opacity duration-300",
          !mobileDrawerExpanded && "md:bg-scrim/45"
        )}
        onClick={() => void closeDrawer()}
        aria-hidden="true"
      />

      <div
        ref={(node) => {
          drawerRef.current = node;
          setDrawerPanelEl(node);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
        data-tour="tech-drawer"
        className={
          mobileDrawerExpanded
            ? "fixed inset-0 z-[60] flex min-h-0 max-h-[100dvh] w-full flex-col border-0 bg-background text-card-foreground shadow-none"
            : "fixed inset-y-0 right-0 z-[60] flex h-[100dvh] w-full max-w-[min(100%,28rem)] min-h-0 flex-col border-l-2 border-border-strong bg-card text-card-foreground shadow-xl lg:max-w-[32rem]"
        }
        style={
          mobileDrawerExpanded
            ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }
            : undefined
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (measurementsFullscreen) {
              void leaveMeasurementsTab();
            } else {
              void closeDrawer();
            }
          }
        }}
      >
        <TaskDrawerHeader
          measurementsFullscreen={measurementsFullscreen}
          mobileDrawerExpanded={mobileDrawerExpanded}
          drawerLocked={drawerLocked}
          selectedTask={selectedTask}
          visitDrawerHeader={visitDrawerHeader}
          primaryServiceLabel={primaryServiceLabel}
          primaryServiceColors={primaryServiceColors}
          hasUrgentNote={hasUrgentNote}
          showMeasurementsUi={showMeasurementsUi}
          activeTab={activeTab}
          measurementsDirty={measurementsDirty}
          measurementServices={measurementServices}
          measurementOppId={measurementOppId}
          setMeasurementOppId={setMeasurementOppId}
          measurementsFocusedStatus={measurementsFocusedStatus}
          measurementsFormRef={measurementsFormRef}
          onClose={closeDrawer}
          onLeaveMeasurementsTab={leaveMeasurementsTab}
          setActiveTab={setActiveTab}
          drawerHandleRef={drawerHandleRef}
        />

        <div
          data-tour-scroll="tech-drawer-body"
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar scroll-pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] scroll-pt-2 touch-manipulation ${
            measurementsFullscreen ? "px-3 py-2" : mobileDrawerExpanded ? "px-4 py-3 md:p-5" : "p-4 pb-4 md:p-5"
          }`}
          onFocusCapture={(e) => scrollFocusedFieldIntoView(e.target)}
        >
          {/* ABA 1: INFORMAÇÕES DO CLIENTE & RELATÓRIO DO CRM */}
          {(activeTab === "info" || !showMeasurementsUi) && (
            <div
              className={`animate-in fade-in duration-300 ${mobileDrawerExpanded ? "space-y-5" : "space-y-8"}`}
            >
              {needsArrivalCheckIn ? (
                <div
                  className="rounded-2xl border-2 border-warning-border bg-warning-surface px-4 py-3 text-sm font-semibold text-warning-fg dark:bg-ink/40"
                  role="status"
                >
                  <p className="font-black uppercase tracking-wide text-xs">Passo obrigatório</p>
                  <p className="mt-1 leading-snug">
                    Toque em <span className="font-bold">«Cheguei ao local»</span> quando estiver na morada do
                    cliente.
                  </p>
                </div>
              ) : null}

              {!isTaskActive(selectedTask.status) && showMeasurementsUi ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("measurements")}
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-border-strong bg-primary px-4 text-sm font-black text-primary-foreground"
                >
                  Ver ficha de medições
                </button>
              ) : null}

              <VisitTeamBanner
                task={selectedTask}
                isAssistant={isAssistantOnVisit}
                onRefresh={mutateTasks}
              />

              <TaskDrawerClientSection
                selectedTask={selectedTask}
                clientPhones={clientPhones}
                clientNifDisplay={clientNifDisplay}
                mobileDrawerExpanded={mobileDrawerExpanded}
                needsArrivalCheckIn={needsArrivalCheckIn}
                isStartingVisit={isStartingVisit}
                startVisitRef={startVisitRef}
                isOnline={isOnline}
                onStartVisit={handleStartVisit}
                setSelectedTask={setSelectedTask}
                mutateTasks={mutateTasks}
                onGeocodingChange={setIsGeocoding}
              />

              <TaskDrawerServicesSection
                selectedTask={selectedTask}
                visitServices={visitServices}
                showPrimaryServiceInList={showPrimaryServiceInList}
                needsArrivalCheckIn={needsArrivalCheckIn}
                deletingOppId={deletingOppId}
                extrasReadOnly={isAssistantOnVisit}
                masterName={selectedTask.technicianName}
                onPromptArrivalCheckIn={promptArrivalCheckIn}
                onAddExtra={() => {
                  if (isAssistantOnVisit) return;
                  setEditingService(null);
                  setShowAddService(true);
                }}
                onEditExtra={(svc) => {
                  setEditingService(svc);
                  setShowAddService(true);
                }}
                onDeleteExtra={handleDeleteExtraService}
              />

              <div className="h-px bg-secondary w-full my-2" />
              <TaskDrawerNotesSection
                notes={notes}
                loadingNotes={loadingNotes}
                notesFromCache={notesFromCache}
                isOnline={isOnline}
                newNoteText={newNoteText}
                setNewNoteText={setNewNoteText}
                isCreatingNote={isCreatingNote}
                onAddNote={() => void handleAddNote()}
              />

              {!isTaskActive(selectedTask.status) && filesOpportunityId && selectedTask.id ? (
                <VisitServiceFiles
                  taskId={selectedTask.id}
                  opportunityId={filesOpportunityId}
                />
              ) : null}

              {isTaskActive(selectedTask.status) && selectedTask.id ? (
                <div className="mt-6">
                  <VisitPhotoTray
                    taskId={selectedTask.id}
                    opportunityId={filesOpportunityId || selectedTask.opportunityId}
                    disabled={drawerLocked}
                    onRequestSync={onRequestPhotoSync}
                    onQueueChanged={onPhotoQueueChanged}
                  />
                </div>
              ) : null}

              {isTaskActive(selectedTask.status) ? (
                <TaskDrawerFinalizeSection
                  finalizeSectionRef={finalizeSectionRef}
                  statusAction={statusAction}
                  setStatusAction={setStatusAction}
                  setReason={setReason}
                  reason={reason}
                  reasonPreset={reasonPreset}
                  setReasonPreset={setReasonPreset}
                  isUploading={isUploading}
                  needsArrivalCheckIn={needsArrivalCheckIn}
                  onPromptArrivalCheckIn={promptArrivalCheckIn}
                  repairServices={repairServices}
                  repairPayment={repairPayment}
                  repairPaymentMissing={repairPaymentMissing}
                  showStatusSubmitBar={showStatusSubmitBar}
                  onSubmitStatus={handleStatusUpdate}
                />
              ) : null}
            </div>
          )}

          <TaskDrawerMeasurementsTab
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            mutateTasks={mutateTasks}
            measurementServices={measurementServices}
            measurementOppId={measurementOppId}
            setMeasurementOppId={setMeasurementOppId}
            measurementsFullscreen={measurementsFullscreen}
            showMeasurementsTab={showMeasurementsTab}
            showActiveInstallationFicha={showActiveInstallationFicha}
            showMeasurementsUi={showMeasurementsUi}
            activeTab={activeTab}
            measurementsFormRef={measurementsFormRef}
            setMeasurementsDirty={setMeasurementsDirty}
            setMeasurementsFocusedStatus={setMeasurementsFocusedStatus}
            enqueueMeasurementsSave={enqueueMeasurementsSave}
          />
        </div>

        <TaskDrawerMeasurementsSaveBar
          visible={showMeasurementsSaveBar}
          measurementsFullscreen={measurementsFullscreen}
          loading={measurementsSaving}
          onSave={handleDrawerMeasurementsSave}
        />

        <TaskDrawerStatusSubmitBar
          visible={showStatusSubmitBar}
          isUploading={isUploading}
          repairPaymentMissing={repairPaymentMissing}
          onSubmit={handleStatusUpdate}
        />
      </div>
      {showAddService && !isAssistantOnVisit && (
        <AddVisitServiceSheet
          task={addServiceTask}
          isOnline={isOnline}
          editService={editingService}
          onClose={() => {
            setShowAddService(false);
            setEditingService(null);
          }}
          onSaved={() => {
            refreshVisit();
          }}
          enqueueVisitService={enqueueVisitService}
          technicianId={technicianId}
        />
      )}
    </>
  );
}
