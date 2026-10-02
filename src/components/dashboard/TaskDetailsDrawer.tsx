"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  User,
  MapPin,
  Clock,
  Map as MapIcon,
  MessageSquare,
  Loader2,
  Plus,
  CheckCircle,
  FileText,
  Ruler,
  PlayCircle,
  Pencil,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { deleteVisitServiceAction } from "@/actions/visit-services-actions";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hasValidMeasurements, formatMeasurementsReport, getMeasurementsDraftKey } from "@/lib/measurementsUtils";
import { INCOMPLETE_REASONS, formatIncompleteReason } from "@/lib/taskReasons";
import { isTaskActive, isTaskInProgress, isMeasurementService } from "@/lib/crm/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { geocodeTaskAddressAction, updateTaskCoordinatesAction } from "@/actions/task-location-actions";
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useBackToClose } from "@/hooks/useBackToClose";
import MeasurementsForm, {
  MeasurementsSaveButton,
  type MeasurementsFormHandle,
} from "@/components/features/measurements/MeasurementsForm";
import ContactPhoneList from "@/components/ui/ContactPhoneList";
import AddVisitServiceSheet from "@/components/dashboard/AddVisitServiceSheet";
import type { VisitService } from "@/lib/schemas";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import {
  isUrgentSchedulingNote,
  isUrgentVisitMarkdown,
} from "@/lib/crm/urgentSchedulingUi";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { dispatchOnboardingAddServiceSheetOpened } from "@/lib/onboarding/events";
import { createDemoExtraMaintenanceService } from "@/lib/onboarding/demoVisitExtras";
import { toUserMessage } from "@/lib/userMessages";
import { scrollFocusedFieldIntoView } from "@/lib/scrollFocusedField";
type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

interface TaskDetailsDrawerProps {
  selectedTask: any;
  setSelectedTask: (t: any) => void;
  isOnline: boolean;
  userName: string;
  mutateTasks: () => void;
  enqueueStatusUpdate: (id: string, status: string, reason: string, photos: string[], oppId: string) => Promise<QueueEnqueueResult>;
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
}: TaskDetailsDrawerProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const isDesktop = useMediaMinWidth(768);
  const drawerRef = useFocusTrap(!!selectedTask);
  const [reason, setReason] = useState("");
  const [reasonPreset, setReasonPreset] = useState("");
  const [statusAction, setStatusAction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingVisit, setIsStartingVisit] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "measurements">("info");
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<VisitService | null>(null);
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);
  const [measurementOppId, setMeasurementOppId] = useState<string | undefined>();
  const measurementsFormRef = useRef<MeasurementsFormHandle>(null);
  const drawerHandleRef = useRef<HTMLButtonElement>(null);
  const [drawerPanelEl, setDrawerPanelEl] = useState<HTMLElement | null>(null);
  const [measurementsSaving, setMeasurementsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const drawerLocked = isUploading || isStartingVisit || isGeocoding;

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const closeDrawer = useCallback(async () => {
    if (drawerLocked) return;
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
    setSelectedTask(null);
  }, [drawerLocked, statusAction, reason, newNoteText, confirm, setSelectedTask]);

  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const refreshVisit = () => {
    mutateTasks();
  };

  const handleDeleteExtraService = async (svc: VisitService) => {
    if (!selectedTask?.id || !svc.createdOnSite) return;
    if (!isOnline) {
      toast.error("Sem rede", "É necessária ligação à internet para apagar o serviço.");
      return;
    }
    const confirmed = await confirm({
      title: "Apagar este serviço?",
      description: `Tem a certeza que quer apagar este serviço? «${svc.name}» será removido do CRM de forma permanente.`,
      confirmLabel: "Apagar",
      cancelLabel: "Cancelar",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingOppId(svc.opportunityId);
    try {
      const result = await deleteVisitServiceAction({
        taskId: selectedTask.id,
        opportunityId: svc.opportunityId,
      });
      if (!result.success) {
        toast.error(
          "Não foi possível apagar o serviço",
          toUserMessage(result.error, "Não foi possível apagar o serviço.")
        );
        return;
      }
      toast.success("Serviço removido", "Eliminado do CRM.");
      setSelectedTask({
        ...selectedTask,
        services: (selectedTask.services || []).filter(
          (s: VisitService) => s.opportunityId !== svc.opportunityId
        ),
      });
      refreshVisit();
    } catch (e: unknown) {
      toast.error("Não foi possível apagar o serviço", toUserMessage(e, "Erro de ligação."));
    } finally {
      setDeletingOppId(null);
    }
  };

  const visitServices: VisitService[] = selectedTask?.services?.length
    ? selectedTask.services
    : selectedTask?.opportunityId
      ? [
          {
            opportunityId: selectedTask.opportunityId,
            name: selectedTask.title || "Serviço",
            nsi: selectedTask.nsi,
            stage: selectedTask.stage,
            serviceType: selectedTask.serviceType || "GERAL",
            mode: "now",
            isPrimary: true,
          },
        ]
      : [];

  const measurementServices = visitServices.filter(
    (s) =>
      isMeasurementService(s.stage, s.name) ||
      s.serviceType === "TIRAR_MEDIDAS" ||
      s.serviceType === "REMEDICAO"
  );

  const showMeasurementsTab =
    measurementServices.length > 0 ||
    isMeasurementService(selectedTask?.stage, selectedTask?.title);

  useEffect(() => {
    const defaultOpp =
      measurementServices[0]?.opportunityId || selectedTask?.opportunityId;
    setMeasurementOppId(defaultOpp);
  }, [selectedTask?.id, measurementServices.length, selectedTask?.opportunityId]);

  // Automatically switch tab if not measurement service
  useEffect(() => {
    if (!showMeasurementsTab) {
      setActiveTab("info");
    }
  }, [selectedTask, showMeasurementsTab]);

  // Load CRM notes
  useEffect(() => {
    if (!selectedTask?.opportunityId) {
      setNotes([]);
      return;
    }
    if (isOnboardingDemoEntity(selectedTask)) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }
    let cancelled = false;
    async function loadNotes() {
      if (!isOnline) {
        setNotes([]);
        setLoadingNotes(false);
        return;
      }
      setLoadingNotes(true);
      try {
        const result = await fetchOpportunityNotesAction(selectedTask.opportunityId, selectedTask.id);
        if (cancelled) return;
        if (result.success) {
          setNotes(result.data || []);
        }
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [selectedTask?.id, selectedTask?.opportunityId, isOnline]);

  useEffect(() => {
    const onTourGlobal = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (action === "closeDemoVisit") {
        setShowAddService(false);
        setEditingService(null);
      }
      if (action === "closeAddServiceSheet") {
        setShowAddService(false);
        setEditingService(null);
      }
    };
    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourGlobal);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourGlobal);
  }, []);

  useEffect(() => {
    if (!selectedTask || !isOnboardingDemoEntity(selectedTask)) return;

    const onTour = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;
      switch (action) {
        case "drawerTabInfo":
          setActiveTab("info");
          break;
        case "drawerTabMeasurements":
          setShowAddService(false);
          setEditingService(null);
          setActiveTab("measurements");
          break;
        case "drawerMarkInProgress":
          setSelectedTask({
            ...selectedTask,
            status: "EM_CURSO",
            taskStatus: "EM_CURSO",
          });
          break;
        case "drawerMarkScheduled":
          setSelectedTask({
            ...selectedTask,
            status: "AGENDADO",
            taskStatus: "AGENDADO",
          });
          break;
        case "openAddServiceSheet":
          setEditingService(null);
          setShowAddService(true);
          break;
        case "closeAddServiceSheet":
          setShowAddService(false);
          setEditingService(null);
          break;
        case "selectDemoConcluido":
          setStatusAction("Concluído");
          setReason("");
          break;
        case "selectDemoIncompleto":
          setStatusAction("Incompleto");
          setReasonPreset("cliente_ausente");
          setReason("");
          break;
        case "selectDemoCancelado":
          setStatusAction("Cancelado");
          setReasonPreset("outro");
          setReason("Formação — visita não realizada");
          break;
        default:
          break;
      }
    };

    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTour);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTour);
  }, [selectedTask, setSelectedTask]);

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !selectedTask?.opportunityId) return;
    if (isOnboardingDemoEntity(selectedTask)) {
      toast.info("Formação", "No guia as notas não são enviadas ao CRM.");
      setNewNoteText("");
      return;
    }
    try {
      setIsCreatingNote(true);
      const author = userName || "Técnico";
      const title = `Nota de ${author}`;
      const body = newNoteText.trim();

      const result = await enqueueNote(
        selectedTask.opportunityId,
        null,
        title,
        body,
        selectedTask.id
      );
      if (!result.success) {
        toast.error(
          "Erro ao criar nota",
          toUserMessage(result.error, "Não foi possível guardar a nota.")
        );
        return;
      }
      if (result.queued) {
        toast.info("Nota guardada offline", "Será sincronizada quando houver rede.");
      } else {
        toast.success("Nota registada", "Nota adicionada ao histórico do CRM.");
      }

      setNewNoteText("");
      if (isOnline && !result.queued) {
        try {
          const updated = await fetchOpportunityNotesAction(selectedTask.opportunityId);
          if (updated.success) {
            setNotes(updated.data || []);
          }
        } catch {
          /* rede instável — nota já foi criada */
        }
      }
    } catch (e: unknown) {
      toast.error("Erro ao criar nota", toUserMessage(e, "Erro ao criar nota."));
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleStartVisit = async () => {
    if (!selectedTask?.id) return;
    setIsStartingVisit(true);
    try {
      const result = await enqueueStatusUpdate(
        selectedTask.id,
        "EM_CURSO",
        "Técnico chegou ao local.",
        [],
        selectedTask.opportunityId
      );
      if (!result.success) {
        toast.error(
          "Erro",
          toUserMessage(result.error, "Não foi possível marcar visita em curso.")
        );
        return;
      }
      setSelectedTask({ ...selectedTask, status: "EM_CURSO" });
      mutateTasks();
      if (result.queued) {
        toast.info("Em curso (offline)", "Será sincronizado quando houver rede.");
      } else {
        toast.success("Em curso", "Visita marcada como em curso.");
      }
    } catch (e: unknown) {
      toast.error("Erro", toUserMessage(e, "Não foi possível marcar visita em curso."));
    } finally {
      setIsStartingVisit(false);
    }
  };

  const statusSuccessMessage = (action: string, queued: boolean): { title: string; description: string } => {
    if (queued) {
      return {
        title: "Guardado offline",
        description: `Estado ${action} guardado. A aguardar rede para sincronizar.`,
      };
    }
    switch (action) {
      case "Concluído":
        return { title: "Visita concluída", description: "Estado sincronizado com o CRM." };
      case "Incompleto":
        return {
          title: "Visita incompleta",
          description: "O escritório foi informado. Estado sincronizado com o CRM.",
        };
      case "Cancelado":
        return { title: "Visita cancelada", description: "Estado sincronizado com o CRM." };
      default:
        return { title: "Estado atualizado", description: "Sincronizado com o CRM." };
    }
  };

  const handleStatusUpdate = async () => {
    if (statusAction === "Concluído") {
      if (showMeasurementsTab) {
        const draftStr =
          typeof window !== "undefined"
            ? localStorage.getItem(
                getMeasurementsDraftKey(selectedTask.id, measurementOppId || selectedTask.opportunityId)
              )
            : null;

        if (!hasValidMeasurements(selectedTask?.report, draftStr)) {
          toast.error(
            "Medições Obrigatórias",
            "Este serviço é de Tirar Medidas. É estritamente obrigatório preencher e guardar as medidas (Largura x Altura) na aba 'Medições' antes de concluir a visita."
          );
          setActiveTab("measurements");
          return;
        }
      }
    }

    if (statusAction === "Incompleto" && !reasonPreset) {
      toast.warning("Motivo Obrigatório", "Selecione o motivo do serviço incompleto.");
      return;
    }

    if ((statusAction === "Incompleto" || statusAction === "Cancelado") && reasonPreset === "outro" && !reason.trim()) {
      toast.warning("Motivo Obrigatório", "Descreva a justificação do serviço incompleto ou cancelado.");
      return;
    }

    if (statusAction === "Cancelado" && !reason.trim()) {
      toast.warning("Motivo Obrigatório", "Descreva o motivo do cancelamento.");
      return;
    }

    const finalReason =
      statusAction === "Incompleto"
        ? formatIncompleteReason(reasonPreset, reason)
        : reason;

    if (statusAction === "Incompleto") {
      const ok = await confirm({
        title: "Marcar como incompleta?",
        description:
          "A visita sai da agenda ativa. Confirme que o motivo está correto antes de submeter.",
        confirmLabel: "Marcar incompleta",
        cancelLabel: "Voltar",
        destructive: true,
      });
      if (!ok) return;
    }

    if (statusAction === "Cancelado") {
      const ok = await confirm({
        title: "Cancelar esta visita?",
        description:
          "A visita será cancelada no CRM. Esta ação não pode ser anulada pelo técnico.",
        confirmLabel: "Cancelar visita",
        cancelLabel: "Voltar",
        destructive: true,
      });
      if (!ok) return;
    }

    setIsUploading(true);
    try {
      if (selectedTask.id) {
        let success = false;
        let errorMessage = "";
        let queued = false;

        const result = await enqueueStatusUpdate(
          selectedTask.id,
          statusAction,
          finalReason,
          [],
          selectedTask.opportunityId
        );
        success = result.success;
        queued = result.queued;
        if (!success) {
          errorMessage = toUserMessage(
            result.error,
            "Não foi possível atualizar o estado da visita."
          );
        }

        if (!success) {
          toast.error("Erro ao atualizar estado", errorMessage);
          return;
        }

        mutateTasks();

        if (isOnboardingDemoEntity(selectedTask)) {
          toast.success(
            "Formação concluída",
            "Nada foi enviado ao CRM — esta visita era só um exemplo do guia."
          );
        } else {
          const copy = statusSuccessMessage(statusAction, queued);
          if (queued) {
            toast.info(copy.title, copy.description);
          } else {
            toast.success(copy.title, copy.description);
          }
        }
      }

      setSelectedTask(null);
      setReason("");
      setReasonPreset("");
      setStatusAction("");
    } catch (error: unknown) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa", toUserMessage(error, "Erro ao atualizar tarefa."));
    } finally {
      setIsUploading(false);
    }
  };

  const measurementsFullscreen =
    showMeasurementsTab && activeTab === "measurements" && !isDesktop;

  const showMeasurementsSaveBar =
    activeTab === "measurements" &&
    showMeasurementsTab &&
    isTaskActive(selectedTask.status);

  const handleDrawerBackClose = useCallback(() => {
    if (showAddService) {
      setShowAddService(false);
      setEditingService(null);
      return;
    }
    if (measurementsFullscreen) {
      setActiveTab("info");
      return;
    }
    void closeDrawer();
  }, [showAddService, measurementsFullscreen, closeDrawer]);

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
      client: selectedTask.client,
      address: selectedTask.address,
      opportunityId: selectedTask.opportunityId,
      serviceType: selectedTask.serviceType,
    }),
    [
      selectedTask.id,
      selectedTask.nsi,
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
        className={`task-drawer-backdrop fixed inset-0 z-50 transition-opacity duration-300 ${
          measurementsFullscreen
            ? "bg-scrim"
            : "bg-scrim"
        }`}
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
          measurementsFullscreen
            ? "fixed inset-0 z-[60] flex min-h-0 max-h-[100dvh] w-full flex-col border-0 bg-background text-card-foreground shadow-none pb-[env(safe-area-inset-bottom)]"
            : "fixed bottom-0 left-0 z-[60] flex w-full min-h-0 max-h-[min(88dvh,720px)] flex-col rounded-t-3xl border border-border bg-card text-card-foreground shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:h-full md:max-w-md md:rounded-none md:border-l-2 md:border-t-0 md:shadow-xl"
        }
        onKeyDown={(e) => {
          if (e.key === "Escape" && !document.documentElement.hasAttribute("data-onboarding-tour")) {
            if (measurementsFullscreen) {
              setActiveTab("info");
            } else {
              void closeDrawer();
            }
          }
        }}
      >
        {!measurementsFullscreen ? (
          <button
            ref={drawerHandleRef}
            type="button"
            aria-label="Fechar visita — arraste para baixo"
            className="mx-auto flex min-h-12 w-full max-w-[12rem] shrink-0 touch-manipulation items-center justify-center rounded-full active:opacity-80"
            onClick={() => void closeDrawer()}
          >
            <span className="h-1.5 w-16 rounded-full bg-border" aria-hidden />
          </button>
        ) : null}

        {measurementsFullscreen ? (
          <div
            className="shrink-0 border-b border-border/90 bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
            data-tour="tech-drawer-measurements-focus"
          >
            <h2 id="task-drawer-title" className="sr-only">Medições da visita</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-tour="tech-drawer-tab-info"
                onClick={() => setActiveTab("info")}
                className="flex min-h-12 shrink-0 items-center gap-0.5 rounded-xl px-2 text-xs font-black uppercase tracking-wide text-foreground active:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
                Detalhes
              </button>
              <div className="min-w-0 flex-1" aria-hidden />
              {isTaskActive(selectedTask.status) ? (
                <button
                  type="button"
                  data-tour="tech-measurements-add-product"
                  onClick={() => measurementsFormRef.current?.addGroup()}
                  className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-ink-foreground active:scale-95"
                  aria-label="Novo produto"
                >
                  <Plus className="h-5 w-5 text-primary" aria-hidden />
                </button>
              ) : (
                <span className="min-w-12" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => void closeDrawer()}
                disabled={drawerLocked}
                className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted disabled:opacity-50"
                aria-label="Fechar medições"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {measurementServices.length > 1 ? (
              <div className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 custom-scrollbar">
                {measurementServices.map((svc) => (
                  <button
                    key={svc.opportunityId}
                    type="button"
                    onClick={() => setMeasurementOppId(svc.opportunityId)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black uppercase ${
                      measurementOppId === svc.opportunityId
                        ? "bg-primary text-primary-foreground border-2 border-border-strong"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!measurementsFullscreen ? (
        <div className="shrink-0 px-4 pb-2 pt-1 md:px-5">
          <div className="mb-2 flex items-start justify-between gap-2" data-tour="tech-drawer-header">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="task-drawer-title" className="text-base font-bold leading-snug text-foreground md:text-lg">{selectedTask.title}</h2>
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-primary">
                  NSI #{selectedTask.nsi}
                </span>
                {(isUrgentVisitMarkdown(selectedTask.report) ||
                  notes.some((n) => isUrgentSchedulingNote(n))) && (
                  <span className="rounded-xl border-2 border-danger-solid bg-danger-surface px-3 py-1 text-xs font-black uppercase tracking-wider text-danger-fg">
                    Visita urgente
                  </span>
                )}
              </div>
              {selectedTask.serviceType && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(Array.isArray(selectedTask.serviceType) ? selectedTask.serviceType : [selectedTask.serviceType]).map(
                    (tipo: any, idx: number) => {
                      const colors = getServiceTypeColor(tipo);
                      return (
                        <span
                          key={idx}
                          className="rounded-md border px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: `${colors.text}20`,
                          }}
                        >
                          {colors.label}
                        </span>
                      );
                    }
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void closeDrawer()}
              disabled={drawerLocked}
              className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-50"
              aria-label="Fechar detalhes da visita"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SEPARADOR E TAB HEADER PARA SERVIÇOS DE MEDIÇÃO (iDraft Glassmorphism) */}
          {showMeasurementsTab && (
            <div className="bg-muted p-1.5 rounded-2xl border border-border shadow-inner flex w-full max-w-lg mx-auto mb-8 gap-1.5" data-tour="tech-drawer-tabs">
              <button
                type="button"
                data-tour="tech-drawer-tab-info"
                onClick={() => setActiveTab("info")}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "info"
                    ? "bg-primary text-primary-foreground border-2 border-border-strong"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <FileText className="w-4 h-4" /> Detalhes & Visita
              </button>
              <button
                type="button"
                data-tour="tech-drawer-tab-measurements"
                onClick={() => setActiveTab("measurements")}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "measurements"
                    ? "bg-primary text-primary-foreground border-2 border-border-strong"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Ruler className="w-4 h-4" /> Medições do Estore
              </button>
            </div>
          )}
        </div>
        ) : null}

        <div
          data-tour-scroll="tech-drawer-body"
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar touch-manipulation ${
            measurementsFullscreen ? "px-3 py-2" : "p-4 pb-4 md:p-5"
          }`}
          onFocusCapture={(e) => scrollFocusedFieldIntoView(e.target)}
        >
          {/* ABA 1: INFORMAÇÕES DO CLIENTE & RELATÓRIO DO CRM */}
          {(activeTab === "info" || !showMeasurementsTab) && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5" data-tour="tech-drawer-client-card">
                  <CardContent className="p-0 space-y-3">
                    <p className="text-muted-foreground flex items-center gap-3 text-sm font-semibold">
                      <User className="w-5 h-5 text-primary-ink" /> <span className="text-foreground font-black">{selectedTask.client}</span>
                    </p>
                    <p className="text-muted-foreground flex items-start gap-3 text-sm font-semibold">
                      <MapPin className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                      <span className="text-foreground">{selectedTask.address}</span>
                    </p>
                    <p className="text-muted-foreground flex items-center gap-3 text-sm font-semibold">
                      <Clock className="w-5 h-5 text-primary-ink" />{" "}
                      <span className="text-foreground">
                        {selectedTask.dueDate.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    {selectedTask.isOverdue && (
                      <p className="text-warning-solid text-xs font-black uppercase tracking-wider bg-warning-surface border border-warning-border rounded-xl px-3 py-2">
                        Visita atrasada — conclua ou contacte o admin
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="flex flex-col items-center justify-center gap-2 p-4" data-tour="tech-drawer-contact-card">
                  {(selectedTask.clientPhones?.length ?? 0) > 0 || selectedTask.clientPhone ? (
                    <div className="w-full space-y-2">
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground text-center">
                        Telefones do cliente
                      </p>
                      <ContactPhoneList
                        phones={
                          selectedTask.clientPhones?.length
                            ? selectedTask.clientPhones
                            : selectedTask.clientPhone
                              ? [selectedTask.clientPhone]
                              : []
                        }
                        emptyLabel="Indisponível"
                        compact
                        className="justify-center"
                      />
                    </div>
                  ) : null}
                  {isTaskActive(selectedTask.status) && !isTaskInProgress(selectedTask.status) && (
                    <Button
                      data-tour="tech-drawer-start-visit"
                      onClick={handleStartVisit}
                      disabled={isStartingVisit}
                      className="w-full min-h-12 border-2 border-border-strong bg-primary py-3 font-black text-primary-foreground hover:bg-primary-hover"
                      loading={isStartingVisit}
                      loadingText="A iniciar visita..."
                    >
                      <PlayCircle className="mr-2 h-5 w-5" /> Cheguei ao local
                    </Button>
                  )}
                  <button
                    type="button"
                    disabled={isGeocoding}
                    onClick={async () => {
                      if (isOnboardingDemoEntity(selectedTask)) {
                        toast.info("Formação", "Sincronização de GPS simulada — nada foi enviado.");
                        return;
                      }
                      if (!isOnline) {
                        toast.warning("Sem rede", "A sincronização de GPS requer ligação à internet.");
                        return;
                      }
                      setIsGeocoding(true);
                      try {
                        toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
                        const geoResult = await geocodeTaskAddressAction(selectedTask.address);
                        if (!geoResult.success) {
                          throw new Error(geoResult.error || "Erro ao geolocalizar.");
                        }
                        const newCoords = geoResult.data;
                        if (newCoords && newCoords[0]) {
                          const coordResult = await updateTaskCoordinatesAction(
                            selectedTask.id,
                            newCoords[0],
                            newCoords[1]
                          );
                          if (!coordResult.success) {
                            throw new Error(coordResult.error || "Erro ao guardar coordenadas.");
                          }
                          setSelectedTask({
                            ...selectedTask,
                            coordinates: newCoords,
                          });
                          mutateTasks();
                          toast.success("GPS atualizado", "Coordenadas sincronizadas com o CRM.");
                        } else {
                          toast.error("GPS não encontrado", "Não foi possível geolocalizar a morada fornecida.");
                        }
                      } catch (e: unknown) {
                        toast.error("Erro no GPS", toUserMessage(e, "Não foi possível atualizar o GPS."));
                      } finally {
                        setIsGeocoding(false);
                      }
                    }}
                    className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-60"
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <MapIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    {isGeocoding ? "A sincronizar..." : "Sincronizar coordenadas"}
                  </button>
                  <NavigationChooser
                    address={selectedTask.address}
                    coordinates={selectedTask.coordinates}
                    label="Abrir no GPS / Waze"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover"
                  />
                </Card>
              </div>

              <div className="space-y-3" data-tour="tech-drawer-services">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground">
                    Serviços nesta visita
                  </h3>
                  {isTaskActive(selectedTask.status) && (
                    <button
                      type="button"
                      data-tour="tech-drawer-extra-add"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingService(null);
                        setShowAddService(true);
                        if (document.documentElement.dataset.onboardingTour === "technician") {
                          dispatchOnboardingAddServiceSheetOpened();
                        }
                      }}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
                      aria-label="Adicionar serviço extra no local"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {visitServices
                    .filter((svc) => svc.isPrimary)
                    .map((svc) => (
                      <div
                        key={svc.opportunityId}
                        className="rounded-2xl border border-border bg-muted px-4 py-3 text-xs font-semibold text-foreground"
                      >
                        <span className="font-black uppercase tracking-wide text-muted-foreground">
                          Serviço principal da visita
                        </span>
                        <p className="mt-1 text-sm text-foreground">
                          {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                        </p>
                      </div>
                    ))}

                  {visitServices.some((s) => s.createdOnSite) && (
                    <p className="pt-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Serviços extra no local (CRM)
                    </p>
                  )}

                  {visitServices
                    .filter((svc) => svc.createdOnSite)
                    .map((svc) => (
                      <div
                        key={svc.opportunityId}
                        className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/10/40 px-4 py-3 text-xs font-semibold text-foreground"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                          </span>
                          <span className="flex flex-wrap gap-2">
                            {svc.mode === "later" && (
                              <span className="rounded-full bg-warning-surface px-2 py-0.5 text-xs font-black uppercase text-warning-fg">
                                Agendar depois
                              </span>
                            )}
                            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-black uppercase text-primary-ink">
                              Registado no CRM
                            </span>
                          </span>
                        </div>
                        {svc.nsi && svc.nsi !== "N/A" && (
                          <span className="text-muted-foreground">NSI: {svc.nsi}</span>
                        )}
                        {isTaskActive(selectedTask.status) && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingService(svc);
                                setShowAddService(true);
                              }}
                              className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-border-strong bg-card text-xs font-black uppercase"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              type="button"
                              disabled={deletingOppId === svc.opportunityId}
                              onClick={() => handleDeleteExtraService(svc)}
                              className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-danger-border bg-danger-surface text-xs font-black uppercase text-danger-fg"
                            >
                              {deletingOppId === svc.opportunityId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Apagar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Secção de Notas e Instruções do CRM */}
              <div className="h-px bg-secondary w-full my-2"></div>
              <div className="space-y-4" data-tour="tech-drawer-notes">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary-ink" />
                    <h3 className="ds-title text-base tracking-tight text-foreground">
                      Notas Técnicas do CRM
                    </h3>
                  </div>
                  <span className="rounded-full border-2 border-border-strong bg-card px-3 py-1 text-xs font-black uppercase tracking-wider text-muted-foreground shadow-sm">
                    {notes.length} Notas
                  </span>
                </div>

                {/* Notas do CRM */}
                {loadingNotes ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs font-bold uppercase justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-ink" /> A carregar do Twenty...
                  </div>
                ) : !isOnline ? (
                  <p className="text-xs text-muted-foreground font-semibold bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
                    Notas indisponíveis offline. Ligação necessária para ver o histórico do CRM.
                  </p>
                ) : notes.length === 0 ? (
                  <p className="rounded-xl border-2 border-border-strong bg-card p-6 text-center text-xs text-muted-foreground">
                    Nenhuma instrução especial no histórico de notas do CRM.
                  </p>
                ) : (
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1.5 custom-scrollbar">
                    {notes.map((note) => {
                      const urgentNote = isUrgentSchedulingNote(note);
                      return (
                      <div
                        key={note.id}
                        className={`flex flex-col gap-2 rounded-2xl p-4 shadow-sm ${
                          urgentNote
                            ? "border-2 border-danger-solid bg-danger-surface/70"
                            : "border-2 border-border-strong bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <User className={`w-3.5 h-3.5 ${urgentNote ? "text-danger-solid" : "text-primary-ink"}`} />
                            {note.title?.trim()
                              ? formatNoteTitleForDisplay(note.title)
                              : "Técnico"}
                            {urgentNote && (
                              <span className="rounded-md border border-danger-border bg-danger-surface px-1.5 py-0.5 text-xs font-black text-danger-fg">
                                Urgente
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-black text-muted-foreground uppercase bg-muted border border-border px-2 py-0.5 rounded-md">
                            {new Date(note.createdAt).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-semibold whitespace-pre-line leading-relaxed ${
                            urgentNote ? "text-danger-fg" : "text-foreground"
                          }`}
                        >
                          {formatNoteBodyForDisplay(note.body)}
                        </p>
                      </div>
                    );
                    })}
                  </div>
                )}

                {/* Nova Nota */}
                <div className="mt-4 flex gap-2.5 items-end">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Escrever observação técnica ao CRM..."
                    className="flex-1 border-2 border-border-strong bg-card rounded-2xl px-4 py-3 text-xs text-foreground focus:ring-4 focus:ring-primary/25 focus:border-primary outline-none transition-all placeholder:text-muted-foreground h-12 resize-none font-bold shadow-sm"
                  />
                  <Button
                    variant="inverse"
                    onClick={handleAddNote}
                    disabled={isCreatingNote || !newNoteText.trim()}
                    className="h-12 rounded-2xl p-4"
                    aria-label="Adicionar nota ao CRM"
                  >
                    {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Fechar/Finalizar Tarefa */}
              {isTaskActive(selectedTask.status) && (
                <>
                  <div className="h-px bg-secondary w-full my-8"></div>
                  <div className="space-y-6" data-tour="tech-drawer-finalize">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary-ink" />
                      <h3 className="ds-title text-base tracking-tight text-foreground">Finalizar Visita Técnica</h3>
                    </div>

                    <div className="flex bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
                      <button
                        type="button"
                        disabled={isUploading}
                        data-tour="tech-drawer-status-concluido"
                        onClick={() => {
                          setStatusAction("Concluído");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                          statusAction === "Concluído"
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Concluído
                      </button>
                      <button
                        type="button"
                        disabled={isUploading}
                        data-tour="tech-drawer-status-incompleto"
                        onClick={() => {
                          setStatusAction("Incompleto");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                          statusAction === "Incompleto" ? "bg-warning-solid text-ink-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Incompleto
                      </button>
                      <button
                        type="button"
                        disabled={isUploading}
                        data-tour="tech-drawer-status-cancelado"
                        onClick={() => {
                          setStatusAction("Cancelado");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                          statusAction === "Cancelado" ? "bg-danger-solid text-ink-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Cancelado
                      </button>
                    </div>

                    {statusAction && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {statusAction === "Incompleto" && (
                          <div className="space-y-2">
                            <label className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
                              Motivo (obrigatório)
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              {INCOMPLETE_REASONS.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setReasonPreset(opt.id)}
                                  className={`text-left px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                                    reasonPreset === opt.id
                                      ? "bg-warning-surface border-warning-border text-warning-fg"
                                      : "bg-card border-border text-foreground"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {(reasonPreset === "outro" || reasonPreset) && (
                              <textarea
                                value={reason}
                                disabled={isUploading}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={reasonPreset === "outro" ? "Descreva o motivo..." : "Detalhes adicionais (opcional)"}
                                className="h-24 w-full rounded-xl border-2 border-border-strong bg-card px-5 py-4 font-bold text-foreground transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:opacity-60"
                              />
                            )}
                          </div>
                        )}

                        {statusAction === "Cancelado" && (
                          <div className="space-y-2">
                            <label className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
                              Motivo do cancelamento (obrigatório)
                            </label>
                            <textarea
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Descreva o motivo do cancelamento..."
                              className="h-24 w-full rounded-xl border-2 border-border-strong bg-card px-5 py-4 font-bold text-foreground transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/25"
                            />
                          </div>
                        )}

                        <Button
                          variant="inverse"
                          data-tour="tech-drawer-submit-report"
                          onClick={handleStatusUpdate}
                          disabled={isUploading}
                          className="w-full py-5 shadow-md"
                          loading={isUploading}
                        >
                          Submeter Relatório de Serviço
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ABA 2: MEDIÇÕES DE ESTORES (Dedicada e ultra limpa!) */}
          {activeTab === "measurements" && showMeasurementsTab && (
            <div className="animate-in fade-in duration-300">
              {!measurementsFullscreen && measurementServices.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {measurementServices.map((svc) => (
                    <button
                      key={svc.opportunityId}
                      type="button"
                      onClick={() => setMeasurementOppId(svc.opportunityId)}
                      className={`min-h-12 rounded-xl px-4 text-xs font-black uppercase ${
                        measurementOppId === svc.opportunityId
                          ? "bg-primary text-primary-foreground border-2 border-border-strong"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                    </button>
                  ))}
                </div>
              )}
              <MeasurementsForm
                ref={measurementsFormRef}
                saveBarMode="external"
                focusedLayout={measurementsFullscreen}
                task={selectedTask}
                opportunityId={measurementOppId || selectedTask.opportunityId}
                isAdmin={!isTaskActive(selectedTask.status)}
                onSave={async (data) => {
                  const oppId = measurementOppId || selectedTask.opportunityId;
                  if (!oppId) {
                    return { success: false, error: "Nenhum serviço selecionado para medições." };
                  }
                  let success = false;
                  let errorMessage = "";
                  let queued = false;

                  const result = await enqueueMeasurementsSave(selectedTask.id, oppId, data);
                  success = result.success;
                  queued = result.queued;
                  if (!success) {
                    errorMessage = toUserMessage(
                      result.error,
                      "Não foi possível guardar as medições."
                    );
                  }

                  if (!success) {
                    return { success: false, error: errorMessage };
                  }

                  const updatedReport = formatMeasurementsReport(data);
                  setSelectedTask({ ...selectedTask, report: updatedReport });
                  mutateTasks();
                  return { success: true, queued };
                }}
              />
            </div>
          )}
        </div>

        {showMeasurementsSaveBar && (
          <div
            className={`shrink-0 border-t border-border bg-card px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] ${
              measurementsFullscreen ? "" : "md:px-8 md:py-4"
            }`}
            data-tour="tech-drawer-measurements-save"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <MeasurementsSaveButton
              onClick={handleDrawerMeasurementsSave}
              loading={measurementsSaving}
              dataTour="tech-drawer-measurements-save-btn"
            />
          </div>
        )}
      </div>
      {showAddService && (
        <AddVisitServiceSheet
          task={addServiceTask}
          isOnline={isOnline}
          editService={editingService}
          onClose={() => {
            setShowAddService(false);
            setEditingService(null);
          }}
          onSaved={() => {
            if (isOnboardingDemoEntity(selectedTask)) {
              const extra = createDemoExtraMaintenanceService();
              const existing = selectedTask.services || visitServices;
              if (!existing.some((s: VisitService) => s.opportunityId === extra.opportunityId)) {
                setSelectedTask({
                  ...selectedTask,
                  services: [...existing, extra],
                });
              }
            }
            refreshVisit();
          }}
          enqueueVisitService={enqueueVisitService}
          technicianId={technicianId}
        />
      )}
    </>
  );
}
