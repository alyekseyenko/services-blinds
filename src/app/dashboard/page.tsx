"use client";
import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Session } from "next-auth";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";
import { resolveWorkspaceMemberId } from "@/lib/auth/session";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import { isBrowserOnline } from "@/lib/networkOnline";
import {
  cacheTechnicianProfile,
  getCachedTechnicianProfile,
} from "@/lib/offlineUserProfile";
import { useToast } from "@/components/ui/ToastContext";
import { useHistoryListFilters } from "@/hooks/useHistoryListFilters";
import { useMapStreetViewOpen } from "@/lib/map/streetViewMode";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { cn } from "@/lib/cn";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { TechViewSwipeChrome } from "@/components/dashboard/TechViewSwipeChrome";
import { TechHistoryView } from "@/components/dashboard/views/TechHistoryView";
import { TechListView } from "@/components/dashboard/views/TechListView";
import { TechMapView } from "@/components/dashboard/views/TechMapView";
import { TechShellBanners, TechAgendaLoadFailure } from "@/components/dashboard/TechShellBanners";
import { persistLocationSharingDeclined } from "@/components/dashboard/TechLocationModals";
import { MapSkeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import { useTechnicianAgendaData } from "@/hooks/dashboard/useTechnicianAgendaData";
import { useTechnicianAgendaNotifications } from "@/hooks/dashboard/useTechnicianAgendaNotifications";
import { useTechnicianLocationState } from "@/hooks/dashboard/useTechnicianLocationState";
import { useTechnicianViewNavigation } from "@/hooks/dashboard/useTechnicianViewNavigation";

const TaskDetailsDrawer = dynamic(
  () => import("@/components/dashboard/TaskDetailsDrawer"),
  { ssr: false }
);

const TechCalendarView = dynamic(
  () => import("@/components/dashboard/TechCalendarView"),
  { ssr: false, loading: () => <TaskListSkeleton /> }
);

export default function Dashboard() {
  const toast = useToast();
  const clientHydrated = useClientHydrated();
  const historyFilters = useHistoryListFilters();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const authorizeTechnician = useCallback((s: Session) => {
    return (s.user as { role?: string })?.role === "technician";
  }, []);

  const skipOfflineRedirect = useCallback(
    () => !isBrowserOnline() && Boolean(getCachedTechnicianProfile()),
    []
  );

  const { session, status, serverUnreachable } = useResilientSessionGuard({
    isAuthorized: authorizeTechnician,
    onAuthorized: (s) => {
      const user = s.user as { id?: string; userId?: string; name?: string };
      const memberId = resolveWorkspaceMemberId(user);
      cacheTechnicianProfile({
        id: memberId,
        userId: user.userId || memberId,
        name: user.name || "Técnico",
      });
      setUserId(memberId);
      setUserName(user.name || "Técnico");
    },
    skipRedirectIf: skipOfflineRedirect,
  });

  const agenda = useTechnicianAgendaData({
    userId,
    userName,
    toast,
    historyFilters,
    selectedTask,
    setSelectedTask,
    calendarDate,
  });

  const nav = useTechnicianViewNavigation({
    selectedTask,
    setSelectedTask,
    calendarDate,
    setCalendarDate,
    loading: agenda.loading,
    refreshTasksFromServer: agenda.refreshTasksFromServer,
    toast,
  });

  const { techNotificationScope, openAgendaNotificationOnMap } = useTechnicianAgendaNotifications({
    userId,
    rawTasksData: agenda.rawTasksData,
    loading: agenda.loading,
    syncError: agenda.syncError,
    allTasks: agenda.allTasks,
    toast,
    setCalendarDate,
    setView: (v) => nav.changeMainView(v),
    setMapAutoFitScope: nav.setMapAutoFitScope,
    setMapFitNonce: nav.setMapFitNonce,
    setSelectedTask,
    refreshTasksFromServer: agenda.refreshTasksFromServer,
  });

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const location = useTechnicianLocationState({
    userId,
    userName,
    sessionRole,
    toast,
  });

  const streetViewOpen = useMapStreetViewOpen();
  const mapVisitSidePanel = useMediaMinWidth(768);

  useBackToClose(location.showRgpdModal, () => location.setShowRgpdModal(false), "tech-rgpd-modal");
  useBackToClose(
    nav.listPendingClosureOpen && nav.view === "list",
    () => nav.setListPendingClosureOpen(false),
    "tech-pending-closure-list"
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session && !isBrowserOnline()) {
      const cached = getCachedTechnicianProfile();
      if (cached) {
        setUserId(cached.id || cached.userId);
        setUserName(cached.name || "Técnico");
      }
    }
  }, [session, status]);

  return (
    <div
      data-tech-shell
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background font-sans text-foreground"
    >
      <TechShellBanners
        showLocationConsent={location.showLocationConsent}
        showRgpdModal={location.showRgpdModal}
        locationSharingEnabled={location.locationSharingEnabled}
        onOpenRgpd={() => location.setShowRgpdModal(true)}
        onCloseRgpd={() => location.setShowRgpdModal(false)}
        onAcceptLocationConsent={() => {
          location.setShowLocationConsent(false);
          if (!location.locationSharingEnabled) {
            location.handleToggleLocationConsent();
          }
        }}
        onDeclineLocationConsent={() => {
          persistLocationSharingDeclined();
          location.setLocationSharingEnabled(false);
          location.setShowLocationConsent(false);
        }}
        isOnline={agenda.isOnline}
        serverUnreachable={serverUnreachable}
        agendaDataStale={agenda.agendaDataStale}
        onRefreshAgenda={() => void agenda.refreshTasksFromServer()}
      />

      <Header
        userName={userName}
        userId={userId}
        isOnline={agenda.isOnline}
        tasksCount={agenda.tasks.length}
        isSyncing={agenda.isSyncing || agenda.queueSyncing}
        loading={agenda.loading}
        mutateTasks={agenda.refreshTasksFromServer}
        locationSharingEnabled={location.locationSharingActive}
        pendingCount={agenda.pendingCount}
        failedCount={agenda.failedCount}
        onRetrySync={agenda.retryFailed}
        onRetrySyncItem={agenda.retryFailedItem}
        onRefreshQueueCounts={agenda.refreshCounts}
        resolveQueueTaskLabel={(id) => agenda.taskLabelById.get(id) || id}
        notificationScope={techNotificationScope}
        onOpenAgendaNotificationOnMap={openAgendaNotificationOnMap}
        onToggleLocationConsent={location.handleToggleLocationConsent}
        agendaLastSuccessAt={agenda.agendaLastSuccessAt}
        agendaDataStale={agenda.agendaDataStale}
      />

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          streetViewOpen
            ? "pb-0"
            : "pb-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))]"
        )}
      >
        <div
          ref={(node) => {
            nav.mainShellRef.current = node;
            nav.setMainShellEl(node);
          }}
          className="relative flex-1 overflow-hidden bg-background brutal-grid-bg touch-manipulation"
        >
          {!selectedTask && (
            <TechViewSwipeChrome
              currentView={nav.view}
              hint={nav.edgeSwipeHint}
              showEdgeAffordances={nav.view !== "map"}
            />
          )}
          <div
            ref={(node) => {
              nav.pullNudgeRef.current = node;
              nav.setPullNudgeEl(node);
            }}
            className={cn(
              "relative h-full min-h-0 w-full",
              nav.viewSlideDir === 1 && "tech-view-enter-next",
              nav.viewSlideDir === -1 && "tech-view-enter-prev"
            )}
            style={nav.viewPanelDragStyle}
          >
            {(nav.pullDistance > 0 || nav.isRefreshing) && nav.view === "list" && (
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center py-2 text-xs font-black uppercase tracking-wider text-primary-ink">
                {nav.isRefreshing
                  ? "A atualizar…"
                  : nav.armed
                    ? "Soltar para atualizar"
                    : "Puxar para atualizar"}
              </div>
            )}
            {agenda.showAgendaLoadFailure && (
              <TechAgendaLoadFailure
                isOnline={agenda.isOnline}
                onRetry={() => void agenda.refreshTasksFromServer()}
              />
            )}
            {!agenda.showAgendaLoadFailure && (
              <div className="relative h-full min-h-0 w-full">
                {nav.viewSwitchCover ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-40 bg-background"
                    aria-hidden
                  />
                ) : null}
                {agenda.loading && (
                  <div className="absolute inset-0 z-30 bg-background">
                    {nav.view === "map" ? <MapSkeleton /> : <TaskListSkeleton />}
                  </div>
                )}

                <TechMapView
                  active={nav.view === "map"}
                  mapViewRef={nav.mapViewRef}
                  clientHydrated={clientHydrated}
                  calendarDate={calendarDate}
                  dayTasks={agenda.dayTasks}
                  dayOverdueCount={agenda.dayOverdueCount}
                  shiftCalendarDay={nav.shiftCalendarDay}
                  setCalendarDate={setCalendarDate}
                  setMapAutoFitScope={nav.setMapAutoFitScope}
                  setMapFitNonce={nav.setMapFitNonce}
                  mapFitNonce={nav.mapFitNonce}
                  mapAutoFitScope={nav.mapAutoFitScope}
                  selectedTask={selectedTask}
                  mapVisitSidePanel={mapVisitSidePanel}
                  userLocation={location.userLocation}
                  isOnline={agenda.isOnline}
                  locationSharingActive={location.locationSharingActive}
                  onToggleLocationSharing={location.handleToggleLocationConsent}
                  onTaskSelect={setSelectedTask}
                />

                <div
                  className={viewPanelStackClass(nav.view === "calendar", "absolute inset-0 min-h-0")}
                  aria-hidden={nav.view !== "calendar"}
                >
                  <TechCalendarView
                    tasks={agenda.tasks}
                    calendarDate={calendarDate}
                    calendarView={nav.calendarView}
                    onNavigate={setCalendarDate}
                    onViewChange={nav.setCalendarView}
                    onSelectEvent={setSelectedTask}
                    scrollRef={(node) => {
                      nav.calendarViewRef.current = node;
                      nav.setCalendarScrollEl(node);
                    }}
                  />
                </div>

                <TechHistoryView
                  active={nav.view === "history"}
                  historyFilters={historyFilters}
                  filteredHistoryTasks={agenda.filteredHistoryTasks}
                  historyTasks={agenda.historyTasks}
                  pendingCount={agenda.pendingCount}
                  failedCount={agenda.failedCount}
                  onOpenSyncQueue={agenda.openSyncQueue}
                  setSelectedTask={setSelectedTask}
                />

                <TechListView
                  active={nav.view === "list"}
                  scrollContainerRef={(node) => {
                    nav.listScrollRef.current = node;
                    nav.setListScrollEl(node);
                  }}
                  listPendingClosureOpen={nav.listPendingClosureOpen}
                  pendingClosureTasks={agenda.pendingClosureTasks}
                  setSelectedTask={setSelectedTask}
                  onClosePendingClosure={() => nav.setListPendingClosureOpen(false)}
                  onOpenPendingClosure={() => nav.setListPendingClosureOpen(true)}
                  clientHydrated={clientHydrated}
                  calendarDate={calendarDate}
                  dayTasks={agenda.dayTasks}
                  shiftCalendarDay={nav.shiftCalendarDay}
                  listShowsToday={agenda.listShowsToday}
                  onJumpToToday={() => setCalendarDate(new Date())}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsDrawer
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          isOnline={agenda.isOnline}
          userName={userName}
          mutateTasks={agenda.refreshTasksFromServer}
          enqueueStatusUpdate={agenda.enqueueStatusUpdateOptimistic}
          enqueueMeasurementsSave={agenda.enqueueMeasurementsSave}
          enqueueNote={agenda.enqueueNote}
          enqueueVisitService={agenda.enqueueVisitService}
          technicianId={userId}
          onRequestPhotoSync={() => void agenda.processQueue()}
          onPhotoQueueChanged={() => void agenda.refreshCounts()}
        />
      )}

      {streetViewOpen ? null : (
        <BottomNav
          view={nav.view}
          setView={(next) => nav.changeMainView(next)}
          setSelectedTask={setSelectedTask}
          pendingClosureCount={agenda.pendingClosureTasks.length}
        />
      )}
    </div>
  );
}