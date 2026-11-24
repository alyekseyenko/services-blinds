"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyedMutator } from "swr";
import {
  cancelAppointmentAction,
  geocodeAndUpdateOpportunityAction,
  runOpportunityMaintenanceAction,
  scheduleTechnicalVisitAction,
  updateOpportunityCoordinatesAction,
} from "@/actions/admin-actions";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { markLocalAgendaChange } from "@/lib/agendaLocalChanges";
import {
  getAdminSchedulingHoursWarning,
} from "@/lib/admin/schedulingHours";
import { resolveHoraDeFimIsoFromStopTimes } from "@/lib/admin/routeScheduleSlots";
import type { ScheduleForm } from "@/lib/admin/scheduleForm";
import {
  buildScheduleFormPrefill,
  localAgendaKindsForSchedule,
  type ScheduleModalMode,
} from "@/lib/admin/scheduleFormPrefill";
import { toUserMessage } from "@/lib/userMessages";
import type { Opportunity, WorkspaceMember } from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type AdminToast = ReturnType<typeof useToast>;
type AdminConfirm = ReturnType<typeof useConfirm>;

export type UseAdminScheduleAndGeoActionsParams = {
  workspaceMembers: WorkspaceMember[];
  adminNotificationScope: string;
  selectedOpportunity: Opportunity | null;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  refreshOpps: () => Promise<unknown>;
  refreshAgenda: () => Promise<unknown>;
  refreshHistory: () => Promise<unknown>;
  mutateOpps: KeyedMutator<Opportunity[]>;
  mutateAgendaFeed: () => Promise<unknown>;
  hasServicesWithoutGps: boolean;
  toast: AdminToast;
  confirm: AdminConfirm;
};

export function useAdminScheduleAndGeoActions({
  workspaceMembers,
  adminNotificationScope,
  selectedOpportunity,
  setSelectedOpportunity,
  refreshOpps,
  refreshAgenda,
  refreshHistory,
  mutateOpps,
  mutateAgendaFeed,
  hasServicesWithoutGps,
  toast,
  confirm,
}: UseAdminScheduleAndGeoActionsParams) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState<ScheduleModalMode>("new");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAddressSyncing, setIsAddressSyncing] = useState(false);
  const [crmRefreshing, setCrmRefreshing] = useState(false);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: "",
    date: "",
    time: "09:00",
    endTime: "",
    technicianId: "",
    urgent: false,
    notes: "",
    addressStreet1: "",
    addressStreet2: "",
    addressCity: "",
    addressState: "",
    addressPostcode: "",
    addressCountry: "Portugal",
    addressLat: null,
    addressLng: null,
  });

  useEffect(() => {
    const runMaintenance = async () => {
      try {
        const res = await fetch("/api/opportunities/maintenance", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json()) as { geocoded?: number };
        if (data.geocoded && data.geocoded > 0) await refreshOpps();
      } catch {
        /* a próxima passagem tenta outra vez */
      }
    };

    const interval = setInterval(runMaintenance, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshOpps]);

  useEffect(() => {
    if (!hasServicesWithoutGps) return;
    let cancelled = false;
    const placeMissingPins = async () => {
      try {
        const res = await fetch("/api/opportunities/maintenance?scope=missing", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json()) as { geocoded?: number };
        if (!cancelled && data.geocoded && data.geocoded > 0) await refreshOpps();
      } catch {
        /* sem aviso: a lista das zonas continua disponível */
      }
    };
    void placeMissingPins();
    const interval = window.setInterval(placeMissingPins, 2 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hasServicesWithoutGps, refreshOpps]);

  const handleCancelAppointment = async (opp: Opportunity) => {
    if (isOnboardingDemoEntity(opp)) {
      toast.info("Formação", "No guia o cancelamento é simulado — nada foi enviado ao CRM.");
      return;
    }
    if (!opp.taskId) {
      toast.error("Erro", "Não foi encontrada nenhuma tarefa ativa para cancelar.");
      return;
    }

    const dateLabel = opp.scheduledAt
      ? new Date(opp.scheduledAt).toLocaleString("pt-PT", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const confirmed = await confirm({
      title: "Cancelar agendamento?",
      description: `Cancelar «${opp.title}»${dateLabel ? ` (${dateLabel})` : ""}? O serviço volta a pendente no CRM.`,
      confirmLabel: "Cancelar agendamento",
      cancelLabel: "Manter agendamento",
      destructive: true,
    });
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const result = await cancelAppointmentAction(opp.taskId, opp.twentyId);
      if (!result.success) {
        toast.error(
          "Erro ao cancelar",
          toUserMessage(result.error, "Não foi possível cancelar o agendamento.")
        );
        mutateOpps();
        return;
      }
      toast.success("Agendamento cancelado", "O serviço voltou a pendente no CRM.");
      const cancelKinds = ["cancelada", "removida"] as const;
      if (opp.taskId) markLocalAgendaChange(adminNotificationScope, opp.taskId, [...cancelKinds]);
      markLocalAgendaChange(adminNotificationScope, opp.twentyId, [...cancelKinds]);
      mutateOpps();
      void mutateAgendaFeed();
      setSelectedOpportunity(null);
    } catch (error: unknown) {
      console.error("Erro detalhado ao cancelar:", error);
      toast.error("Erro ao cancelar", toUserMessage(error, "Erro ao cancelar."));
      mutateOpps();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsAddressSyncing(true);
      toast.info("A sincronizar...", "A obter GPS para serviços sem coordenadas.");
      const result = await runOpportunityMaintenanceAction(true);
      if (!result.success || !result.data) {
        toast.error("Erro ao sincronizar", result.error || "Falha na sincronização de manutenção.");
        return;
      }
      await refreshOpps();
      void refreshAgenda();
      void refreshHistory();

      const { geocoded, geocodePending, geocodeFailed, geocodeSkippedNoAddress } = result.data;
      const failedTitles = geocodeFailed.map((item) => item.title).join(", ");
      const skippedTitles = geocodeSkippedNoAddress.map((item) => item.title).join(", ");

      if (
        geocoded > 0 &&
        geocodeFailed.length === 0 &&
        geocodePending === 0 &&
        geocodeSkippedNoAddress.length === 0
      ) {
        toast.success(
          "GPS actualizado",
          geocoded === 1 ? "1 morada sincronizada." : `${geocoded} moradas sincronizadas.`
        );
        return;
      }

      if (geocodeFailed.length > 0 || geocodeSkippedNoAddress.length > 0) {
        const parts = [
          geocoded > 0 ? `${geocoded} com GPS.` : null,
          geocodeFailed.length > 0
            ? `Sem correspondência no mapa: ${failedTitles}. Corrija a morada no serviço ou indique GPS à mão.`
            : null,
          geocodeSkippedNoAddress.length > 0 ? `Sem morada no CRM: ${skippedTitles}.` : null,
          geocodePending > 0 ? `Ainda faltam ${geocodePending}. Toque outra vez em sincronizar.` : null,
        ].filter(Boolean);
        toast.warning("GPS incompleto", parts.join(" "));
        return;
      }

      if (geocodePending > 0) {
        toast.info(
          "Ainda há moradas",
          `${geocoded} sincronizadas. Faltam ${geocodePending} — toque outra vez em Sincronizar moradas.`
        );
        return;
      }

      toast.info("Nada a sincronizar", "Não há serviços por agendar com morada por geocodificar.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao sincronizar";
      toast.error("Erro ao sincronizar", message);
    } finally {
      setIsAddressSyncing(false);
    }
  };

  const handleLoadMapServices = useCallback(async () => {
    setIsAddressSyncing(true);
    toast.info("A sincronizar...", "A colocar no mapa os serviços novos que ainda não têm pin.");
    try {
      const result = await runOpportunityMaintenanceAction(false);
      if (!result.success || !result.data) {
        toast.error("Erro ao sincronizar", result.error || "Não foi possível colocar os serviços no mapa.");
        return;
      }
      await refreshOpps();
      const { geocoded, geocodePending } = result.data;
      if (geocoded > 0) {
        toast.success(
          "Serviços no mapa",
          geocoded === 1 ? "1 serviço ficou com pin." : `${geocoded} serviços ficaram com pin.`
        );
        return;
      }
      if (geocodePending > 0) {
        toast.info("Ainda há serviços", `Faltam ${geocodePending}. Toque outra vez para continuar.`);
        return;
      }
      toast.info("Mapa em dia", "Não há serviços novos à espera de pin.");
    } catch (error: unknown) {
      toast.error("Erro ao sincronizar", toUserMessage(error, "Não foi possível colocar os serviços no mapa."));
    } finally {
      setIsAddressSyncing(false);
    }
  }, [refreshOpps, toast]);

  const handleSyncCrm = useCallback(async () => {
    setCrmRefreshing(true);
    toast.info("A sincronizar...", "A carregar o mapa com os dados atuais do CRM.");
    try {
      await Promise.all([refreshOpps(), refreshAgenda(), refreshHistory()]);
      toast.success("Mapa atualizado", "Serviços carregados do CRM.");
    } catch (error: unknown) {
      toast.error("Erro ao sincronizar", toUserMessage(error, "Não foi possível atualizar o mapa."));
    } finally {
      setCrmRefreshing(false);
    }
  }, [refreshAgenda, refreshHistory, refreshOpps, toast]);

  const handleUpdateGps = async (opp: Opportunity) => {
    if (isOnboardingDemoEntity(opp)) {
      toast.info("Formação", "No guia o GPS é simulado — nada foi enviado ao CRM.");
      return;
    }
    try {
      toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
      const result = await geocodeAndUpdateOpportunityAction(
        opp.twentyId,
        opp.navigationAddress || opp.address,
        opp.rawAddress
      );

      if (!result.success || !result.data) {
        toast.error(
          "Coordenadas não encontradas",
          result.error || "Não foi possível obter GPS para esta morada."
        );
        return;
      }

      const [lat, lng] = result.data;
      toast.success("Localização Atualizada", "Coordenadas GPS sincronizadas com o Twenty CRM!");
      await refreshOpps();
      setSelectedOpportunity({ ...opp, coordinates: [lat, lng] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro no GPS";
      toast.error("Erro no GPS", message);
    }
  };

  const handleManualCoordsUpdate = async (opp: Opportunity, lat: string, lng: string) => {
    if (!lat || !lng) return;

    try {
      const result = await updateOpportunityCoordinatesAction(
        opp.twentyId,
        parseFloat(lat),
        parseFloat(lng)
      );
      if (!result.success || !result.data) {
        toast.error("Erro", result.error || "Erro ao atualizar coordenadas manuais.");
        return;
      }
      toast.success("Coordenadas Atualizadas", "Coordenadas manuais guardadas com sucesso!");
      await refreshOpps();
      setSelectedOpportunity({ ...opp, coordinates: result.data });
    } catch {
      toast.error("Erro", "Erro ao atualizar coordenadas manuais.");
    }
  };

  const openScheduleModal = useCallback(
    (opp: Opportunity, options?: { reschedule?: boolean }) => {
      const reschedule = Boolean(options?.reschedule);
      setSelectedOpportunity(opp);
      setScheduleModalMode(reschedule ? "reschedule" : "new");
      setScheduleForm(buildScheduleFormPrefill(opp, workspaceMembers, reschedule ? "reschedule" : "new"));
      setShowScheduleModal(true);
    },
    [setSelectedOpportunity, workspaceMembers]
  );

  const handleScheduleVisit = async () => {
    try {
      if (!selectedOpportunity) return;

      if (isOnboardingDemoEntity(selectedOpportunity)) {
        setIsScheduling(true);
        await new Promise((r) => window.setTimeout(r, 350));
        toast.success(
          "Simulação concluída",
          "Num agendamento real, a visita ficaria marcada no Twenty e na agenda do técnico."
        );
        setShowScheduleModal(false);
        setIsScheduling(false);
        return;
      }

      setIsScheduling(true);
      const [year, month, day] = scheduleForm.date.split("-").map(Number);
      const [hour, minute] = scheduleForm.time.split(":").map(Number);
      const dueAt = new Date(year, month - 1, day, hour, minute);
      const selectedTech = workspaceMembers.find((m) => m.id === scheduleForm.technicianId);

      if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
        toast.error(
          "Técnico inválido",
          "Selecione um técnico com conta no Twenty CRM (role Técnicos)."
        );
        return;
      }

      const dateTimeLabel = dueAt.toLocaleString("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
      });

      const hoursWarning = getAdminSchedulingHoursWarning(dueAt);
      if (hoursWarning) {
        const confirmedHours = await confirm({
          title: "Fora do horário habitual",
          description: `${hoursWarning} Pretende mesmo agendar para ${dateTimeLabel}?`,
          confirmLabel: "Agendar nesta hora",
          cancelLabel: "Cancelar",
          destructive: true,
        });
        if (!confirmedHours) return;
      }

      const horaDeFimIso = resolveHoraDeFimIsoFromStopTimes(
        scheduleForm.date,
        scheduleForm.time,
        scheduleForm.endTime
      );

      const reschedule = scheduleModalMode === "reschedule";
      const result = await scheduleTechnicalVisitAction({
        title: scheduleForm.title,
        dueAtIso: dueAt.toISOString(),
        horaDeFimIso,
        notes: scheduleForm.notes,
        technicianId: scheduleForm.technicianId,
        technicianName: selectedTech.name || "",
        morada: {
          addressStreet1: scheduleForm.addressStreet1,
          addressStreet2: scheduleForm.addressStreet2,
          addressCity: scheduleForm.addressCity,
          addressState: scheduleForm.addressState,
          addressPostcode: scheduleForm.addressPostcode,
          addressCountry: scheduleForm.addressCountry,
          addressLat: scheduleForm.addressLat,
          addressLng: scheduleForm.addressLng,
        },
        opportunityId: selectedOpportunity.twentyId,
        personId: selectedOpportunity.pointOfContactId,
        pointOfContactEmail: selectedOpportunity.pointOfContactEmail,
        taskId: selectedOpportunity.taskId,
        currentStage: selectedOpportunity.stage,
        urgent: scheduleForm.urgent,
        rescheduleExistingTask: reschedule,
      });

      if (!result.success) {
        toast.error(
          "Erro ao agendar",
          toUserMessage(result.error, "Não foi possível agendar a visita.")
        );
        return;
      }

      const conflictNote = result.data?.conflictWarning ? ` ${result.data.conflictWarning}` : "";
      toast.success(
        reschedule ? "Visita reagendada" : "Visita agendada",
        reschedule
          ? `Horário e técnico actualizados no CRM.${conflictNote}`
          : `Visita confirmada no CRM para o técnico. Saiu de Por agendar.${conflictNote}`
      );
      const scheduleKinds = reschedule
        ? localAgendaKindsForSchedule(
            selectedOpportunity,
            dueAt,
            scheduleForm.technicianId,
            true
          )
        : (["nova"] as const);
      if (selectedOpportunity.taskId) {
        markLocalAgendaChange(adminNotificationScope, selectedOpportunity.taskId, [...scheduleKinds]);
      }
      markLocalAgendaChange(adminNotificationScope, selectedOpportunity.twentyId, [...scheduleKinds]);
      setShowScheduleModal(false);
      setSelectedOpportunity(null);
      const scheduledId = selectedOpportunity.twentyId;
      await mutateOpps(
        (current) => {
          if (!Array.isArray(current)) return current;
          return current.map((opp) =>
            opp.twentyId === scheduledId
              ? {
                  ...opp,
                  hasScheduledTask: true,
                  scheduledAt: dueAt.toISOString(),
                  technician: selectedTech.name || opp.technician,
                  taskStatus: "AGENDADO",
                  status: "AGENDADO",
                }
              : opp
          );
        },
        { revalidate: false }
      );
      void refreshOpps();
      void refreshAgenda();
    } catch (e: unknown) {
      toast.error("Erro ao agendar", toUserMessage(e, "Não foi possível agendar a visita."));
    } finally {
      setIsScheduling(false);
    }
  };

  return {
    showScheduleModal,
    setShowScheduleModal,
    scheduleModalMode,
    scheduleForm,
    setScheduleForm,
    isScheduling,
    setIsScheduling,
    isCancelling,
    isAddressSyncing,
    crmRefreshing,
    handleCancelAppointment,
    handleRefresh,
    handleLoadMapServices,
    handleSyncCrm,
    handleUpdateGps,
    handleManualCoordsUpdate,
    openScheduleModal,
    handleScheduleVisit,
  };
}