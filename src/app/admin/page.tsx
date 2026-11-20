"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";
import { useViewSwitchCover } from "@/hooks/useViewSwitchCover";
import type { Session } from "next-auth";
import { canAccessAdminPanel, resolveWorkspaceMemberId } from "@/lib/auth/session";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";
import { useSync } from "@/hooks/useSync";
import { useTechnicianLocations } from "@/hooks/useTechnicianLocations";
import { useCalendarMidnightRollover } from "@/hooks/useCalendarMidnightRollover";
import { normalizeOpportunityList } from "@/lib/admin/opportunityNormalizers";
import { getNotificationScope } from "@/lib/inAppNotifications";
import { listUnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import type { View } from "@/lib/admin/calendarLocalizer";
import { Opportunity, WorkspaceMember } from "@/types/admin";
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
import AdminHomeView from "@/components/admin/views/AdminHomeView";
import AdminMapView from "@/components/admin/views/AdminMapView";
import { computeAdminHomeDashboardStats } from "@/lib/admin/homeDashboardStats";
import type { AdminViewId } from "@/components/admin/AdminPrimaryNav";
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
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
const ScheduleModal = dynamic(() => import("@/components/admin/ScheduleModal"), {
  ssr: false,
});
const CreateCommercialServiceSheet = dynamic(
  () => import("@/components/admin/CreateCommercialServiceSheet"),
  { ssr: false }
);
const CreateAdminClientSheet = dynamic(
  () => import("@/components/admin/CreateAdminClientSheet"),
  { ssr: false }
);
const MassScheduleModal = dynamic(() => import("@/components/admin/MassScheduleModal"), {
  ssr: false,
});
import { getHqLocation } from "@/lib/hq";
import { cn } from "@/lib/cn";
import { useAdminScheduleAndGeoActions } from "@/hooks/admin/useAdminScheduleAndGeoActions";
import { useAdminRoutePlanner } from "@/hooks/admin/useAdminRoutePlanner";
import { useAdminAgendaSearchAndNotifications } from "@/hooks/admin/useAdminAgendaSearchAndNotifications";
import { useAdminMapFilters } from "@/hooks/admin/useAdminMapFilters";

const HQ_LOCATION = getHqLocation();

export default function Admin() {
  const router = useAppRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" ? readMainViewFromUrl(ADMIN_VIEW_IDS, "home") : "home"
  );
  const viewSwitchCover = useViewSwitchCover(view);

  const changeAdminView = useCallback((next: string) => {
    if (!ADMIN_VIEW_IDS.includes(next as (typeof ADMIN_VIEW_IDS)[number])) return;
    setView(next);
    writeMainViewToUrl(next);
  }, []);

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showCreateServiceSheet, setShowCreateServiceSheet] = useState(false);
  const [showCreateClientSheet, setShowCreateClientSheet] = useState(false);
  const [userName, setUserName] = useState("");

  const [calendarDate, setCalendarDate] = useState(new Date());
  const resetAdminCalendarToToday = useCallback(() => {
    setCalendarDate(new Date());
  }, []);
  useCalendarMidnightRollover(resetAdminCalendarToToday);
  const [calendarView, setCalendarView] = useState<View>("month");

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

  const {
    data: rawOpportunities,
    isLoading: loadingOpps,
    isSyncing: syncingOpps,
    error: oppsLoadError,
    mutate: mutateOpps,
    refreshNow: refreshOpps,
    lastSuccessAt: oppsLastSuccessAt,
    isStale: oppsDataStale,
  } = useSync<Opportunity[]>("/api/opportunities", { refreshInterval: 60_000 });

  const {
    data: agendaFeed,
    error: agendaFeedError,
    mutate: mutateAgendaFeed,
    refreshNow: refreshAgenda,
  } = useSync<import("@/lib/schemas/agendaFeed").AdminAgendaFeedFromSchema>("/api/agenda/feed", {
    refreshInterval: 45_000,
    refreshWhenHidden: true,
  });

  const { data: workspaceMembers = [], isLoading: loadingMembers } =
    useSync<WorkspaceMember[]>("/api/members");

  const loading = loadingOpps || loadingMembers;
  const lastSync = oppsLastSuccessAt ? new Date(oppsLastSuccessAt) : null;

  const opportunities = useMemo<Opportunity[]>(
    () => normalizeOpportunityList(rawOpportunities ?? []),
    [rawOpportunities]
  );

  const techniciansLocations = useTechnicianLocations();

  const mapFilters = useAdminMapFilters({
    opportunities,
    techniciansLocations,
    changeAdminView,
  });

  const {
    mapTab,
    setMapTab,
    cityFilter,
    setCityFilter,
    serviceTypeFilters,
    setServiceTypeFilters,
    mapTechnicianFilter,
    setMapTechnicianFilter,
    historyOutcomes,
    setHistoryOutcomes,
    stallFilter,
    setStallFilter,
    pendingClosureOnly,
    setPendingClosureOnly,
    mapTextSearch,
    setMapTextSearch,
    mapFocusOpportunityId,
    setMapFocusOpportunityId,
    selectedTechnician,
    setSelectedTechnician,
    technicians,
    mapTechnicianOptions,
    toggleServiceTypeFilter,
    toggleHistoryOutcome,
    mapOpportunities,
    pendingClosureCount,
    openPendingClosureOnMap,
    openMapWithHomeFilter,
    calendarOpportunities,
    mapHistoryItems,
    refreshHistory,
  } = mapFilters;

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

  const memberId = resolveWorkspaceMemberId(session?.user as import("@/lib/auth/session").AppSessionUser | undefined);
  const adminNotificationScope = memberId ? getNotificationScope("admin", memberId) : "";

  const withoutGpsServices = useMemo(
    () => listUnscheduledWithoutGps(opportunities),
    [opportunities]
  );
  const withoutGpsCount = withoutGpsServices.length;
  const hasServicesWithoutGps = withoutGpsCount > 0;

  const scheduleActions = useAdminScheduleAndGeoActions({
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
  });

  const isSyncing =
    syncingOpps || scheduleActions.isAddressSyncing || scheduleActions.crmRefreshing;

  const routePlanner = useAdminRoutePlanner({
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
    setIsScheduling: scheduleActions.setIsScheduling,
    toast,
    confirm,
  });

  const agendaNav = useAdminAgendaSearchAndNotifications({
    session,
    sessionStatus,
    agendaFeed,
    agendaFeedError,
    opportunities,
    mapHistoryItems,
    mutateOpps,
    setSelectedOpportunity,
    setMapTextSearch,
    setMapFocusOpportunityId,
    setMapTab,
    changeAdminView,
    setSelectedTechnician,
    setMapTechnicianFilter,
    handleRefresh: scheduleActions.handleRefresh,
    openScheduleModal: scheduleActions.openScheduleModal,
    toast,
  });

  const homeDashboardStats = useMemo(
    () => computeAdminHomeDashboardStats(opportunities),
    [opportunities]
  );

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
    <div
      className={cn(
        "relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground",
        view !== "home" && "brutal-grid-bg"
      )}
    >
      <ServerConnectionBanner visible={serverUnreachable} />
      <AdminCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={changeAdminView}
        onSearch={agendaNav.handleAdminMapTextSearch}
        onSelectOpportunity={agendaNav.handleAdminPickOpportunity}
        opportunities={opportunities}
        technicians={technicians}
        onSelectTechnician={agendaNav.handlePaletteSelectTechnician}
        onOpenCreateClient={() => setShowCreateClientSheet(true)}
        onOpenCreateService={() => setShowCreateServiceSheet(true)}
      />
      <AdminHeader
        layout={view === "home" ? "dashboard" : "toolbar"}
        opportunitiesCount={opportunities.length}
        lastSync={lastSync}
        syncDataStale={oppsDataStale}
        loading={loading}
        isSyncing={isSyncing}
        router={router}
        onRefresh={scheduleActions.handleSyncCrm}
        onLoadMapServices={scheduleActions.handleLoadMapServices}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        onOpenCreateClient={() => setShowCreateClientSheet(true)}
        onOpenCreateService={() => setShowCreateServiceSheet(true)}
        userName={userName}
        view={view}
        setView={changeAdminView}
        onInvestigateAgendaNotification={agendaNav.openAgendaNotificationInvestigate}
      />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background",
          view === "home" && "flex"
        )}
        data-tour="admin-workspace"
      >
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
            {viewSwitchCover ? (
              <div
                className="pointer-events-none absolute inset-0 z-50 bg-background"
                aria-hidden
              />
            ) : null}
            <div
              className={viewPanelStackClass(
                view === "home",
                "absolute inset-0 flex min-h-0 flex-col"
              )}
              aria-hidden={view !== "home"}
            >
              <AdminHomeView
                stats={homeDashboardStats}
                zoneInsights={routePlanner.zoneInsights}
                onNavigate={(v: AdminViewId) => changeAdminView(v)}
                onOpenPendingClosure={openPendingClosureOnMap}
                onOpenMapFilter={openMapWithHomeFilter}
                onOpenSearch={() => setCommandPaletteOpen(true)}
                onOpenMedicoes={() => router.push("/admin/medicoes")}
                onOpenCreateClient={() => setShowCreateClientSheet(true)}
                onOpenCreateService={() => setShowCreateServiceSheet(true)}
              />
            </div>
            <div
              className={viewPanelStackClass(view === "map", "absolute inset-0 min-h-0")}
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
                pendingClosureOnly={pendingClosureOnly}
                setPendingClosureOnly={setPendingClosureOnly}
                pendingClosureCount={pendingClosureCount}
                techniciansLocations={techniciansLocations}
                routeSelectionMode={routePlanner.routeSelectionMode}
                setRouteSelectionMode={routePlanner.setRouteSelectionMode}
                onExitRoutePlanning={routePlanner.resetRoutePlanningState}
                selectedForRoute={routePlanner.selectedForRoute}
                onTaskSelect={routePlanner.handleMapTaskSelect}
                onScheduleFromMap={scheduleActions.openScheduleModal}
                optimizedRoute={routePlanner.optimizedRoute}
                fuelPrice={routePlanner.fuelPrice}
                setFuelPrice={routePlanner.setFuelPrice}
                fuelConsumption={routePlanner.fuelConsumption}
                setFuelConsumption={routePlanner.setFuelConsumption}
                tollCost={routePlanner.tollCost}
                setTollCost={routePlanner.setTollCost}
                realRouteData={routePlanner.realRouteData}
                setRealRouteData={routePlanner.setRealRouteData}
                savingRatio={routePlanner.savingRatio}
                setUnoptimizedTotalDistance={routePlanner.setUnoptimizedTotalDistance}
                setOptimizedRoute={routePlanner.setOptimizedRoute}
                isOptimizing={routePlanner.isOptimizing}
                calculateOptimizedRoute={routePlanner.calculateOptimizedRoute}
                toggleSelectionForRoute={routePlanner.toggleSelectionForRoute}
                aiAnalysis={routePlanner.aiAnalysis}
                setAiAnalysis={routePlanner.setAiAnalysis}
                isAiAnalyzing={routePlanner.isAiAnalyzing}
                handleAiAudit={routePlanner.handleAiAudit}
                unoptimizedTotalDistance={routePlanner.unoptimizedTotalDistance}
                showRouteSheet={routePlanner.showRouteSheet}
                setShowRouteSheet={routePlanner.setShowRouteSheet}
                routeManuallyAdjusted={routePlanner.routeManuallyAdjusted}
                onManualRouteReorder={routePlanner.handleManualRouteReorder}
                openMassScheduleModal={routePlanner.openMassScheduleModal}
                cityFilter={cityFilter}
                setCityFilter={setCityFilter}
                loading={loading}
                zoneInsights={routePlanner.zoneInsights}
                withoutGpsCount={withoutGpsCount}
                withoutGpsServices={withoutGpsServices}
                onSelectWithoutGps={(twentyId) => {
                  const opp = opportunities.find((item) => item.twentyId === twentyId);
                  if (opp) agendaNav.handleAdminPickOpportunity(opp, { view: "map" });
                }}
                onGeocodeWithoutGps={async (twentyId) => {
                  const opp = opportunities.find((item) => item.twentyId === twentyId);
                  if (opp) await scheduleActions.handleUpdateGps(opp);
                }}
                onSaveWithoutGpsCoords={async (twentyId, lat, lng) => {
                  const opp = opportunities.find((item) => item.twentyId === twentyId);
                  if (opp) await scheduleActions.handleManualCoordsUpdate(opp, lat, lng);
                }}
                onSyncAddresses={scheduleActions.handleRefresh}
                isSyncing={isSyncing}
                autoGenerateRouteForZone={routePlanner.autoGenerateRouteForZone}
                mapTextSearch={mapTextSearch}
                onClearMapTextSearch={() => setMapTextSearch(null)}
                mapFocusOpportunityId={mapFocusOpportunityId}
              />
            </div>
            <div
              className={viewPanelStackClass(view === "calendar", "absolute inset-0 min-h-0")}
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
                onCancelAppointment={scheduleActions.handleCancelAppointment}
              />
            </div>
            <div
              className={viewPanelStackClass(
                view === "history",
                "absolute inset-0 min-h-0 overflow-hidden"
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
        handleCancelAppointment={scheduleActions.handleCancelAppointment}
        handleUpdateGps={scheduleActions.handleUpdateGps}
        handleManualCoordsUpdate={scheduleActions.handleManualCoordsUpdate}
        openScheduleModal={scheduleActions.openScheduleModal}
        fairServiceTypeDurations={routePlanner.fairServiceTypeDurations}
        fairBenchmarksReady={routePlanner.fairBenchmarksReady}
      />

      <ScheduleModal
        showScheduleModal={scheduleActions.showScheduleModal}
        setShowScheduleModal={scheduleActions.setShowScheduleModal}
        scheduleForm={scheduleActions.scheduleForm}
        setScheduleForm={scheduleActions.setScheduleForm}
        workspaceMembers={workspaceMembers}
        opportunities={opportunities}
        schedulingOpportunityId={selectedOpportunity?.twentyId}
        isScheduling={scheduleActions.isScheduling}
        handleScheduleVisit={scheduleActions.handleScheduleVisit}
        isOnboardingDemoSchedule={isOnboardingDemoEntity(selectedOpportunity)}
        fairServiceTypeDurations={routePlanner.fairServiceTypeDurations}
        fairBenchmarksReady={routePlanner.fairBenchmarksReady}
      />

      <MassScheduleModal
        showMassScheduleModal={routePlanner.showMassScheduleModal}
        setShowMassScheduleModal={routePlanner.setShowMassScheduleModal}
        optimizedRoute={routePlanner.optimizedRoute}
        opportunities={opportunities}
        massScheduleForm={routePlanner.massScheduleForm}
        setMassScheduleForm={routePlanner.setMassScheduleForm}
        workspaceMembers={workspaceMembers}
        isScheduling={scheduleActions.isScheduling}
        handleMassSchedule={routePlanner.handleMassSchedule}
        fairServiceTypeDurations={routePlanner.fairServiceTypeDurations}
        fairBenchmarksReady={routePlanner.fairBenchmarksReady}
      />

      <CreateCommercialServiceSheet
        open={showCreateServiceSheet}
        onClose={() => setShowCreateServiceSheet(false)}
        onCreated={(opp, options) => void agendaNav.handleCommercialServiceCreated(opp, options)}
      />

      <CreateAdminClientSheet
        open={showCreateClientSheet}
        onClose={() => setShowCreateClientSheet(false)}
      />
    </div>
  );
}