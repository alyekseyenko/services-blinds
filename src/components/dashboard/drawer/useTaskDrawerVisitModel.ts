"use client";

import { useMemo, useState, useCallback } from "react";
import { deleteVisitServiceAction } from "@/actions/visit-services-actions";
import {
  closedVisitCanOpenMeasurementSheet,
  isMeasurementService,
} from "@/lib/crm/contract";
import {
  missingRepairPayments,
  repairsNeedingPayment,
  type RepairPaymentMethodId,
} from "@/lib/visits/repairPayment";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import { formatVisitServiceTypeLabel } from "@/lib/visitServiceTypeLabel";
import { buildTechVisitDrawerHeader } from "@/lib/techVisitDisplay";
import { formatClientNifDisplay } from "@/lib/ui/ptPtDisplay";
import { toUserMessage } from "@/lib/userMessages";
import type { VisitService } from "@/lib/schemas";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function useTaskDrawerVisitModel(params: {
  selectedTask: Record<string, unknown> & {
    id: string;
    opportunityId?: string;
    title?: string;
    stage?: string;
    status: string;
    services?: VisitService[];
    nsi?: string;
    serviceNumber?: string;
    serviceType?: string;
    client?: string;
    address?: string;
    clientPhones?: string[];
    clientPhone?: string;
    clientNif?: string;
  };
  setSelectedTask: (t: unknown) => void;
  mutateTasks: () => void;
  isOnline: boolean;
  statusAction: string;
  repairPayments: Record<string, RepairPaymentMethodId>;
  repairPaymentDetails: Record<string, string>;
}) {
  const { selectedTask, setSelectedTask, mutateTasks, isOnline, statusAction, repairPayments, repairPaymentDetails } =
    params;
  const toast = useToast();
  const confirm = useConfirm();
  const [deletingOppId, setDeletingOppId] = useState<string | null>(null);

  const handleDeleteExtraService = useCallback(
    async (svc: VisitService) => {
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
        mutateTasks();
      } catch (e: unknown) {
        toast.error("Não foi possível apagar o serviço", toUserMessage(e, "Erro de ligação."));
      } finally {
        setDeletingOppId(null);
      }
    },
    [confirm, isOnline, mutateTasks, selectedTask, setSelectedTask, toast]
  );

  const visitServices: VisitService[] = selectedTask?.services?.length
    ? selectedTask.services
    : selectedTask?.opportunityId
      ? [
          {
            opportunityId: selectedTask.opportunityId,
            name: selectedTask.title || "Serviço",
            nsi: selectedTask.nsi,
            serviceNumber: selectedTask.serviceNumber,
            stage: selectedTask.stage,
            serviceType: selectedTask.serviceType || "GERAL",
            mode: "now",
            isPrimary: true,
          },
        ]
      : [];

  const repairServices = useMemo(() => repairsNeedingPayment(visitServices), [visitServices]);
  const repairPaymentMissing =
    statusAction === "Concluído" &&
    missingRepairPayments(visitServices, repairPayments, repairPaymentDetails).length > 0;

  const primaryVisitService = visitServices.find((s) => s.isPrimary) ?? visitServices[0];

  const filesOpportunityId =
    selectedTask?.opportunityId?.trim() || primaryVisitService?.opportunityId?.trim() || "";

  const primaryServiceLabel = useMemo(() => {
    if (!selectedTask) return undefined;
    if (primaryVisitService) {
      const fromType = getExtraServiceTypeLabel(primaryVisitService.serviceType);
      if (fromType && fromType !== "Geral") return fromType;
      return primaryVisitService.name?.trim() || undefined;
    }
    return formatVisitServiceTypeLabel({
      serviceType: selectedTask.serviceType,
      visitTitle: selectedTask.title,
      stage: selectedTask.stage,
    });
  }, [selectedTask, primaryVisitService]);

  const visitDrawerHeader = useMemo(() => {
    if (!selectedTask) return { heading: "Visita", detail: "" };
    return buildTechVisitDrawerHeader({
      client: selectedTask.client,
      title: selectedTask.title,
      address: selectedTask.address,
      omitServiceLabels: primaryServiceLabel ? [primaryServiceLabel] : undefined,
    });
  }, [selectedTask, primaryServiceLabel]);

  const clientPhones = useMemo(() => {
    if (!selectedTask) return [];
    if (selectedTask.clientPhones?.length) return selectedTask.clientPhones;
    if (selectedTask.clientPhone) return [selectedTask.clientPhone];
    return [];
  }, [selectedTask]);

  const clientNifDisplay = useMemo(
    () => (selectedTask ? formatClientNifDisplay(selectedTask.clientNif) : null),
    [selectedTask]
  );

  const showPrimaryServiceInList =
    visitServices.some((s) => s.createdOnSite) || visitServices.length > 1;

  const primaryServiceColors = useMemo(() => {
    if (!primaryVisitService) return null;
    return getServiceTypeColor(primaryVisitService.serviceType);
  }, [primaryVisitService]);

  const measurementServices = visitServices.filter(
    (s) =>
      isMeasurementService(s.stage, s.name) ||
      s.serviceType === "TIRAR_MEDIDAS" ||
      s.serviceType === "REMEDICAO"
  );

  const showMeasurementsTab =
    measurementServices.length > 0 ||
    isMeasurementService(selectedTask?.stage, selectedTask?.title);

  const showClosedMeasurementFicha = closedVisitCanOpenMeasurementSheet({
    status: selectedTask?.status,
    stage: primaryVisitService?.stage || selectedTask?.stage,
    title: selectedTask?.title,
    name: primaryVisitService?.name,
    serviceType: primaryVisitService?.serviceType || selectedTask?.serviceType,
  });
  const showMeasurementsUi = showMeasurementsTab || showClosedMeasurementFicha;

  return {
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
    showMeasurementsUi,
  };
}