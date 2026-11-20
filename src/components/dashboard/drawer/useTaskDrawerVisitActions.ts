"use client";

import { useCallback, useState } from "react";
import {
  hasValidMeasurements,
  formatMeasurementsReport,
  getMeasurementsDraftKey,
} from "@/lib/measurementsUtils";
import { formatIncompleteReason } from "@/lib/taskReasons";
import {
  missingRepairPayments,
  repairsNeedingPayment,
  isRepairPaymentComplete,
  type RepairPaymentMethodId,
  type RepairPaymentNote,
} from "@/lib/visits/repairPayment";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { toUserMessage } from "@/lib/userMessages";
import { hapticConfirmAfterAsync, hapticTap } from "@/lib/haptics";
import { cueClick } from "@/lib/feedbackCue";
import type { VisitService } from "@/lib/schemas";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type QueueEnqueueResult = { success: boolean; queued: boolean; error?: string };

export function useTaskDrawerVisitActions(params: {
  selectedTask: {
    id: string;
    status: string;
    opportunityId: string;
    report?: string;
  };
  setSelectedTask: (t: unknown) => void;
  mutateTasks: () => void;
  enqueueStatusUpdate: (
    id: string,
    status: string,
    reason: string,
    photos: string[],
    oppId: string,
    paymentNotes?: RepairPaymentNote[]
  ) => Promise<QueueEnqueueResult>;
  showMeasurementsTab: boolean;
  measurementOppId?: string;
  setActiveTab: (tab: "info" | "measurements") => void;
  visitServices: VisitService[];
  repairPayments: Record<string, RepairPaymentMethodId>;
  repairPaymentDetails: Record<string, string>;
  statusAction: string;
  reason: string;
  reasonPreset: string;
  setReason: (v: string) => void;
  setReasonPreset: (v: string) => void;
  setStatusAction: (v: string) => void;
  needsArrivalCheckIn: boolean;
  promptArrivalCheckIn: (detail?: string) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingVisit, setIsStartingVisit] = useState(false);

  const {
    selectedTask,
    setSelectedTask,
    mutateTasks,
    enqueueStatusUpdate,
    showMeasurementsTab,
    measurementOppId,
    setActiveTab,
    visitServices,
    repairPayments,
    repairPaymentDetails,
    statusAction,
    reason,
    reasonPreset,
    setReason,
    setReasonPreset,
    setStatusAction,
    needsArrivalCheckIn,
    promptArrivalCheckIn,
  } = params;

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

  const handleStartVisit = useCallback(async () => {
    if (!selectedTask?.id) return;
    cueClick();
    hapticTap();
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
        hapticConfirmAfterAsync("error");
        cueClick();
        toast.error(
          "Erro",
          toUserMessage(result.error, "Não foi possível marcar visita em curso.")
        );
        return;
      }
      setSelectedTask({ ...selectedTask, status: "EM_CURSO" });
      mutateTasks();
      hapticConfirmAfterAsync("success");
      cueClick();
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
  }, [enqueueStatusUpdate, mutateTasks, selectedTask, setSelectedTask, toast]);

  const handleStatusUpdate = useCallback(async () => {
    const allowWithoutArrival = statusAction === "Cancelado";
    if (needsArrivalCheckIn && !allowWithoutArrival) {
      promptArrivalCheckIn("Antes de fechar a visita, registe que chegou ao local.");
      return;
    }

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

    if (
      (statusAction === "Incompleto" || statusAction === "Cancelado") &&
      reasonPreset === "outro" &&
      !reason.trim()
    ) {
      toast.warning("Motivo Obrigatório", "Descreva a justificação do serviço incompleto ou cancelado.");
      return;
    }

    if (statusAction === "Cancelado" && !reason.trim()) {
      toast.warning("Motivo Obrigatório", "Descreva o motivo do cancelamento.");
      return;
    }

    if (
      statusAction === "Concluído" &&
      missingRepairPayments(visitServices, repairPayments, repairPaymentDetails).length > 0
    ) {
      toast.warning(
        "Pagamento obrigatório",
        "Escolha como foi pago cada serviço de reparação ou indique o motivo em Outros."
      );
      return;
    }

    const paymentNotes: RepairPaymentNote[] =
      statusAction === "Concluído"
        ? repairsNeedingPayment(visitServices).flatMap((service) => {
            const method = repairPayments[service.opportunityId];
            if (!isRepairPaymentComplete(method, repairPaymentDetails[service.opportunityId])) return [];
            const detail =
              method === "outros" ? repairPaymentDetails[service.opportunityId]?.trim() : undefined;
            return [{ opportunityId: service.opportunityId, method, ...(detail ? { detail } : {}) }];
          })
        : [];

    const finalReason =
      statusAction === "Incompleto" ? formatIncompleteReason(reasonPreset, reason) : reason;

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
        description: "A visita será cancelada no CRM. Esta ação não pode ser anulada pelo técnico.",
        confirmLabel: "Cancelar visita",
        cancelLabel: "Voltar",
        destructive: true,
      });
      if (!ok) return;
    }

    cueClick();
    hapticTap();
    setIsUploading(true);
    try {
      if (selectedTask.id) {
        const result = await enqueueStatusUpdate(
          selectedTask.id,
          statusAction,
          finalReason,
          [],
          selectedTask.opportunityId,
          paymentNotes
        );

        if (!result.success) {
          hapticConfirmAfterAsync("error");
          cueClick();
          toast.error(
            "Erro ao atualizar estado",
            toUserMessage(result.error, "Não foi possível atualizar o estado da visita.")
          );
          return;
        }

        hapticConfirmAfterAsync(statusAction === "Concluído" ? "complete" : "success");
        cueClick();
        mutateTasks();

        if (isOnboardingDemoEntity(selectedTask)) {
          toast.success(
            "Formação concluída",
            "Nada foi enviado ao CRM — esta visita era só um exemplo do guia."
          );
        } else {
          const copy = statusSuccessMessage(statusAction, result.queued);
          if (result.queued) {
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
  }, [
    confirm,
    enqueueStatusUpdate,
    measurementOppId,
    mutateTasks,
    needsArrivalCheckIn,
    promptArrivalCheckIn,
    reason,
    reasonPreset,
    repairPaymentDetails,
    repairPayments,
    selectedTask,
    setActiveTab,
    setReason,
    setReasonPreset,
    setSelectedTask,
    setStatusAction,
    showMeasurementsTab,
    statusAction,
    toast,
    visitServices,
  ]);

  return {
    isUploading,
    isStartingVisit,
    handleStartVisit,
    handleStatusUpdate,
  };
}