"use client";
import React, { useState, useEffect } from "react";
import { X, User, MapPin, Clock, Map as MapIcon, MessageSquare, Loader2, Plus, CheckCircle, FileText, Ruler, Phone, PlayCircle } from "lucide-react";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { hasValidMeasurements, formatMeasurementsReport, getMeasurementsDraftKey } from "@/lib/measurementsUtils";
import { INCOMPLETE_REASONS, formatIncompleteReason } from "@/lib/taskReasons";
import { isTaskActive, isTaskInProgress } from "@/lib/crm/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { geocodeAddress, updateTaskCoordinates } from "@/lib/crm";
import { completeTaskAction } from "@/actions/tasks-actions";
import { fetchOpportunityNotesAction, createOpportunityNoteAction } from "@/actions/notes-actions";
import { submitMeasurementsAction } from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import MeasurementsForm from "@/components/features/measurements/MeasurementsForm";

interface TaskDetailsDrawerProps {
  selectedTask: any;
  setSelectedTask: (t: any) => void;
  isOnline: boolean;
  userName: string;
  mutateTasks: () => void;
  enqueueStatusUpdate: (id: string, status: string, reason: string, photos: string[], oppId: string) => Promise<{ queued: boolean }>;
  enqueueMeasurementsSave: (id: string, oppId: string, data: any) => Promise<{ queued: boolean }>;
  enqueueNote: (oppId: string, personId: string | null, title: string, body: string) => Promise<{ queued: boolean }>;
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
}: TaskDetailsDrawerProps) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [reasonPreset, setReasonPreset] = useState("");
  const [statusAction, setStatusAction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingVisit, setIsStartingVisit] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "measurements">("info");

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const isMeasurementService = Array.isArray(selectedTask?.serviceType)
    ? selectedTask.serviceType.some((t: string) => {
        const norm = t?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "_") || "";
        return ["TIRAR_MEDIDAS", "REMEDICAO", "REAGENDAR"].includes(norm);
      })
    : ["TIRAR_MEDIDAS", "REMEDICAO", "REAGENDAR"].includes(
        selectedTask?.serviceType?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "_") || ""
      );

  // Automatically switch tab if not measurement service
  useEffect(() => {
    if (!isMeasurementService) {
      setActiveTab("info");
    }
  }, [selectedTask, isMeasurementService]);

  // Load CRM notes
  useEffect(() => {
    async function loadNotes() {
      if (selectedTask?.opportunityId) {
        setLoadingNotes(true);
        const result = await fetchOpportunityNotesAction(selectedTask.opportunityId);
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
        const result = await createOpportunityNoteAction(selectedTask.opportunityId, null, title, body);
        if (!result.success) {
          toast.error("Erro ao criar nota", result.error);
          return;
        }
      } else {
        const result = await enqueueNote(selectedTask.opportunityId, null, title, body);
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
      if (isMeasurementService) {
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

  return (
    <>
      {/* Drawer Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 transition-opacity duration-300 animate-in fade-in"
        onClick={() => setSelectedTask(null)}
      />

      {/* Drawer de Detalhes do Técnico (Premium UI) */}
      <div
        className="fixed bottom-0 left-0 w-full bg-[#f8fafc] border-t border-slate-200 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out z-[60] flex flex-col translate-y-0"
        style={{ maxHeight: "90vh" }}
      >
        <div className="p-6 md:p-8 overflow-y-auto pb-32 text-slate-800 custom-scrollbar">
          {/* Barra superior tátil */}
          <div
            className="w-16 h-1.5 bg-slate-300 rounded-full mx-auto mb-6 cursor-pointer hover:bg-slate-400 transition-colors shrink-0"
            onClick={() => setSelectedTask(null)}
          />

          {/* Cabeçalho do Serviço */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black text-[#090d16] tracking-tight uppercase italic leading-none">{selectedTask.title}</h2>
                <span className="bg-white px-3 py-1 rounded-xl border border-slate-200 text-xs font-black text-[#84cc16] uppercase tracking-wider shadow-sm">
                  NSI #{selectedTask.nsi}
                </span>
              </div>
              {selectedTask.serviceType && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(Array.isArray(selectedTask.serviceType) ? selectedTask.serviceType : [selectedTask.serviceType]).map(
                    (tipo: any, idx: number) => {
                      const colors = getServiceTypeColor(tipo);
                      return (
                        <span
                          key={idx}
                          className="text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border"
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
              onClick={() => setSelectedTask(null)}
              className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 transition-colors shadow-sm shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* SEPARADOR E TAB HEADER PARA SERVIÇOS DE MEDIÇÃO (iDraft Glassmorphism) */}
          {isMeasurementService && (
            <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner flex w-full max-w-lg mx-auto mb-8 gap-1.5">
              <button
                onClick={() => setActiveTab("info")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${
                  activeTab === "info"
                    ? "bg-[#84cc16] text-[#090d16] shadow-md border border-[#84cc16]/10"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-4 h-4" /> Detalhes & Visita
              </button>
              <button
                onClick={() => setActiveTab("measurements")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${
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
          {(activeTab === "info" || !isMeasurementService) && (
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
                  {selectedTask.clientPhone && (
                    <a
                      href={`tel:${selectedTask.clientPhone.replace(/\s/g, "")}`}
                      className="w-full h-12 text-xs bg-white border border-slate-200 text-[#090d16] px-4 rounded-2xl font-black uppercase tracking-wider hover:border-[#84cc16] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Phone className="w-4 h-4 text-[#84cc16]" /> Ligar ao Cliente
                    </a>
                  )}
                  <NavigationChooser
                    address={selectedTask.address}
                    coordinates={selectedTask.coordinates}
                    label="Abrir no GPS / Waze"
                    className="w-full text-xs bg-[#84cc16] text-[#090d16] px-4 py-3 rounded-2xl font-black uppercase tracking-wider hover:bg-[#9ae62e] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#84cc16]/20"
                  />
                  <button
                    onClick={async () => {
                      try {
                        toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
                        const newCoords = await geocodeAddress(selectedTask.address);
                        if (newCoords && newCoords[0]) {
                          await updateTaskCoordinates(selectedTask.id, newCoords[0], newCoords[1]);
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
                    className="w-full text-[10px] bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 px-3 py-2 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <MapIcon className="w-3.5 h-3.5 text-slate-500" /> Sincronizar Coordenadas
                  </button>
                </Card>
              </div>

              {/* Secção de Notas e Instruções do CRM */}
              <div className="h-px bg-slate-200 w-full my-2"></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#84cc16]" />
                    <h3 className="font-black text-[#090d16] text-base uppercase tracking-tight italic">Notas Técnicas do CRM</h3>
                  </div>
                  <span className="text-[10px] font-black bg-white text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-200 shadow-sm">
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
                    {notes.map((note) => (
                      <div key={note.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#84cc16]" /> {note.title || "Técnico"}
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
                        <p className="text-slate-700 text-sm font-semibold whitespace-pre-line leading-relaxed">{note.body}</p>
                      </div>
                    ))}
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
                    {!isTaskInProgress(selectedTask.status) && (
                      <Button
                        onClick={handleStartVisit}
                        disabled={isStartingVisit}
                        className="w-full min-h-12 py-4 bg-[#84cc16] border-2 border-[#65a30d] text-[#090d16] font-black shadow-[0_10px_35px_rgba(132,204,22,0.35)] hover:bg-[#a3e635] hover:border-[#84cc16] active:bg-[#65a30d]"
                        loading={isStartingVisit}
                      >
                        <PlayCircle className="w-5 h-5 mr-2" /> Cheguei ao Local
                      </Button>
                    )}

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
                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
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
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
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
          {activeTab === "measurements" && isMeasurementService && (
            <div className="animate-in fade-in duration-300">
              <MeasurementsForm
                task={selectedTask}
                isAdmin={!isTaskActive(selectedTask.status)}
                onSave={async (data) => {
                  let success = false;
                  let errorMessage = "";
                  let queued = false;

                  if (isOnline) {
                    const result = await submitMeasurementsAction(selectedTask.id, selectedTask.opportunityId, data);
                    success = result.success;
                    errorMessage = result.error || "";
                  } else {
                    const result = await enqueueMeasurementsSave(selectedTask.id, selectedTask.opportunityId, data);
                    success = true;
                    queued = result.queued;
                  }

                  if (!success) {
                    alert("Erro: " + errorMessage);
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
      </div>
    </>
  );
}
