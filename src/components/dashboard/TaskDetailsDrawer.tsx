"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, User, MapPin, Clock, Map as MapIcon, MessageSquare, Loader2, Plus, CheckCircle, FileText, Ruler, PlayCircle, Pencil, Trash2 } from "lucide-react";
import { deleteVisitServiceAction } from "@/actions/visit-services-actions";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hasValidMeasurements, formatMeasurementsReport, getMeasurementsDraftKey } from "@/lib/measurementsUtils";
import { INCOMPLETE_REASONS, formatIncompleteReason } from "@/lib/taskReasons";
import { isTaskActive, isTaskInProgress, isMeasurementService } from "@/lib/crm/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { geocodeTaskAddressAction, updateTaskCoordinatesAction } from "@/actions/task-location-actions";
import { completeTaskAction } from "@/actions/tasks-actions";
import { fetchOpportunityNotesAction, createOpportunityNoteAction } from "@/actions/notes-actions";
import { submitMeasurementsAction } from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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

interface TaskDetailsDrawerProps {
  selectedTask: any;
  setSelectedTask: (t: any) => void;
  isOnline: boolean;
  userName: string;
  mutateTasks: () => void;
  enqueueStatusUpdate: (id: string, status: string, reason: string, photos: string[], oppId: string) => Promise<{ queued: boolean }>;
  enqueueMeasurementsSave: (id: string, oppId: string, data: any) => Promise<{ queued: boolean }>;
  enqueueNote: (
    oppId: string,
    personId: string | null,
    title: string,
    body: string,
    taskId?: string
  ) => Promise<{ queued: boolean }>;
  enqueueVisitService: (payload: Record<string, unknown>) => Promise<{ queued?: boolean; opportunityId?: string }>;
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
}: TaskDetailsDrawerProps) {
  const toast = useToast();
  const confirm = useConfirm();
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
  const [measurementsSaving, setMeasurementsSaving] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const refreshVisit = () => {
    mutateTasks();
  };

  const handleDeleteExtraService = async (svc: VisitService) => {
    if (!selectedTask?.id || !svc.createdOnSite) return;
    const confirmed = await confirm({
      title: "Apagar este serviço?",
      description: `Tem a certeza que quer apagar este serviço? «${svc.name}» será removido do CRM de forma permanente.`,
      confirmLabel: "Apagar",
      cancelLabel: "Cancelar",
      destructive: true,
    });
    if (!confirmed) return;

    if (!isOnline) {
      toast.error("É necessária ligação à internet para apagar o serviço.");
      return;
    }

    setDeletingOppId(svc.opportunityId);
    try {
      const result = await deleteVisitServiceAction({
        taskId: selectedTask.id,
        opportunityId: svc.opportunityId,
      });
      if (!result.success) {
        toast.error("Não foi possível apagar o serviço", result.error);
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
            name: selectedTask.title || "Service",
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
    async function loadNotes() {
      if (selectedTask?.opportunityId) {
        setLoadingNotes(true);
        const result = await fetchOpportunityNotesAction(selectedTask.opportunityId, selectedTask.id);
        if (result.success) {
          setNotes(result.data || []);
        }
        setLoadingNotes(false);
      } else {
        setNotes([]);
      }
    }
    loadNotes();
  }, [selectedTask]);

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !selectedTask?.opportunityId) return;
    try {
      setIsCreatingNote(true);
      const author = userName || "Técnico";
      const title = `Nota de ${author}`;
      const body = newNoteText.trim();

      if (isOnline) {
        const result = await createOpportunityNoteAction(
          selectedTask.opportunityId,
          null,
          title,
          body,
          selectedTask.id
        );
        if (!result.success) {
          toast.error("Erro ao criar nota", result.error);
          return;
        }
      } else {
        const result = await enqueueNote(
          selectedTask.opportunityId,
          null,
          title,
          body,
          selectedTask.id
        );
        if (result.queued) {
          toast.info("Nota guardada offline", "Será sincronizada quando houver rede.");
        }
      }

      setNewNoteText("");
      if (isOnline) {
        toast.success("Nota registada", "Nota adicionada ao histórico do CRM.");
        const updated = await fetchOpportunityNotesAction(selectedTask.opportunityId);
        if (updated.success) {
          setNotes(updated.data || []);
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao criar nota", message);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleStartVisit = async () => {
    if (!selectedTask?.id) return;
    setIsStartingVisit(true);
    try {
      if (isOnline) {
        const result = await completeTaskAction(selectedTask.id, "EM_CURSO", "Técnico chegou ao local.");
        if (!result.success) {
          toast.error("Erro", result.error || "Não foi possível marcar visita em curso.");
          return;
        }
      } else {
        await enqueueStatusUpdate(selectedTask.id, "EM_CURSO", "Técnico chegou ao local.", [], selectedTask.opportunityId);
      }
      setSelectedTask({ ...selectedTask, status: "EM_CURSO" });
      mutateTasks();
      toast.success("Em curso", "Visita marcada como em curso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro", message);
    } finally {
      setIsStartingVisit(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (statusAction === "Concluído") {
      if (showMeasurementsTab) {
        const draftStr =
          typeof window !== "undefined" ? localStorage.getItem(getMeasurementsDraftKey(selectedTask.id)) : null;

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

    setIsUploading(true);
    try {
      if (selectedTask.id) {
        let success = false;
        let errorMessage = "";
        let queued = false;

        if (isOnline) {
          const result = await completeTaskAction(selectedTask.id, statusAction, finalReason);
          success = result.success;
          errorMessage = result.error || "";
        } else {
          const result = await enqueueStatusUpdate(
            selectedTask.id,
            statusAction,
            finalReason,
            [],
            selectedTask.opportunityId
          );
          success = true;
          queued = result.queued;
        }
        mutateTasks();

        if (!success) {
          toast.error("Erro ao atualizar estado", errorMessage);
          return;
        }

        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([40, 60, 40]);
        }

        if (queued) {
          toast.info("Guardado Offline", `Estado ${statusAction} guardado. A aguardar rede para sincronizar.`);
        } else {
          toast.success("Visita Concluída!", `Estado atualizado para: ${statusAction}. Sincronizado com o Twenty CRM.`);
        }
      }

      setSelectedTask(null);
      setReason("");
      setReasonPreset("");
      setStatusAction("");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const showMeasurementsSaveBar =
    activeTab === "measurements" &&
    showMeasurementsTab &&
    isTaskActive(selectedTask.status);

  const handleDrawerMeasurementsSave = async () => {
    setMeasurementsSaving(true);
    try {
      await measurementsFormRef.current?.save();
    } finally {
      setMeasurementsSaving(false);
    }
  };

  return (
    <>
      {/* Drawer Overlay */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setSelectedTask(null)}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
        className="fixed bottom-0 left-0 z-[60] flex w-full min-h-0 max-h-[min(88dvh,720px)] flex-col rounded-t-3xl border border-border bg-card text-card-foreground shadow-2xl lg:left-auto lg:right-6 lg:max-w-md lg:rounded-3xl"
        style={{
          maxHeight: "min(88dvh, 720px)",
          paddingBottom: showMeasurementsSaveBar
            ? undefined
            : "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSelectedTask(null);
        }}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar ${
            showMeasurementsSaveBar ? "pb-6" : "pb-28"
          }`}
        >
          {/* Barra superior tátil */}
          <div
            className="w-16 h-1.5 bg-slate-300 rounded-full mx-auto mb-6 cursor-pointer hover:bg-slate-400 transition-colors shrink-0"
            onClick={() => setSelectedTask(null)}
          />

          {/* Cabeçalho do Serviço */}
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="task-drawer-title" className="text-base font-bold leading-snug text-foreground md:text-lg">{selectedTask.title}</h2>
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-primary">
                  NSI #{selectedTask.nsi}
                </span>
                {(isUrgentVisitMarkdown(selectedTask.report) ||
                  notes.some((n) => isUrgentSchedulingNote(n))) && (
                  <span className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-800">
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
              onClick={() => setSelectedTask(null)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar detalhes da visita"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SEPARADOR E TAB HEADER PARA SERVIÇOS DE MEDIÇÃO (iDraft Glassmorphism) */}
          {showMeasurementsTab && (
            <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner flex w-full max-w-lg mx-auto mb-8 gap-1.5">
              <button
                onClick={() => setActiveTab("info")}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "info"
                    ? "bg-[#84cc16] text-[#090d16] shadow-md border border-[#84cc16]/10"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-4 h-4" /> Detalhes & Visita
              </button>
              <button
                onClick={() => setActiveTab("measurements")}
                className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "measurements"
                    ? "bg-[#84cc16] text-[#090d16] shadow-md border border-[#84cc16]/10"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Ruler className="w-4 h-4" /> Medições do Estore
              </button>
            </div>
          )}

          {/* ABA 1: INFORMAÇÕES DO CLIENTE & RELATÓRIO DO CRM */}
          {(activeTab === "info" || !showMeasurementsTab) && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm">
                  <CardContent className="p-0 space-y-3">
                    <p className="text-slate-600 flex items-center gap-3 text-sm font-semibold">
                      <User className="w-5 h-5 text-[#84cc16]" /> <span className="text-[#090d16] font-black">{selectedTask.client}</span>
                    </p>
                    <p className="text-slate-600 flex items-start gap-3 text-sm font-semibold">
                      <MapPin className="w-5 h-5 text-[#84cc16] shrink-0 mt-0.5" />
                      <span className="text-slate-700">{selectedTask.address}</span>
                    </p>
                    <p className="text-slate-600 flex items-center gap-3 text-sm font-semibold">
                      <Clock className="w-5 h-5 text-[#84cc16]" />{" "}
                      <span className="text-slate-700">
                        {selectedTask.dueDate.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    {selectedTask.isOverdue && (
                      <p className="text-amber-700 text-xs font-black uppercase tracking-wider bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        Visita atrasada — conclua ou contacte o admin
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200 rounded-[2rem] p-4 flex flex-col justify-center items-center gap-2 shadow-sm">
                  {(selectedTask.clientPhones?.length ?? 0) > 0 || selectedTask.clientPhone ? (
                    <div className="w-full space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                        Client phones
                      </p>
                      <ContactPhoneList
                        phones={
                          selectedTask.clientPhones?.length
                            ? selectedTask.clientPhones
                            : selectedTask.clientPhone
                              ? [selectedTask.clientPhone]
                              : []
                        }
                        emptyLabel="Not available"
                        compact
                        className="justify-center"
                      />
                    </div>
                  ) : null}
                  {isTaskActive(selectedTask.status) && !isTaskInProgress(selectedTask.status) && (
                    <Button
                      onClick={handleStartVisit}
                      disabled={isStartingVisit}
                      className="w-full min-h-12 py-3 bg-[#84cc16] border-2 border-[#65a30d] text-[#090d16] font-black shadow-[0_10px_35px_rgba(132,204,22,0.35)] hover:bg-[#a3e635] hover:border-[#84cc16] active:bg-[#65a30d]"
                      loading={isStartingVisit}
                      loadingText="A iniciar visita..."
                    >
                      <PlayCircle className="mr-2 h-5 w-5" /> Cheguei ao local
                    </Button>
                  )}
                  <button
                    onClick={async () => {
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
                          toast.success("GPS Atualizado", "Coordenadas GPS sincronizadas com o Twenty CRM!");
                        } else {
                          toast.error("GPS não encontrado", "Não foi possível geolocalizar a morada fornecida.");
                        }
                      } catch (e: any) {
                        toast.error("Erro no GPS", e.message);
                      }
                    }}
                    className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900"
                  >
                    <MapIcon className="w-3.5 h-3.5 text-slate-500" /> Sincronizar coordenadas
                  </button>
                  <NavigationChooser
                    address={selectedTask.address}
                    coordinates={selectedTask.coordinates}
                    label="Abrir no GPS / Waze"
                    className="w-full text-xs bg-[#84cc16] text-[#090d16] px-4 py-3 rounded-2xl font-black uppercase tracking-wider hover:bg-[#9ae62e] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#84cc16]/20"
                  />
                </Card>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#090d16]">
                    Serviços nesta visita
                  </h3>
                  {isTaskActive(selectedTask.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(null);
                        setShowAddService(true);
                      }}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#84cc16] text-[#090d16] shadow-sm"
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
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700"
                      >
                        <span className="font-black uppercase tracking-wide text-slate-500">
                          Serviço principal da visita
                        </span>
                        <p className="mt-1 text-sm text-slate-900">
                          {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                        </p>
                      </div>
                    ))}

                  {visitServices.some((s) => s.createdOnSite) && (
                    <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Serviços extra no local (CRM)
                    </p>
                  )}

                  {visitServices
                    .filter((svc) => svc.createdOnSite)
                    .map((svc) => (
                      <div
                        key={svc.opportunityId}
                        className="flex flex-col gap-2 rounded-2xl border border-lime-200 bg-lime-50/40 px-4 py-3 text-xs font-semibold text-slate-700"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                          </span>
                          <span className="flex flex-wrap gap-2">
                            {svc.mode === "later" && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                                Agendar depois
                              </span>
                            )}
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-lime-800">
                              No CRM
                            </span>
                          </span>
                        </div>
                        {svc.nsi && svc.nsi !== "N/A" && (
                          <span className="text-slate-500">NSI: {svc.nsi}</span>
                        )}
                        {isTaskActive(selectedTask.status) && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingService(svc);
                                setShowAddService(true);
                              }}
                              className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              type="button"
                              disabled={deletingOppId === svc.opportunityId}
                              onClick={() => handleDeleteExtraService(svc)}
                              className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 text-[10px] font-black uppercase text-red-700"
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
              <div className="h-px bg-slate-200 w-full my-2"></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#84cc16]" />
                    <h3 className="font-black text-[#090d16] text-base uppercase tracking-tight italic">Notas Técnicas do CRM</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 shadow-sm">
                    {notes.length} Notas
                  </span>
                </div>

                {/* Notas do CRM */}
                {loadingNotes ? (
                  <div className="flex items-center gap-2 py-4 text-slate-500 text-xs font-bold uppercase justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-[#84cc16]" /> Carregando do Twenty...
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                    Nenhuma instrução especial no histórico de notas do Twenty.
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
                            ? "border-2 border-red-500 bg-red-50/70"
                            : "border border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <User className={`w-3.5 h-3.5 ${urgentNote ? "text-red-600" : "text-[#84cc16]"}`} />
                            {note.title || "Técnico"}
                            {urgentNote && (
                              <span className="rounded-md border border-red-300 bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-800">
                                Urgente
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
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
                            urgentNote ? "text-red-950" : "text-slate-700"
                          }`}
                        >
                          {note.body}
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
                    className="flex-1 border border-slate-200 bg-white rounded-2xl px-4 py-3 text-xs text-slate-900 focus:ring-4 focus:ring-[#84cc16]/5 focus:border-[#84cc16] outline-none transition-all placeholder:text-slate-350 h-12 resize-none font-bold shadow-sm"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={isCreatingNote || !newNoteText.trim()}
                    className="p-4 rounded-2xl h-12 bg-[#121622] text-white hover:bg-slate-800"
                  >
                    {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Fechar/Finalizar Tarefa */}
              {isTaskActive(selectedTask.status) && (
                <>
                  <div className="h-px bg-slate-200 w-full my-8"></div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#84cc16]" />
                      <h3 className="font-black text-[#090d16] text-base uppercase tracking-tight italic">Finalizar Visita Técnica</h3>
                    </div>

                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                      <button
                        onClick={() => {
                          setStatusAction("Concluído");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                          statusAction === "Concluído"
                            ? "bg-[#84cc16] text-[#090d16] shadow-md"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Concluído
                      </button>
                      <button
                        onClick={() => {
                          setStatusAction("Incompleto");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                          statusAction === "Incompleto" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Incompleto
                      </button>
                      <button
                        onClick={() => {
                          setStatusAction("Cancelado");
                          setReason("");
                        }}
                        className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                          statusAction === "Cancelado" ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Cancelado
                      </button>
                    </div>

                    {statusAction && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {statusAction === "Incompleto" && (
                          <div className="space-y-2">
                            <label className="block px-1 text-xs font-black uppercase tracking-widest text-slate-600">
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
                                      ? "bg-amber-50 border-amber-400 text-amber-900"
                                      : "bg-white border-slate-200 text-slate-700"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {(reasonPreset === "outro" || reasonPreset) && (
                              <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={reasonPreset === "outro" ? "Descreva o motivo..." : "Detalhes adicionais (opcional)"}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/5 transition-all font-bold h-24 shadow-sm"
                              />
                            )}
                          </div>
                        )}

                        {statusAction === "Cancelado" && (
                          <div className="space-y-2">
                            <label className="block px-1 text-xs font-black uppercase tracking-widest text-slate-600">
                              Motivo do cancelamento (obrigatório)
                            </label>
                            <textarea
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Descreva o motivo do cancelamento..."
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/5 transition-all font-bold h-24 shadow-sm"
                            />
                          </div>
                        )}

                        <Button
                          onClick={handleStatusUpdate}
                          disabled={isUploading}
                          className="w-full py-5 bg-[#121622] text-white hover:bg-slate-850 shadow-md"
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
              {measurementServices.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {measurementServices.map((svc) => (
                    <button
                      key={svc.opportunityId}
                      type="button"
                      onClick={() => setMeasurementOppId(svc.opportunityId)}
                      className={`min-h-12 rounded-xl px-4 text-xs font-black uppercase ${
                        measurementOppId === svc.opportunityId
                          ? "bg-[#84cc16] text-[#090d16]"
                          : "bg-slate-100 text-slate-600"
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

                  if (isOnline) {
                    const result = await submitMeasurementsAction(selectedTask.id, oppId, data);
                    success = result.success;
                    errorMessage = result.error || "";
                  } else {
                    const result = await enqueueMeasurementsSave(selectedTask.id, oppId, data);
                    success = true;
                    queued = result.queued;
                  }

                  if (!success) {
                    toast.error("Erro ao guardar medições", errorMessage);
                    return { success: false, error: errorMessage };
                  }

                  if (typeof window !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(50);
                  }

                  const updatedReport = formatMeasurementsReport(data);
                  setSelectedTask({ ...selectedTask, report: updatedReport });
                  mutateTasks();
                  return { success: true };
                }}
              />
            </div>
          )}
        </div>

        {showMeasurementsSaveBar && (
          <div
            className="shrink-0 border-t border-slate-200 bg-[#f8fafc] px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] md:px-8"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <MeasurementsSaveButton
              onClick={handleDrawerMeasurementsSave}
              loading={measurementsSaving}
            />
          </div>
        )}
      </div>
      {showAddService && (
        <AddVisitServiceSheet
          task={{
            id: selectedTask.id,
            nsi: selectedTask.nsi || "",
            client: selectedTask.client,
            address: selectedTask.address,
            opportunityId: selectedTask.opportunityId,
            serviceType: selectedTask.serviceType,
          }}
          isOnline={isOnline}
          editService={editingService}
          onClose={() => {
            setShowAddService(false);
            setEditingService(null);
          }}
          onSaved={refreshVisit}
          enqueueVisitService={enqueueVisitService}
        />
      )}
    </>
  );
}
