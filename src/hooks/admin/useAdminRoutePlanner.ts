"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyedMutator } from "swr";
import { analyzeRouteStrategy } from "@/lib/aiStrategyAction";
import { scheduleMassVisitsAction } from "@/actions/admin-actions";
import { getFairOnSiteDurationBenchmarksAction } from "@/actions/fairOnSiteDuration-actions";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { markLocalAgendaChanges } from "@/lib/agendaLocalChanges";
import { computeZoneInsights } from "@/lib/admin/zoneInsights";
import {
  massStopDueAt,
  massStopEndAt,
} from "@/lib/admin/routeScheduleSlots";
import { validateRouteSlotsBusinessHours } from "@/lib/admin/schedulingHours";
import {
  calculateOptimizedRoute as buildOptimizedRoute,
  reorderVisitStopsInRoute,
  selectRouteStopsForZone,
  type OptimizedRouteStop,
} from "@/lib/admin/routeOptimization";
import { getHqLocation } from "@/lib/hq";
import { toUserMessage } from "@/lib/userMessages";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";
import type {
  Opportunity,
  WorkspaceMember,
  RouteStop,
  RouteData,
  ZoneInsight,
  MapCategoryFilter,
} from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const HQ_LOCATION = getHqLocation();

type AdminToast = ReturnType<typeof useToast>;
type AdminConfirm = ReturnType<typeof useConfirm>;

export type UseAdminRoutePlannerParams = {
  opportunities: Opportunity[];
  workspaceMembers: WorkspaceMember[];
  adminNotificationScope: string;
  serviceTypeFilters: MapCategoryFilter[];
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  setCityFilter: (city: string | null) => void;
  setMapFocusOpportunityId: (id: string | null) => void;
  setMapTab: (tab: string) => void;
  mutateOpps: KeyedMutator<Opportunity[]>;
  refreshOpps: () => Promise<unknown>;
  refreshAgenda: () => Promise<unknown>;
  setIsScheduling: (value: boolean) => void;
  toast: AdminToast;
  confirm: AdminConfirm;
};

export function useAdminRoutePlanner({
  opportunities,
  workspaceMembers,
  adminNotificationScope,
  serviceTypeFilters,
  setSelectedOpportunity,
  setCityFilter,
  setMapFocusOpportunityId,
  setMapTab,
  mutateOpps,
  refreshOpps,
  refreshAgenda,
  setIsScheduling,
  toast,
  confirm,
}: UseAdminRoutePlannerParams) {
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const [routeSelectionMode, setRouteSelectionMode] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<RouteStop[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteStop[] | null>(null);
  const [routeManuallyAdjusted, setRouteManuallyAdjusted] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fuelPrice, setFuelPrice] = useState(1.9);
  const [fuelConsumption, setFuelConsumption] = useState(7.0);
  const [tollCost, setTollCost] = useState(0.0);
  const [realRouteData, setRealRouteData] = useState<RouteData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<unknown>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [unoptimizedTotalDistance, setUnoptimizedTotalDistance] = useState<number | null>(null);
  const [savingRatio, setSavingRatio] = useState(1);
  const [zoneInsights, setZoneInsights] = useState<ZoneInsight[]>([]);

  const [showMassScheduleModal, setShowMassScheduleModal] = useState(false);
  const [fairServiceTypeDurations, setFairServiceTypeDurations] = useState<FairServiceTypeDuration[]>(
    []
  );
  const [fairBenchmarksReady, setFairBenchmarksReady] = useState(false);

  const [massScheduleForm, setMassScheduleForm] = useState({
    date: "",
    technicianId: "",
    globalNotes: "",
    stopNotes: {} as Record<string, string>,
    stopTimes: {} as Record<string, string>,
    stopEndTimes: {} as Record<string, string>,
    urgent: false,
  });

  useEffect(() => {
    let cancelled = false;
    void getFairOnSiteDurationBenchmarksAction().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setFairServiceTypeDurations(result.data);
      }
      setFairBenchmarksReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setZoneInsights(
      computeZoneInsights(opportunities, HQ_LOCATION.coordinates, {
        fuelConsumption,
        fuelPrice,
        serviceTypeFilters,
      })
    );
  }, [opportunities, fuelConsumption, fuelPrice, serviceTypeFilters]);

  const calculateOptimizedRoute = () => {
    if (selectedForRoute.length === 0) return;
    setIsOptimizing(true);
    const result = buildOptimizedRoute(selectedForRoute, HQ_LOCATION.coordinates);
    if (result) {
      setSavingRatio(result.savingRatio);
      setOptimizedRoute(result.optimizedRoute);
      setRouteManuallyAdjusted(false);
      setAiAnalysis(null);
    }
    setIsOptimizing(false);
  };

  const handleManualRouteReorder = (fromVisitIndex: number, toVisitIndex: number) => {
    if (!optimizedRoute) return;
    setOptimizedRoute(
      reorderVisitStopsInRoute(
        optimizedRoute,
        fromVisitIndex,
        toVisitIndex,
        HQ_LOCATION.coordinates
      )
    );
    setRouteManuallyAdjusted(true);
    setAiAnalysis(null);
  };

  const openMassScheduleModal = async () => {
    if (routeManuallyAdjusted) {
      const confirmed = await confirm({
        title: "Ordem alterada manualmente",
        description:
          "Está a agendar um percurso que já foi otimizado, mas cuja ordem das paragens foi ajustada à mão. Os quilómetros e custos foram recalculados para esta sequência. Tem a certeza que quer continuar?",
        confirmLabel: "Agendar esta ordem",
        cancelLabel: "Voltar ao roteiro",
        destructive: true,
      });
      if (!confirmed) return;
    }
    setShowMassScheduleModal(true);
  };

  const resetRoutePlanningState = useCallback(() => {
    setSelectedForRoute([]);
    setOptimizedRoute(null);
    setRouteManuallyAdjusted(false);
    setRealRouteData(null);
    setUnoptimizedTotalDistance(null);
    setAiAnalysis(null);
    setRouteSelectionMode(false);
    setShowRouteSheet(false);
  }, []);

  const toggleSelectionForRoute = (opportunity: RouteStop) => {
    setSelectedForRoute((prev) => {
      const exists = prev.find((item) => item.id === opportunity.id);
      return exists ? prev.filter((item) => item.id !== opportunity.id) : [...prev, opportunity];
    });
    setOptimizedRoute(null);
  };

  const handleMapTaskSelect = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setMapFocusOpportunityId(opp.id);
  };

  const autoGenerateRouteForZone = (zoneName: string) => {
    const selection = selectRouteStopsForZone(opportunities, zoneName, HQ_LOCATION.coordinates);

    if (selection.length === 0) {
      toast.warning("Sem Serviços", "Não existem serviços por agendar nesta zona.");
      return;
    }

    setSelectedForRoute(selection);
    setRouteSelectionMode(true);
    setCityFilter(zoneName);
    setOptimizedRoute(null);
  };

  const handleMassSchedule = async () => {
    try {
      if (!optimizedRoute) return;

      const selectedTech = workspaceMembers.find((m) => m.id === massScheduleForm.technicianId);
      if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
        toast.error(
          "Técnico inválido",
          "Selecione um técnico com conta no Twenty CRM (função Técnicos)."
        );
        return;
      }

      const visitStops = optimizedRoute.filter(
        (stop) =>
          !stop.isReturn &&
          !isOnboardingDemoEntity({ id: stop.twentyId }) &&
          !(stop.taskId && isOnboardingDemoEntity({ id: stop.taskId }))
      );
      if (visitStops.length === 0) {
        toast.info(
          "Formação",
          "No guia o agendamento em massa é simulado — nada foi enviado ao CRM."
        );
        setShowMassScheduleModal(false);
        return;
      }
      const slots = visitStops.map((stop) =>
        massStopDueAt(massScheduleForm.date, massScheduleForm.stopTimes, stop.twentyId)
      );
      if (slots.some((slot) => !slot)) {
        toast.error("Hora em falta", "Indique uma hora válida em cada paragem.");
        return;
      }
      const routeHoursWarning = validateRouteSlotsBusinessHours(
        slots.map((dueAt) => ({ dueAt: dueAt as Date }))
      );
      if (routeHoursWarning) {
        const dateLabel = new Date(`${massScheduleForm.date}T12:00:00`).toLocaleDateString(
          "pt-PT",
          { weekday: "long", day: "numeric", month: "long" }
        );
        const confirmedHours = await confirm({
          title: "Fora do horário habitual",
          description: `${routeHoursWarning} Pretende mesmo agendar a rota para ${dateLabel}?`,
          confirmLabel: "Agendar rota nestas horas",
          cancelLabel: "Cancelar",
          destructive: true,
        });
        if (!confirmedHours) return;
      }

      const stopsPayload = visitStops.map((stop, index) => {
        const dueAt = slots[index] as Date;
        const horaDeFimIso =
          massStopEndAt(
            massScheduleForm.date,
            dueAt,
            massScheduleForm.stopEndTimes,
            stop.twentyId
          )?.toISOString() ?? null;

        return {
          title: stop.title,
          twentyId: stop.twentyId,
          stage: stop.stage,
          isReturn: stop.isReturn,
          rawAddress: stop.rawAddress,
          pointOfContactId: stop.pointOfContactId,
          pointOfContactEmail: stop.pointOfContactEmail,
          clientName: stop.client,
          taskId: stop.taskId,
          dueAtIso: dueAt.toISOString(),
          horaDeFimIso,
          notes: massScheduleForm.stopNotes[stop.twentyId] || "",
        };
      });

      setIsScheduling(true);

      const result = await scheduleMassVisitsAction(
        stopsPayload,
        massScheduleForm.technicianId,
        selectedTech.name || "",
        massScheduleForm.globalNotes,
        massScheduleForm.urgent
      );

      if (!result.success) {
        toast.error(
          "Erro ao agendar rota",
          toUserMessage(result.error, "Não foi possível agendar a rota.")
        );
        return;
      }

      const scheduledIds = new Set(visitStops.map((stop) => stop.twentyId));
      await mutateOpps(
        (current) => {
          if (!Array.isArray(current)) return current;
          return current.map((opp) =>
            scheduledIds.has(opp.twentyId)
              ? {
                  ...opp,
                  hasScheduledTask: true,
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

      const scheduledCount = result.data?.scheduledCount ?? visitStops.length;
      const skippedCount = result.data?.skippedCount ?? 0;
      const skippedSuffix =
        skippedCount > 0 ? ` (${skippedCount} já confirmadas e ignoradas)` : "";
      const conflictNote = result.data?.conflictWarning ? ` ${result.data.conflictWarning}` : "";
      const dateLabel = new Date(`${massScheduleForm.date}T12:00:00`).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
      });
      const failed = result.data?.failed ?? [];

      if (failed.length > 0) {
        toast.warning(
          "Rota parcialmente agendada",
          `${scheduledCount} visitas com ${selectedTech.name} em ${dateLabel}. Falharam: ${failed
            .map((f) => f.title)
            .join(", ")}.`
        );
      } else {
        toast.success(
          "Rota agendada",
          `${scheduledCount} visitas com ${selectedTech.name} em ${dateLabel}.${skippedSuffix}${conflictNote}`
        );
      }
      markLocalAgendaChanges(
        adminNotificationScope,
        visitStops.flatMap((stop) => {
          const keys: string[] = [stop.twentyId];
          const opp = opportunities.find((o) => o.twentyId === stop.twentyId);
          if (opp?.taskId) keys.push(opp.taskId);
          return keys;
        }),
        ["nova", "reagendada", "reatribuida"]
      );
      setShowMassScheduleModal(false);
      setMassScheduleForm({
        date: "",
        technicianId: "",
        globalNotes: "",
        stopNotes: {},
        stopTimes: {},
        stopEndTimes: {},
        urgent: false,
      });
      resetRoutePlanningState();
    } catch (e: unknown) {
      mutateOpps();
      toast.error("Erro ao agendar rota", toUserMessage(e, "Não foi possível agendar a rota."));
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAiAudit = async () => {
    setIsAiAnalyzing(true);
    try {
      const analysis = await analyzeRouteStrategy(
        {
          distanceKm: realRouteData?.distanceKm || 0,
          durationMin: realRouteData?.durationMin || 0,
          stopsCount: selectedForRoute.length,
          stops: selectedForRoute,
          totalCost:
            (realRouteData?.distanceKm || 0) * (fuelConsumption / 100) * fuelPrice + tollCost,
        },
        { fuelPrice, fuelConsumption }
      );
      setAiAnalysis(analysis);
      if (analysis && typeof analysis === "object" && "error" in analysis && analysis.error) {
        toast.warning("Análise indisponível", String(analysis.error));
      }
    } catch (e: unknown) {
      toast.error("Análise de rota", toUserMessage(e, "Não foi possível analisar a rota."));
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return {
    showRouteSheet,
    setShowRouteSheet,
    routeSelectionMode,
    setRouteSelectionMode,
    selectedForRoute,
    optimizedRoute,
    setOptimizedRoute,
    routeManuallyAdjusted,
    isOptimizing,
    fuelPrice,
    setFuelPrice,
    fuelConsumption,
    setFuelConsumption,
    tollCost,
    setTollCost,
    realRouteData,
    setRealRouteData,
    aiAnalysis,
    setAiAnalysis,
    isAiAnalyzing,
    unoptimizedTotalDistance,
    setUnoptimizedTotalDistance,
    savingRatio,
    setSavingRatio,
    zoneInsights,
    showMassScheduleModal,
    setShowMassScheduleModal,
    fairServiceTypeDurations,
    fairBenchmarksReady,
    massScheduleForm,
    setMassScheduleForm,
    calculateOptimizedRoute,
    handleManualRouteReorder,
    openMassScheduleModal,
    resetRoutePlanningState,
    toggleSelectionForRoute,
    handleMapTaskSelect,
    autoGenerateRouteForZone,
    handleMassSchedule,
    handleAiAudit,
  };
}