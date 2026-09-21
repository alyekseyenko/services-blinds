"use client";
import { useState, useEffect, useMemo } from "react";
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
  extractTechnicianNames,
  filterCalendarOpportunities,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
import { computeZoneInsights } from "@/lib/admin/zoneInsights";
import {
  calculateOptimizedRoute as buildOptimizedRoute,
  selectRouteStopsForZone,
  type OptimizedRouteStop,
} from "@/lib/admin/routeOptimization";
import type { View } from "@/lib/admin/calendarLocalizer";
import { Opportunity, WorkspaceMember, RouteStop, RouteData, ZoneInsight, MapCategoryFilter } from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import { MapSkeleton } from "@/components/ui/Skeleton";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminControlCenter from "@/components/admin/AdminControlCenter";
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
  const [categoryFilter, setCategoryFilter] = useState<MapCategoryFilter>("all");
  const [showMassScheduleModal, setShowMassScheduleModal] = useState(false);
  
  const [massScheduleForm, setMassScheduleForm] = useState({
    date: "",
    technicianId: ""
  });
  
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<View>("month");
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: "", date: "", time: "09:00", technicianId: "", notes: "",
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
      fetch('/api/opportunities/maintenance', { method: 'POST' }).catch(() => {});
    };

    runMaintenance();
    const interval = setInterval(runMaintenance, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setZoneInsights(computeZoneInsights(opportunities, HQ_LOCATION.coordinates));
  }, [opportunities]);

  const technicians = useMemo(
    () => extractTechnicianNames(opportunities),
    [opportunities]
  );

  const mapOpportunities = useMemo(
    () => filterMapOpportunities(opportunities, { mapTab, cityFilter, categoryFilter }),
    [opportunities, mapTab, cityFilter, categoryFilter]
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

  const toggleSelectionForRoute = (opportunity: RouteStop) => {
    setSelectedForRoute(prev => {
      const exists = prev.find(item => item.id === opportunity.id);
      return exists ? prev.filter(item => item.id !== opportunity.id) : [...prev, opportunity];
    });
    setOptimizedRoute(null);
  };

  const handleMapTaskSelect = (opp: Opportunity) => {
    if (routeSelectionMode) {
      toggleSelectionForRoute(opp as RouteStop);
    } else {
      setSelectedOpportunity(opp);
    }
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
      toast.success("Agendamento Cancelado", "O serviço voltou à lista de agendamentos pendentes.");
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
    setScheduleForm({
      title: `Visita Técnica - ${opp.title}`,
      date: "",
      time: "09:00",
      technicianId: "",
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
      });

      if (!result.success) {
        toast.error("Erro ao agendar", result.error || "Não foi possível agendar a visita.");
        return;
      }

      toast.success("Visita Agendada!", "A visita técnica foi criada e sincronizada no CRM.");
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
          "Técnico inválido",
          "Selecione um técnico com conta no Twenty CRM (role Técnicos)."
        );
        return;
      }

      const result = await scheduleMassVisitsAction(
        optimizedRoute,
        massScheduleForm.technicianId,
        selectedTech.name || "",
        massScheduleForm.date
      );

      if (!result.success) {
        toast.error("Erro ao agendar roteiro", result.error || "Não foi possível agendar o roteiro.");
        return;
      }

      const scheduledCount = result.data?.scheduledCount ?? optimizedRoute.length - 1;
      toast.success("Roteiro Criado com Sucesso!", `${scheduledCount} visitas foram agendadas para o técnico.`);
      setShowMassScheduleModal(false);
      setOptimizedRoute(null);
      setSelectedForRoute([]);
      setRouteSelectionMode(false);
      mutateOpps();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao agendar roteiro";
      toast.error("Erro ao agendar roteiro", message);
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
    <div className="h-[100dvh] flex flex-col bg-slate-50 relative overflow-hidden">
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
        isAdminMenuOpen={isAdminMenuOpen}
        setIsAdminMenuOpen={setIsAdminMenuOpen}
        router={router}
        onRefresh={handleRefresh}
        userName={userName}
        view={view}
        setView={setView}
      />

      <AdminControlCenter 
        view={view}
        setView={setView}
        isAdminMenuOpen={isAdminMenuOpen}
        setIsAdminMenuOpen={setIsAdminMenuOpen}
        loading={loading}
        zoneInsights={zoneInsights}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        mapTab={mapTab}
        setMapTab={setMapTab}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        opportunitiesCount={opportunities.length}
        unscheduledCount={opportunities.filter(o => isNeedsSchedulingStage(o.stage) && (!o.hasScheduledTask || isTaskCompleted(o.taskStatus))).length}
        scheduledCount={opportunities.filter(o => o.hasScheduledTask && !isTaskCompleted(o.taskStatus)).length}
        completedCount={opportunities.filter(o => o.status === "Concluído" || o.status === "CONCLUIDO").length}
        cancelledCount={opportunities.filter(o => o.status === "Cancelado" || o.status === "CANCELADO").length}
        routeSelectionMode={routeSelectionMode}
        setRouteSelectionMode={setRouteSelectionMode}
        autoGenerateRouteForZone={autoGenerateRouteForZone}
      />

      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        {loading ? (
          <MapSkeleton />
        ) : view === "map" ? (
          <AdminMapView
            hqLocation={HQ_LOCATION}
            mapOpportunities={mapOpportunities}
            allOpportunities={opportunities}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            techniciansLocations={techniciansLocations}
            routeSelectionMode={routeSelectionMode}
            selectedForRoute={selectedForRoute}
            onTaskSelect={handleMapTaskSelect}
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
        isScheduling={isScheduling}
        handleScheduleVisit={handleScheduleVisit}
      />

      <MassScheduleModal 
        showMassScheduleModal={showMassScheduleModal}
        setShowMassScheduleModal={setShowMassScheduleModal}
        selectedForRouteCount={selectedForRoute.length}
        massScheduleForm={massScheduleForm}
        setMassScheduleForm={setMassScheduleForm}
        workspaceMembers={workspaceMembers}
        isScheduling={isScheduling}
        handleMassSchedule={handleMassSchedule}
      />
    </div>
  );
}
