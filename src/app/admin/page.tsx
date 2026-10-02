"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { canAccessAdminPanel } from "@/lib/auth/session";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";

import { isTaskCompleted, isNeedsSchedulingStage } from '@/lib/crm';
import { analyzeRouteStrategy } from '@/lib/aiStrategyAction';
import { useSync } from '@/hooks/useSync';
import { useTechnicianLocations } from '@/hooks/useTechnicianLocations';
import { useCalendarMidnightRollover } from "@/hooks/useCalendarMidnightRollover";
import {
  cancelAppointmentAction,
  geocodeAndUpdateOpportunityAction,
  runOpportunityMaintenanceAction,
  scheduleMassVisitsAction,
  scheduleTechnicalVisitAction,
  updateOpportunityCoordinatesAction,
} from "@/actions/admin-actions";
import {
  normalizeOpportunityDates,
  normalizeOpportunityList,
} from "@/lib/admin/opportunityNormalizers";
import { isTerminalHistoryStatus } from "@/lib/crm/dateFilters";
import {
  buildMapTechnicianOptions,
  extractTechnicianNames,
  filterCalendarOpportunities,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
import {
  searchOpportunities,
  suggestMapTabForOpportunity,
} from "@/lib/admin/opportunitySearch";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { toUserMessage } from "@/lib/userMessages";
import { buildAgendaSnapshotItem, toSafeIso } from "@/lib/agendaDiff";
import {
  getNotificationScope,
  migrateLegacyInAppNotificationScope,
  type InAppNotification,
} from "@/lib/inAppNotifications";
import { migrateLegacyAgendaSnapshotScope } from "@/lib/agendaSnapshotStorage";
import { useAgendaNotifications } from "@/hooks/useAgendaNotifications";
import { isStrictAdminRole, resolveWorkspaceMemberId, type AppSessionUser } from "@/lib/auth/session";
import { useObservabilityAdminAlerts } from "@/hooks/useObservabilityAdminAlerts";
import { markLocalAgendaChange, markLocalAgendaChanges } from "@/lib/agendaLocalChanges";
import { computeZoneInsights, countUnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import { computeRouteSlots, findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import {
  getAdminSchedulingHoursWarning,
  validateRouteSlotsBusinessHours,
} from "@/lib/admin/schedulingHours";
import {
  buildRouteFromVisitOrder,
  calculateOptimizedRoute as buildOptimizedRoute,
  reorderVisitStopsInRoute,
  selectRouteStopsForZone,
  type OptimizedRouteStop,
} from "@/lib/admin/routeOptimization";
import type { View } from "@/lib/admin/calendarLocalizer";
import {
  Opportunity,
  WorkspaceMember,
  RouteStop,
  RouteData,
  ZoneInsight,
  MapCategoryFilter,
  MapStallFilter,
} from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
const AdminCommandPalette = dynamic(() => import("@/components/admin/AdminCommandPalette"), {
  ssr: false,
});
import { MapSkeleton } from "@/components/ui/Skeleton";
import AdminHeader from "@/components/admin/AdminHeader";
import { ADMIN_VIEW_IDS } from "@/components/admin/AdminPrimaryNav";
import {
  listenMainViewPop,
  readMainViewFromUrl,
  writeMainViewToUrl,
} from "@/lib/urlMainView";
import AdminMapView from "@/components/admin/views/AdminMapView";
const AdminCalendarView = dynamic(
  () => import("@/components/admin/views/AdminCalendarView"),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const AdminHistoryView = dynamic(
  () => import("@/components/admin/views/AdminHistoryView"),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const OpportunityDrawer = dynamic(() => import("@/components/admin/OpportunityDrawer"), {
  ssr: false,
});
import { useOnboardingMapDemo } from "@/hooks/useOnboardingMapDemo";
import { useOnboardingAdminTour } from "@/hooks/useOnboardingAdminTour";
import {
  createAdminOnboardingDemoOpportunity,
  isOnboardingDemoEntity,
} from "@/lib/onboarding/demoMapPin";
import { buildAdminDemoScheduleFormSeed } from "@/lib/onboarding/demoAdminScheduleSeed";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { dispatchOnboardingAdminScheduleModalOpened } from "@/lib/onboarding/events";
import type { ScheduleForm } from "@/components/admin/ScheduleModal";
const ScheduleModal = dynamic(() => import("@/components/admin/ScheduleModal"), {
  ssr: false,
});
const MassScheduleModal = dynamic(() => import("@/components/admin/MassScheduleModal"), {
  ssr: false,
});
import { getHqLocation } from "@/lib/hq";
import { cn } from "@/lib/cn";

const HQ_LOCATION = getHqLocation();

export default function Admin() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" ? readMainViewFromUrl(ADMIN_VIEW_IDS, "map") : "map"
  );

  const changeAdminView = useCallback((next: string) => {
    if (!ADMIN_VIEW_IDS.includes(next as (typeof ADMIN_VIEW_IDS)[number])) return;
    setView(next);
    writeMainViewToUrl(next);
  }, []);

  useEffect(() => {
    writeMainViewToUrl(view, true);
  }, []);

  useEffect(() => {
    return listenMainViewPop((next) => {
      if (!next || !ADMIN_VIEW_IDS.includes(next as (typeof ADMIN_VIEW_IDS)[number])) return;
      setView((current) => {
        if (current === next) return current;
        setSelectedOpportunity(null);
        return next;
      });
    });
  }, []);
  const [mapTab, setMapTab] = useState("unscheduled");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [userName, setUserName] = useState("");

  const { 
    data: rawOpportunities, 
    isLoading: loadingOpps, 
    isSyncing: syncingOpps, 
    error: oppsLoadError,
    mutate: mutateOpps,
    lastSuccessAt: oppsLastSuccessAt,
    isStale: oppsDataStale,
  } = useSync<Opportunity[]>("/api/opportunities", { refreshInterval: 60_000 });

  const {
    data: agendaFeed,
    error: agendaFeedError,
    mutate: mutateAgendaFeed,
  } = useSync<import("@/lib/schemas/agendaFeed").AdminAgendaFeedFromSchema>("/api/agenda/feed", {
    refreshInterval: 45_000,
    refreshWhenHidden: true,
  });
  
  const { 
    data: workspaceMembers = [], 
    isLoading: loadingMembers 
  } = useSync<WorkspaceMember[]>('/api/members');

  const loading = loadingOpps || loadingMembers;
  const isSyncing = syncingOpps;
  
  const opportunities = useMemo<Opportunity[]>(
    () => normalizeOpportunityList(rawOpportunities ?? []),
    [rawOpportunities]
  );

  const [routeSelectionMode, setRouteSelectionMode] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<RouteStop[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteStop[] | null>(null);
  const [routeManuallyAdjusted, setRouteManuallyAdjusted] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fuelPrice, setFuelPrice] = useState(1.90);
  const [fuelConsumption, setFuelConsumption] = useState(7.0);
  const [tollCost, setTollCost] = useState(0.00);
  const [realRouteData, setRealRouteData] = useState<RouteData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<unknown>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [unoptimizedTotalDistance, setUnoptimizedTotalDistance] = useState<number | null>(null);
  const [savingRatio, setSavingRatio] = useState(1);
  const [zoneInsights, setZoneInsights] = useState<ZoneInsight[]>([]);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [serviceTypeFilters, setServiceTypeFilters] = useState<MapCategoryFilter[]>([]);
  const [mapTechnicianFilter, setMapTechnicianFilter] = useState<string | null>(null);
  const [historyOutcomes, setHistoryOutcomes] = useState<MapHistoryOutcome[]>([]);
  const [stallFilter, setStallFilter] = useState<MapStallFilter>("all");
  const [mapTextSearch, setMapTextSearch] = useState<string | null>(null);
  const [mapFocusOpportunityId, setMapFocusOpportunityId] = useState<string | null>(null);

  const historyMapFetchEnabled = historyOutcomes.length > 0;
  const { data: mapHistoryPage, mutate: mutateHistoryPage } = useSync<{ items: Opportunity[] }>(
    historyMapFetchEnabled ? "/api/opportunities/history?page=1&pageSize=100" : null
  );
  const mapHistoryItems = useMemo(
    () => normalizeOpportunityList(mapHistoryPage?.items ?? []),
    [mapHistoryPage]
  );
  const [showMassScheduleModal, setShowMassScheduleModal] = useState(false);
  
  const [massScheduleForm, setMassScheduleForm] = useState({
    date: "",
    technicianId: "",
    globalNotes: "",
    stopNotes: {} as Record<string, string>,
    urgent: false,
  });
  
  const [calendarDate, setCalendarDate] = useState(new Date());
  const resetAdminCalendarToToday = useCallback(() => {
    setCalendarDate(new Date());
  }, []);
  useCalendarMidnightRollover(resetAdminCalendarToToday);
  const [calendarView, setCalendarView] = useState<View>("month");
  const lastSync = oppsLastSuccessAt ? new Date(oppsLastSuccessAt) : null;

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: "", date: "", time: "09:00", technicianId: "", urgent: false, notes: "",
    addressStreet1: "", addressStreet2: "", addressCity: "", addressState: "",
    addressPostcode: "", addressCountry: "Portugal", addressLat: null, addressLng: null
  });

  const techniciansLocations = useTechnicianLocations();

  const { session, status: sessionStatus, serverUnreachable } = useResilientSessionGuard({
    isAuthorized: (s: Session) => {
      const role = (s.user as { role?: string })?.role;
      return Boolean(role && canAccessAdminPanel(role as import("@/lib/schemas/auth").AppRole));
    },
    onAuthorized: (s) => {
      const userRole = (s.user as { role?: string })?.role;
      setUserName(
        s.user?.name ||
          (userRole === "ceo" ? "CEO Executivo" : userRole === "member" ? "Membro" : "Administrador")
      );
    },
  });

  const memberId = resolveWorkspaceMemberId(session?.user as AppSessionUser | undefined);
  const adminNotificationScope = memberId ? getNotificationScope("admin", memberId) : "";
  const strictAdmin =
    Boolean(session?.user?.role && isStrictAdminRole(session.user.role as import("@/lib/schemas/auth").AppRole));
  useObservabilityAdminAlerts(strictAdmin, adminNotificationScope);
  const agendaNotificationsReady =
    Boolean(memberId) &&
    sessionStatus !== "loading" &&
    !agendaFeedError &&
    agendaFeed !== undefined;

  useEffect(() => {
    if (!adminNotificationScope) return;
    migrateLegacyInAppNotificationScope(adminNotificationScope);
    migrateLegacyAgendaSnapshotScope(adminNotificationScope);
  }, [adminNotificationScope]);

  const agendaSnapshotItems = useMemo(() => {
    if (!agendaNotificationsReady || !agendaFeed) return null;
    return agendaFeed.tasks.map((t) =>
      buildAgendaSnapshotItem({
        id: t.id,
        dueAt: toSafeIso(t.dueAt),
        status: t.status,
        client: t.client,
        nsi: t.nsi,
        visitTitle: t.visitTitle,
        opportunityId: t.opportunityId,
        technicianName: t.technicianName,
        assigneeId: t.assigneeId,
        onSiteOpportunityIds: t.onSiteOpportunityIds,
        onSiteServices: t.onSiteServices,
        statusNote: t.statusNote,
        serviceType: t.serviceType,
      })
    );
  }, [agendaNotificationsReady, agendaFeed]);

  const pipelineSnapshotItems = useMemo(() => {
    if (!agendaNotificationsReady || !agendaFeed) return null;
    return agendaFeed.pipeline.map((p) => ({
      opportunityId: p.opportunityId,
      stage: p.stage,
      label: p.label,
    }));
  }, [agendaNotificationsReady, agendaFeed]);

  useAgendaNotifications({
    scope: adminNotificationScope,
    items: agendaSnapshotItems,
    ready: agendaNotificationsReady,
    toast,
    pipelineItems: pipelineSnapshotItems,
    enableLateDetection: true,
  });

  useEffect(() => {
    const runMaintenance = () => {
      fetch('/api/opportunities/maintenance', { method: 'POST', credentials: 'include' }).catch(() => {});
    };

    runMaintenance();
    const interval = setInterval(runMaintenance, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const withoutGpsCount = useMemo(
    () => countUnscheduledWithoutGps(opportunities),
    [opportunities]
  );

  useEffect(() => {
    setZoneInsights(
      computeZoneInsights(opportunities, HQ_LOCATION.coordinates, {
        fuelConsumption,
        fuelPrice,
        serviceTypeFilters,
      })
    );
  }, [opportunities, fuelConsumption, fuelPrice, serviceTypeFilters]);

  const technicians = useMemo(
    () => extractTechnicianNames(opportunities),
    [opportunities]
  );

  const mapTechnicianOptions = useMemo(
    () => buildMapTechnicianOptions(opportunities, techniciansLocations),
    [opportunities, techniciansLocations]
  );

  const toggleServiceTypeFilter = (key: MapCategoryFilter) => {
    if (key === "all") {
      setServiceTypeFilters([]);
      return;
    }
    setServiceTypeFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleHistoryOutcome = (outcome: MapHistoryOutcome) => {
    setHistoryOutcomes((prev) =>
      prev.includes(outcome) ? prev.filter((o) => o !== outcome) : [...prev, outcome]
    );
  };

  const { mapTasks: opportunitiesForMap, demoActive: onboardingAdminDemoActive } =
    useOnboardingMapDemo(opportunities, "admin");

  const mapOpportunities = useMemo(() => {
    const q = mapTextSearch?.trim();
    const base = opportunitiesForMap;
    if (q) {
      return searchOpportunities(base, q, 50).filter(
        (opp) => opp.coordinates && Array.isArray(opp.coordinates)
      );
    }
    return filterMapOpportunities(base, {
      mapTab,
      cityFilter,
      serviceTypeFilters,
      stallFilter,
      technicianFilter: mapTechnicianFilter,
      historyOutcomes,
      historyItems: mapHistoryItems,
    });
  }, [
    opportunitiesForMap,
    mapTab,
    cityFilter,
    serviceTypeFilters,
    stallFilter,
    mapTechnicianFilter,
    historyOutcomes,
    mapHistoryItems,
    mapTextSearch,
  ]);

  useOnboardingAdminTour({
    demoActive: onboardingAdminDemoActive,
    setView: changeAdminView,
    setSelectedOpportunity,
    setMapTab,
  });

  useEffect(() => {
    if (!onboardingAdminDemoActive) return;

    const onScheduleTourAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;
      const demoOpp = createAdminOnboardingDemoOpportunity() as Opportunity;

      switch (action) {
        case "openAdminDemoScheduleModal":
          flushSync(() => {
            setSelectedOpportunity(demoOpp);
            setScheduleForm(buildAdminDemoScheduleFormSeed(demoOpp, workspaceMembers));
            setShowScheduleModal(true);
          });
          window.setTimeout(() => dispatchOnboardingAdminScheduleModalOpened(), 50);
          break;
        case "seedAdminDemoScheduleForm":
          setScheduleForm(buildAdminDemoScheduleFormSeed(demoOpp, workspaceMembers));
          break;
        case "closeAdminDemoScheduleModal":
          setShowScheduleModal(false);
          break;
        case "startAdminDemoRouteSelection": {
          const demo = createAdminOnboardingDemoOpportunity();
          const stop: RouteStop = {
            id: demo.id,
            twentyId: demo.twentyId,
            title: demo.title,
            coordinates: demo.coordinates as [number, number],
            address: demo.address,
            client: demo.client,
            rawAddress: demo.rawAddress,
          };
          flushSync(() => {
            changeAdminView("map");
            setMapTab("unscheduled");
            setRouteSelectionMode(true);
            setSelectedForRoute([stop]);
          });
          break;
        }
        case "openAdminDemoRouteSheet":
          setShowRouteSheet(true);
          break;
        case "openAdminDemoMassSchedule": {
          const demo = createAdminOnboardingDemoOpportunity();
          const stop: RouteStop = {
            id: demo.id,
            twentyId: demo.twentyId,
            title: demo.title,
            coordinates: demo.coordinates as [number, number],
            address: demo.address,
            client: demo.client,
            rawAddress: demo.rawAddress,
          };
          const demoRoute = buildRouteFromVisitOrder([stop], HQ_LOCATION.coordinates);
          flushSync(() => {
            changeAdminView("map");
            setMapTab("unscheduled");
            setRouteSelectionMode(true);
            setSelectedForRoute([stop]);
            setOptimizedRoute(demoRoute);
            setShowMassScheduleModal(true);
          });
          break;
        }
        case "closeAdminDemoMassSchedule":
          setShowMassScheduleModal(false);
          break;
        case "stopAdminDemoRouteSelection":
          setSelectedForRoute([]);
          setOptimizedRoute(null);
          setRouteManuallyAdjusted(false);
          setRealRouteData(null);
          setUnoptimizedTotalDistance(null);
          setAiAnalysis(null);
          setRouteSelectionMode(false);
          setShowRouteSheet(false);
          setShowMassScheduleModal(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onScheduleTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onScheduleTourAction);
  }, [onboardingAdminDemoActive, workspaceMembers]);

  const calendarOpportunities = useMemo(
    () => filterCalendarOpportunities(opportunities, selectedTechnician),
    [opportunities, selectedTechnician]
  );

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
    setSelectedForRoute(prev => {
      const exists = prev.find(item => item.id === opportunity.id);
      return exists ? prev.filter(item => item.id !== opportunity.id) : [...prev, opportunity];
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

  const handleCancelAppointment = async (opp: Opportunity) => {
    if (isOnboardingDemoEntity(opp)) {
      toast.info("Formação", "No guia o cancelamento é simulado — nada foi enviado ao CRM.");
      return;
    }
    if (!opp.taskId) {
      toast.error("Erro", "Não foi encontrada nenhuma tarefa ativa para cancelar.");
      return;
    }

    const techLabel = "";
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
      description: `Cancelar «${opp.title}»${dateLabel ? ` (${dateLabel})` : ""}${techLabel}? O serviço volta a pendente no CRM.`,
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
      toast.info("A sincronizar...", "A atualizar moradas e coordenadas com o Twenty CRM...");
      const result = await runOpportunityMaintenanceAction(true);
      if (!result.success) {
        toast.error("Erro ao sincronizar", result.error || "Falha na sincronização de manutenção.");
        return;
      }
      await mutateOpps();
      void mutateAgendaFeed();
      void mutateHistoryPage();
      toast.success("Sincronização Concluída", "Todas as moradas e coordenadas foram atualizadas.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao sincronizar";
      toast.error("Erro ao sincronizar", message);
    }
  };

  const handleUpdateGps = async (opp: Opportunity) => {
    if (isOnboardingDemoEntity(opp)) {
      toast.info("Formação", "No guia o GPS é simulado — nada foi enviado ao CRM.");
      return;
    }
    try {
      toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
      const result = await geocodeAndUpdateOpportunityAction(
        opp.twentyId,
        opp.address,
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
      await mutateOpps();
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
      mutateOpps();
      setSelectedOpportunity({ ...opp, coordinates: result.data });
    } catch {
      toast.error("Erro", "Erro ao atualizar coordenadas manuais.");
    }
  };

  const openScheduleModal = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setScheduleForm({
      title: `Visita Técnica - ${opp.title}`,
      date: "",
      time: "09:00",
      technicianId: "",
      urgent: false,
      notes: opp.report || "",
      addressStreet1: opp.rawAddress?.addressStreet1 || "",
      addressStreet2: opp.rawAddress?.addressStreet2 || "",
      addressCity: opp.rawAddress?.addressCity || "",
      addressState: opp.rawAddress?.addressState || "",
      addressPostcode: opp.rawAddress?.addressPostcode || "",
      addressCountry: opp.rawAddress?.addressCountry || "Portugal",
      addressLat: opp.coordinates ? opp.coordinates[0] : null,
      addressLng: opp.coordinates ? opp.coordinates[1] : null
    });
    setShowScheduleModal(true);
  };

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
      const [year, month, day] = scheduleForm.date.split('-').map(Number);
      const [hour, minute] = scheduleForm.time.split(':').map(Number);
      const dueAt = new Date(year, month - 1, day, hour, minute);
      const selectedTech = workspaceMembers.find(m => m.id === scheduleForm.technicianId);

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

      if (scheduleForm.urgent) {
        const conflicts = findScheduleConflicts(
          [
            {
              title: scheduleForm.title,
              dueAt,
              opportunityId: selectedOpportunity.twentyId,
            },
          ],
          opportunities,
          selectedTech.name || "",
          { excludeOpportunityIds: [selectedOpportunity.twentyId] }
        );
        let description = `Tem a certeza que quer agendar com sobreposição de agenda para ${dateTimeLabel} com ${selectedTech.name}?`;
        if (conflicts.length > 0) {
          const first = conflicts[0];
          const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });
          description += ` Atenção: «${first.conflictingTitle}» está marcado às ${timeLabel} para o mesmo técnico.`;
        }
        const confirmed = await confirm({
          title: "Sobreposição de agenda",
          description,
          confirmLabel: "Agendar mesmo assim",
          cancelLabel: "Cancelar",
          destructive: true,
        });
        if (!confirmed) return;
      }

      const result = await scheduleTechnicalVisitAction({
        title: scheduleForm.title,
        dueAtIso: dueAt.toISOString(),
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
      });

      if (!result.success) {
        toast.error(
          "Erro ao agendar",
          toUserMessage(result.error, "Não foi possível agendar a visita.")
        );
        return;
      }

      const conflictNote = result.data?.conflictWarning
        ? ` ${result.data.conflictWarning}`
        : "";
      toast.success(
        "Visita agendada",
        `Visita confirmada no CRM para o técnico.${conflictNote}`
      );
      const scheduleKinds = ["nova", "reagendada", "reatribuida"] as const;
      if (selectedOpportunity.taskId) {
        markLocalAgendaChange(adminNotificationScope, selectedOpportunity.taskId, [...scheduleKinds]);
      }
      markLocalAgendaChange(adminNotificationScope, selectedOpportunity.twentyId, [...scheduleKinds]);
      setShowScheduleModal(false);
      setSelectedOpportunity(null);
      mutateOpps();
      void mutateAgendaFeed();
    } catch (e: unknown) {
      toast.error("Erro ao agendar", toUserMessage(e, "Não foi possível agendar a visita."));
    } finally {
      setIsScheduling(false);
    }
  };

  const handleMassSchedule = async () => {
    try {
      if (!optimizedRoute) return;

      const selectedTech = workspaceMembers.find(m => m.id === massScheduleForm.technicianId);
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
      const slots = computeRouteSlots(massScheduleForm.date, visitStops.length);
      const routeHoursWarning = validateRouteSlotsBusinessHours(slots);
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

      const stopsPayload = visitStops.map((stop, index) => ({
        title: stop.title,
        twentyId: stop.twentyId,
        stage: stop.stage,
        isReturn: stop.isReturn,
        rawAddress: stop.rawAddress,
        pointOfContactId: stop.pointOfContactId,
        pointOfContactEmail: stop.pointOfContactEmail,
        clientName: stop.client,
        taskId: stop.taskId,
        dueAtIso: slots[index]?.dueAt.toISOString() || new Date().toISOString(),
        notes: massScheduleForm.stopNotes[stop.twentyId] || "",
      }));

      if (massScheduleForm.urgent) {
        const dateLabel = new Date(`${massScheduleForm.date}T12:00:00`).toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        const conflicts = findScheduleConflicts(
          stopsPayload.map((stop) => ({
            title: stop.title,
            dueAt: new Date(stop.dueAtIso),
            opportunityId: stop.twentyId,
          })),
          opportunities,
          selectedTech.name || "",
          { excludeOpportunityIds: stopsPayload.map((s) => s.twentyId) }
        );
        let description = `Tem a certeza que quer agendar ${visitStops.length} visitas com sobreposição de agenda para ${dateLabel} com ${selectedTech.name}?`;
        if (conflicts.length > 0) {
          const first = conflicts[0];
          const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });
          description += ` Atenção: «${first.stopTitle}» sobrepõe-se a «${first.conflictingTitle}» às ${timeLabel}.`;
        }
        const confirmed = await confirm({
          title: "Sobreposição de agenda",
          description,
          confirmLabel: "Agendar rota mesmo assim",
          cancelLabel: "Cancelar",
          destructive: true,
        });
        if (!confirmed) return;
      }

      setIsScheduling(true);

      const result = await scheduleMassVisitsAction(
        stopsPayload,
        massScheduleForm.technicianId,
        selectedTech.name || "",
        massScheduleForm.globalNotes,
        massScheduleForm.urgent
      );

      mutateOpps();
      void mutateAgendaFeed();

      if (!result.success) {
        toast.error(
          "Erro ao agendar rota",
          toUserMessage(result.error, "Não foi possível agendar a rota.")
        );
        return;
      }

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
          totalCost: (realRouteData?.distanceKm || 0) * (fuelConsumption / 100) * fuelPrice + tollCost
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

  const handleAdminPickOpportunity = useCallback(
    (opp: Opportunity, options?: { view?: "map" | "history" }) => {
      const useHistory =
        options?.view === "history" ||
        (options?.view !== "map" && isTerminalHistoryStatus(opp.status));

      setMapTextSearch(null);
      setSelectedOpportunity(opp);

      if (useHistory) {
        changeAdminView("history");
        setMapFocusOpportunityId(null);
      } else {
        changeAdminView("map");
        setMapTab(suggestMapTabForOpportunity(opp));
        setMapFocusOpportunityId(opp.id);
        if (!opp.coordinates) {
          toast.info(
            "Sem coordenadas GPS",
            "Detalhes abertos — este serviço ainda não tem pin no mapa."
          );
        }
      }
    },
    [toast, changeAdminView]
  );

  const findOpportunityForAgendaNotification = useCallback(
    (notification: InAppNotification) => {
      const pools = [opportunities, mapHistoryItems];
      for (const list of pools) {
        const hit = list.find(
          (o) =>
            (notification.taskId && o.taskId === notification.taskId) ||
            (notification.opportunityId &&
              (o.twentyId === notification.opportunityId || o.id === notification.opportunityId))
        );
        if (hit) return hit;
      }
      return null;
    },
    [opportunities, mapHistoryItems]
  );

  const openAgendaNotificationInvestigate = useCallback(
    async (notification: InAppNotification) => {
      let opp = findOpportunityForAgendaNotification(notification);

      if (!opp) {
        const params = new URLSearchParams();
        if (notification.taskId) params.set("taskId", notification.taskId);
        if (notification.opportunityId) params.set("opportunityId", notification.opportunityId);
        if (params.toString()) {
          try {
            const res = await fetch(`/api/opportunities/lookup?${params}`, {
              credentials: "include",
            });
            if (res.ok) {
              const body = (await res.json()) as { opportunity?: Opportunity };
              if (body.opportunity) {
                opp = normalizeOpportunityDates(body.opportunity);
              }
            }
          } catch {
            /* fallback abaixo */
          }
        }
      }

      if (!opp) {
        toast.warning(
          "Serviço indisponível",
          "Não encontrámos este serviço na lista. A sincronizar o CRM…"
        );
        void handleRefresh();
        return;
      }

      handleAdminPickOpportunity(opp);
    },
    [findOpportunityForAgendaNotification, toast, handleRefresh, handleAdminPickOpportunity]
  );

  const handleAdminMapTextSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      setMapTextSearch(q);
      setMapFocusOpportunityId(null);
      changeAdminView("map");
      const hits = searchOpportunities(opportunities, q, 50);
      if (hits.length === 0) {
        toast.warning("Sem resultados", "Nenhum serviço corresponde à pesquisa.");
        return;
      }
      if (hits.length === 1) {
        handleAdminPickOpportunity(hits[0]);
        return;
      }
      const withGps = hits.filter((h) => h.coordinates && Array.isArray(h.coordinates));
      toast.info(
        `${hits.length} serviços encontrados`,
        withGps.length > 0
          ? `${withGps.length} com pin no mapa. Toque num marcador para ver detalhes.`
          : "Nenhum tem GPS — abra um resultado na pesquisa (Ctrl+K)."
      );
    },
    [opportunities, toast, handleAdminPickOpportunity, changeAdminView]
  );

  const handlePaletteSelectTechnician = useCallback((name: string) => {
    setSelectedTechnician(name);
    setMapTechnicianFilter(name);
    changeAdminView("calendar");
  }, [changeAdminView]);

  useEffect(() => {
    if (!selectedOpportunity) {
      setMapFocusOpportunityId(null);
    }
  }, [selectedOpportunity]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden brutal-grid-bg bg-background text-foreground">
      <div className="safe-top shrink-0">
        <ServerConnectionBanner visible={serverUnreachable} />
      </div>
      <AdminCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={changeAdminView}
        onSearch={handleAdminMapTextSearch}
        onSelectOpportunity={handleAdminPickOpportunity}
        opportunities={opportunities}
        technicians={technicians}
        onSelectTechnician={handlePaletteSelectTechnician}
      />
      <AdminHeader 
        opportunitiesCount={opportunities.length}
        lastSync={lastSync}
        syncDataStale={oppsDataStale}
        loading={loading}
        isSyncing={isSyncing}
        router={router}
        onRefresh={handleRefresh}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        userName={userName}
        view={view}
        setView={changeAdminView}
        onInvestigateAgendaNotification={openAgendaNotificationInvestigate}
      />

      <div className="relative flex-1 overflow-hidden bg-background" data-tour="admin-workspace">
        {loading ? (
          <MapSkeleton />
        ) : oppsLoadError && opportunities.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm font-black text-foreground">Não foi possível carregar o mapa do CRM.</p>
            <button
              type="button"
              onClick={() => mutateOpps()}
              className="rounded-xl border-2 border-border-strong bg-primary px-4 py-2 text-xs font-black uppercase text-primary-foreground"
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <div className="relative h-full min-h-0 w-full">
            <div
              className={cn(
                "absolute inset-0 min-h-0",
                view !== "map" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "map"}
            >
          <AdminMapView
            hqLocation={HQ_LOCATION}
            mapOpportunities={mapOpportunities}
            allOpportunities={opportunities}
            mapTab={mapTab}
            setMapTab={setMapTab}
            serviceTypeFilters={serviceTypeFilters}
            onToggleServiceTypeFilter={toggleServiceTypeFilter}
            mapTechnicianFilter={mapTechnicianFilter}
            setMapTechnicianFilter={setMapTechnicianFilter}
            mapTechnicianOptions={mapTechnicianOptions}
            historyOutcomes={historyOutcomes}
            onToggleHistoryOutcome={toggleHistoryOutcome}
            onClearServiceTypeFilters={() => setServiceTypeFilters([])}
            onClearHistoryOutcomes={() => setHistoryOutcomes([])}
            stallFilter={stallFilter}
            setStallFilter={setStallFilter}
            techniciansLocations={techniciansLocations}
            routeSelectionMode={routeSelectionMode}
            setRouteSelectionMode={setRouteSelectionMode}
            onExitRoutePlanning={resetRoutePlanningState}
            selectedForRoute={selectedForRoute}
            onTaskSelect={handleMapTaskSelect}
            onScheduleFromMap={openScheduleModal}
            optimizedRoute={optimizedRoute}
            fuelPrice={fuelPrice}
            setFuelPrice={setFuelPrice}
            fuelConsumption={fuelConsumption}
            setFuelConsumption={setFuelConsumption}
            tollCost={tollCost}
            setTollCost={setTollCost}
            realRouteData={realRouteData}
            setRealRouteData={setRealRouteData}
            savingRatio={savingRatio}
            setUnoptimizedTotalDistance={setUnoptimizedTotalDistance}
            setOptimizedRoute={setOptimizedRoute}
            isOptimizing={isOptimizing}
            calculateOptimizedRoute={calculateOptimizedRoute}
            toggleSelectionForRoute={toggleSelectionForRoute}
            aiAnalysis={aiAnalysis}
            setAiAnalysis={setAiAnalysis}
            isAiAnalyzing={isAiAnalyzing}
            handleAiAudit={handleAiAudit}
            unoptimizedTotalDistance={unoptimizedTotalDistance}
            showRouteSheet={showRouteSheet}
            setShowRouteSheet={setShowRouteSheet}
            routeManuallyAdjusted={routeManuallyAdjusted}
            onManualRouteReorder={handleManualRouteReorder}
            openMassScheduleModal={openMassScheduleModal}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            loading={loading}
            zoneInsights={zoneInsights}
            withoutGpsCount={withoutGpsCount}
            onSyncAddresses={handleRefresh}
            isSyncing={isSyncing}
            autoGenerateRouteForZone={autoGenerateRouteForZone}
            mapTextSearch={mapTextSearch}
            onClearMapTextSearch={() => setMapTextSearch(null)}
            mapFocusOpportunityId={mapFocusOpportunityId}
          />
            </div>
            <div
              className={cn(
                "absolute inset-0 min-h-0",
                view !== "calendar" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "calendar"}
            >
          <AdminCalendarView
            technicians={technicians}
            selectedTechnician={selectedTechnician}
            setSelectedTechnician={setSelectedTechnician}
            calendarOpportunities={calendarOpportunities}
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            onSelectOpportunity={setSelectedOpportunity}
            onCancelAppointment={handleCancelAppointment}
          />
            </div>
            <div
              className={cn(
                "absolute inset-0 min-h-0 overflow-hidden",
                view !== "history" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "history"}
            >
          <AdminHistoryView onSelectOpportunity={setSelectedOpportunity} />
            </div>
          </div>
        )}
      </div>

      <OpportunityDrawer 
        selectedOpportunity={selectedOpportunity}
        setSelectedOpportunity={setSelectedOpportunity}
        handleCancelAppointment={handleCancelAppointment}
        handleUpdateGps={handleUpdateGps}
        handleManualCoordsUpdate={handleManualCoordsUpdate}
        openScheduleModal={openScheduleModal}
      />

      <ScheduleModal 
        showScheduleModal={showScheduleModal}
        setShowScheduleModal={setShowScheduleModal}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        workspaceMembers={workspaceMembers}
        opportunities={opportunities}
        schedulingOpportunityId={selectedOpportunity?.twentyId}
        isScheduling={isScheduling}
        handleScheduleVisit={handleScheduleVisit}
        isOnboardingDemoSchedule={isOnboardingDemoEntity(selectedOpportunity)}
      />

      <MassScheduleModal 
        showMassScheduleModal={showMassScheduleModal}
        setShowMassScheduleModal={setShowMassScheduleModal}
        optimizedRoute={optimizedRoute}
        opportunities={opportunities}
        massScheduleForm={massScheduleForm}
        setMassScheduleForm={setMassScheduleForm}
        workspaceMembers={workspaceMembers}
        isScheduling={isScheduling}
        handleMassSchedule={handleMassSchedule}
      />

    </div>
  );
}
