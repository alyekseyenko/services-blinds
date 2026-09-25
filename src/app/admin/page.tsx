"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { isTaskCompleted, isNeedsSchedulingStage } from '@/lib/crm';
import { analyzeRouteStrategy } from '@/lib/aiStrategyAction';
import { useSync } from '@/hooks/useSync';
import { useTechnicianLocations } from '@/hooks/useTechnicianLocations';
import {
  cancelAppointmentAction,
  geocodeAndUpdateOpportunityAction,
  runOpportunityMaintenanceAction,
  scheduleMassVisitsAction,
  scheduleTechnicalVisitAction,
  updateOpportunityCoordinatesAction,
} from "@/actions/admin-actions";
import { normalizeOpportunityList } from "@/lib/admin/opportunityNormalizers";
import {
  buildMapTechnicianOptions,
  extractTechnicianNames,
  filterCalendarOpportunities,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { computeZoneInsights, countUnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import { computeRouteSlots, findScheduleConflicts } from "@/lib/admin/routeScheduleSlots";
import {
  calculateOptimizedRoute as buildOptimizedRoute,
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
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import { MapSkeleton } from "@/components/ui/Skeleton";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import AdminMapView from "@/components/admin/views/AdminMapView";
import AdminCalendarView from "@/components/admin/views/AdminCalendarView";
import AdminHistoryView from "@/components/admin/views/AdminHistoryView";
import OpportunityDrawer from "@/components/admin/OpportunityDrawer";
import ScheduleModal, { ScheduleForm } from "@/components/admin/ScheduleModal";
import MassScheduleModal from "@/components/admin/MassScheduleModal";
import { getHqLocation } from "@/lib/hq";

const HQ_LOCATION = getHqLocation();

export default function Admin() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const [view, setView] = useState("map");
  const [mapTab, setMapTab] = useState("unscheduled");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [userName, setUserName] = useState("");

  const { 
    data: rawOpportunities = [], 
    isLoading: loadingOpps, 
    isSyncing: syncingOpps, 
    mutate: mutateOpps 
  } = useSync<Opportunity[]>('/api/opportunities');
  
  const { 
    data: workspaceMembers = [], 
    isLoading: loadingMembers 
  } = useSync<WorkspaceMember[]>('/api/members');

  const loading = loadingOpps || loadingMembers;
  const isSyncing = syncingOpps;
  
  const opportunities = useMemo<Opportunity[]>(
    () => normalizeOpportunityList(rawOpportunities),
    [rawOpportunities]
  );

  const [routeSelectionMode, setRouteSelectionMode] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<RouteStop[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRouteStop[] | null>(null);
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

  const historyMapFetchEnabled = historyOutcomes.length > 0;
  const { data: mapHistoryPage } = useSync<{ items: Opportunity[] }>(
    historyMapFetchEnabled ? "/api/opportunities/history?page=1&pageSize=250" : null
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
  const [calendarView, setCalendarView] = useState<View>("month");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: "", date: "", time: "09:00", technicianId: "", urgent: false, notes: "",
    addressStreet1: "", addressStreet2: "", addressCity: "", addressState: "",
    addressPostcode: "", addressCountry: "Portugal", addressLat: null, addressLng: null
  });

  const techniciansLocations = useTechnicianLocations();

  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const userRole = (session?.user as { role?: string })?.role;
    if (!session || (userRole !== "admin" && userRole !== "member" && userRole !== "ceo")) {
      router.replace("/");
    } else {
      setUserName(
        session?.user?.name ||
          (userRole === "ceo" ? "CEO Executivo" : userRole === "member" ? "Membro" : "Administrador")
      );
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (opportunities.length > 0) {
      setLastSync(new Date());
    }
  }, [opportunities.length]);

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

  const mapOpportunities = useMemo(
    () =>
      filterMapOpportunities(opportunities, {
        mapTab,
        cityFilter,
        serviceTypeFilters,
        stallFilter,
        technicianFilter: mapTechnicianFilter,
        historyOutcomes,
        historyItems: mapHistoryItems,
      }),
    [
      opportunities,
      mapTab,
      cityFilter,
      serviceTypeFilters,
      stallFilter,
      mapTechnicianFilter,
      historyOutcomes,
      mapHistoryItems,
    ]
  );

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
    }
    setIsOptimizing(false);
  };

  const resetRoutePlanningState = useCallback(() => {
    setSelectedForRoute([]);
    setOptimizedRoute(null);
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
    if (!opp.taskId) {
      toast.error("Erro", "Não foi encontrada nenhuma tarefa ativa para cancelar.");
      return;
    }

    const confirmed = await confirm({
      title: "Cancelar agendamento?",
      description: `Tem a certeza que deseja cancelar o agendamento de: ${opp.title}?`,
      confirmLabel: "Cancelar agendamento",
      destructive: true,
    });
    if (!confirmed) return;
    
    try {
      const result = await cancelAppointmentAction(opp.taskId, opp.twentyId);
      if (!result.success) {
        toast.error("Erro ao cancelar", result.error || "Não foi possível cancelar o agendamento.");
        mutateOpps();
        return;
      }
      toast.success(
        "Agendamento cancelado",
        "O serviço voltou a pendente e o cliente será notificado por email (se tiver email no CRM)."
      );
      mutateOpps();
      setSelectedOpportunity(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao cancelar";
      console.error("Erro detalhado ao cancelar:", error);
      toast.error("Erro ao cancelar", message);
      mutateOpps();
    }
  };

  const handleRefresh = async () => {
    try {
      toast.info("A sincronizar...", "A atualizar moradas e coordenadas com o Twenty CRM...");
      const result = await runOpportunityMaintenanceAction(true);
      if (!result.success) {
        toast.error("Erro ao sincronizar", result.error || "Maintenance sync failed.");
        return;
      }
      await mutateOpps();
      setLastSync(new Date());
      toast.success("Sincronização Concluída", "Todas as moradas e coordenadas foram atualizadas.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao sincronizar";
      toast.error("Erro ao sincronizar", message);
    }
  };

  const handleUpdateGps = async (opp: Opportunity) => {
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
      setIsScheduling(true);
      const [year, month, day] = scheduleForm.date.split('-').map(Number);
      const [hour, minute] = scheduleForm.time.split(':').map(Number);
      const dueAt = new Date(year, month - 1, day, hour, minute);
      const selectedTech = workspaceMembers.find(m => m.id === scheduleForm.technicianId);

      if (!selectedOpportunity) return;

      if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
        toast.error(
          "Técnico inválido",
          "Selecione um técnico com conta no Twenty CRM (role Técnicos)."
        );
        return;
      }

      if (scheduleForm.urgent) {
        const dateTimeLabel = dueAt.toLocaleString("pt-PT", {
          dateStyle: "short",
          timeStyle: "short",
        });
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
        let description = `Tem a certeza que quer ignorar todos os avisos ao cliente e as automações e agendar diretamente para ${dateTimeLabel} com ${selectedTech.name}?`;
        if (conflicts.length > 0) {
          const first = conflicts[0];
          const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });
          description += ` Atenção: «${first.conflictingTitle}» está marcado às ${timeLabel} para o mesmo técnico.`;
        }
        const confirmed = await confirm({
          title: "Ignorar avisos ao cliente?",
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
        toast.error("Erro ao agendar", result.error || "Não foi possível agendar a visita.");
        return;
      }

      if (scheduleForm.urgent) {
        const conflictNote = result.data?.conflictWarning
          ? ` ${result.data.conflictWarning}`
          : "";
        toast.success(
          "Visita agendada",
          `Agendada diretamente, sem confirmação do cliente.${conflictNote}`
        );
      } else {
        toast.success(
          "Proposta enviada",
          "A proposta de visita foi enviada ao cliente e aguarda confirmação."
        );
      }
      setShowScheduleModal(false);
      setSelectedOpportunity(null);
      mutateOpps();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao agendar";
      toast.error("Erro ao agendar", message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleMassSchedule = async () => {
    try {
      if (!optimizedRoute) return;
      setIsScheduling(true);

      const selectedTech = workspaceMembers.find(m => m.id === massScheduleForm.technicianId);
      if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
        toast.error(
          "Invalid technician",
          "Select a technician with a valid Twenty CRM account (Técnicos role)."
        );
        return;
      }

      const visitStops = optimizedRoute.filter((stop) => !stop.isReturn);
      const slots = computeRouteSlots(massScheduleForm.date, visitStops.length);
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
        let description = `Tem a certeza que quer ignorar avisos ao cliente e automações e agendar ${visitStops.length} visitas diretamente para ${dateLabel} com ${selectedTech.name}?`;
        if (conflicts.length > 0) {
          const first = conflicts[0];
          const timeLabel = first.conflictingTime.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });
          description += ` Atenção: «${first.stopTitle}» sobrepõe-se a «${first.conflictingTitle}» às ${timeLabel}.`;
        }
        const confirmed = await confirm({
          title: "Ignorar avisos ao cliente?",
          description,
          confirmLabel: "Agendar rota mesmo assim",
          cancelLabel: "Cancelar",
          destructive: true,
        });
        if (!confirmed) return;
      }

      const result = await scheduleMassVisitsAction(
        stopsPayload,
        massScheduleForm.technicianId,
        selectedTech.name || "",
        massScheduleForm.globalNotes,
        massScheduleForm.urgent
      );

      if (!result.success) {
        toast.error("Erro ao agendar rota", result.error || "Não foi possível agendar a rota.");
        return;
      }

      const scheduledCount = result.data?.scheduledCount ?? visitStops.length;
      const skippedCount = result.data?.skippedCount ?? 0;
      const skippedSuffix =
        skippedCount > 0 ? ` (${skippedCount} já confirmadas e ignoradas)` : "";
      const conflictNote = result.data?.conflictWarning ? ` ${result.data.conflictWarning}` : "";

      if (massScheduleForm.urgent) {
        toast.success(
          "Rota agendada",
          `${scheduledCount} visitas agendadas diretamente, sem confirmação do cliente.${skippedSuffix}${conflictNote}`
        );
      } else {
        toast.success(
          "Propostas enviadas",
          `${scheduledCount} propostas de visita enviadas ao cliente para confirmação${skippedSuffix}.`
        );
      }
      setShowMassScheduleModal(false);
      setMassScheduleForm({
        date: "",
        technicianId: "",
        globalNotes: "",
        stopNotes: {},
        urgent: false,
      });
      resetRoutePlanningState();
      mutateOpps();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to schedule route";
      toast.error("Route scheduling failed", message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAiAudit = async () => {
    setIsAiAnalyzing(true);
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
    setIsAiAnalyzing(false);
  };

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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <AdminCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(v) => setView(v)}
        onSearch={() => {}}
        technicians={technicians}
        onSelectTechnician={(name) => setSelectedTechnician(name)}
      />
      <AdminHeader 
        opportunitiesCount={opportunities.length}
        lastSync={lastSync}
        loading={loading}
        isSyncing={isSyncing}
        router={router}
        onRefresh={handleRefresh}
        userName={userName}
        view={view}
        setView={setView}
      />

      <div className="relative flex-1 overflow-hidden bg-slate-100 pb-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] lg:pb-0">
        {loading ? (
          <MapSkeleton />
        ) : view === "map" ? (
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
            setShowMassScheduleModal={setShowMassScheduleModal}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            loading={loading}
            zoneInsights={zoneInsights}
            withoutGpsCount={withoutGpsCount}
            onSyncAddresses={handleRefresh}
            isSyncing={isSyncing}
            autoGenerateRouteForZone={autoGenerateRouteForZone}
          />
        ) : view === "calendar" ? (
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
        ) : (
          <AdminHistoryView onSelectOpportunity={setSelectedOpportunity} />
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

      <AdminBottomNav view={view} setView={setView} />
    </div>
  );
}
