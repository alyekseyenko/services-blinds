"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, History, Loader2, MapPin, RefreshCw, X } from "lucide-react";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import {
  isTaskActive,
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
} from "@/lib/crm/contract";
import { resolveWorkspaceMemberId } from "@/lib/auth/session";
import { buildTechnicianTasksEndpoint } from "@/lib/api/technicianTasksEndpoint";
import type { Session } from "next-auth";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";
import { isBrowserOnline } from "@/lib/networkOnline";
import {
  cacheTechnicianProfile,
  getCachedTechnicianProfile,
} from "@/lib/offlineUserProfile";

import type { View } from "react-big-calendar";

import { useSync } from "@/hooks/useSync";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { db } from "@/lib/db";
import { useToast } from "@/components/ui/ToastContext";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { Marquee } from "@/components/ui/Marquee";

// Componentes Modularizados do Dashboard
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import { TechViewSwipeChrome } from "@/components/dashboard/TechViewSwipeChrome";
import TaskCard from "@/components/dashboard/TaskCard";
const TaskDetailsDrawer = dynamic(
  () => import("@/components/dashboard/TaskDetailsDrawer"),
  { ssr: false }
);
import { getHqLocation } from "@/lib/hq";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipeDayChange } from "@/hooks/useSwipeDayChange";
import {
  useSwipeEdgeViewChange,
  type EdgeViewSwipeHint,
} from "@/hooks/useSwipeEdgeViewChange";
import { TECH_MAIN_VIEWS, adjacentTechMainView } from "@/lib/techMainViews";
import {
  listenMainViewPop,
  readMainViewFromUrl,
  writeMainViewToUrl,
} from "@/lib/urlMainView";
import { useBackToClose } from "@/hooks/useBackToClose";
import { cn } from "@/lib/cn";
import { hapticLight } from "@/lib/haptics";
import { useTechnicianLocationSharing } from "@/hooks/useTechnicianLocationSharing";
import { useCalendarMidnightRollover } from "@/hooks/useCalendarMidnightRollover";
import { MapSkeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import { useOnboardingMapDemo } from "@/hooks/useOnboardingMapDemo";
import {
  appendDemoTaskToDayList,
  useOnboardingTechnicianTour,
} from "@/hooks/useOnboardingTechnicianTour";
import { buildAgendaSnapshotItem, toSafeIso } from "@/lib/agendaDiff";
import { resolveServiceType } from "@/lib/techniciansConfig";
import {
  IN_APP_NOTIFICATION_OPEN_TASK_EVENT,
  getNotificationScope,
  type InAppNotification,
  type InAppNotificationOpenTaskDetail,
} from "@/lib/inAppNotifications";
import { useAgendaNotifications } from "@/hooks/useAgendaNotifications";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TechCalendarView = dynamic(
  () => import("@/components/dashboard/TechCalendarView"),
  { ssr: false, loading: () => <TaskListSkeleton /> }
);

const HQ_LOCATION = getHqLocation();

const EMPTY_TASK_LIST: never[] = [];

function historyStatusLabel(status: string): string {
  if (isTaskCompleted(status)) return "Concluída";
  if (isTaskCancelled(status)) return "Cancelada";
  if (isTaskIncomplete(status)) return "Incompleta";
  return status;
}

function parseClientDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function historySortTimestamp(task: { updatedAt?: Date; dueDate: Date }): number {
  const ref = task.updatedAt ?? task.dueDate;
  return ref instanceof Date ? ref.getTime() : 0;
}

function formatPtDate(
  hydrated: boolean,
  date: Date,
  options: Intl.DateTimeFormatOptions
): string {
  if (!hydrated) return "\u00a0";
  return date.toLocaleDateString("pt-PT", options);
}

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const clientHydrated = useClientHydrated();
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
  const [view, setView] = useState(() =>
    typeof window !== "undefined" ? readMainViewFromUrl(TECH_MAIN_VIEWS, "map") : "map"
  );
  const [viewSlideDir, setViewSlideDir] = useState<0 | 1 | -1>(0);
  const [edgeSwipeHint, setEdgeSwipeHint] = useState<EdgeViewSwipeHint>({ phase: "idle" });
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [mapFitNonce, setMapFitNonce] = useState(0);
  const [mapAutoFitScope, setMapAutoFitScope] = useState<"all" | "overdue">("all");
  useEffect(() => {
    setMapAutoFitScope("all");
  }, [calendarDate.toDateString()]);
  const [calendarView, setCalendarView] = useState<View>("month");

  useEffect(() => {
    if (window.innerWidth < 768) {
      setCalendarView("agenda");
    }
  }, []);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
  const [showRgpdModal, setShowRgpdModal] = useState(false);

  useBackToClose(showRgpdModal, () => setShowRgpdModal(false), "tech-rgpd-modal");

  useEffect(() => {
    writeMainViewToUrl(view, true);
  }, []);

  useEffect(() => {
    return listenMainViewPop((next) => {
      if (!next || !TECH_MAIN_VIEWS.includes(next as (typeof TECH_MAIN_VIEWS)[number])) return;
      setView((current) => {
        if (current === next) return current;
        setSelectedTask(null);
        return next;
      });
    });
  }, []);

  // Verificar consentimento de localização ao montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem(CLIENT_PREF_KEYS.LOCATION_SHARING);
      if (consent === null) {
        // Nunca respondeu — mostrar banner
        setShowLocationConsent(true);
      } else {
        setLocationSharingEnabled(consent === "true");
      }
    }
  }, []);

  // Sync Hooks
  const endpoint = userId ? buildTechnicianTasksEndpoint(userId) : null;
  const {
    data: rawTasksData,
    isLoading: loading,
    isSyncing,
    error: syncError,
    mutate: mutateTasks,
    lastSuccessAt: agendaLastSuccessAt,
    isStale: agendaDataStale,
  } = useSync<any[]>(endpoint, { revalidateOnFocus: false, refreshInterval: 60_000 });
  const rawTasks = rawTasksData ?? EMPTY_TASK_LIST;

  const openSyncQueue = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fieldops-open-sync-queue"));
  }, []);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<HTMLDivElement>(null);
  const calendarViewRef = useRef<HTMLDivElement>(null);
  const mainShellRef = useRef<HTMLDivElement>(null);
  const pullNudgeRef = useRef<HTMLDivElement>(null);
  const [pullNudgeEl, setPullNudgeEl] = useState<HTMLElement | null>(null);
  const [listScrollEl, setListScrollEl] = useState<HTMLElement | null>(null);
  const [calendarScrollEl, setCalendarScrollEl] = useState<HTMLElement | null>(null);
  const [mainShellEl, setMainShellEl] = useState<HTMLElement | null>(null);

  const {
    enqueueStatusUpdate,
    enqueueMeasurementsSave,
    enqueueNote,
    enqueueVisitService,
    isOnline,
    pendingCount,
    failedCount,
    retryFailed,
    retryFailedItem,
    refreshCounts,
    syncing: queueSyncing,
    lastSyncSuccess,
  } = useSyncQueue({
    technicianId: userId,
    technicianName: userName,
    onOpenSyncQueue: openSyncQueue,
  });

  const enqueueStatusUpdateOptimistic = useCallback(
    async (
      taskId: string,
      status: string,
      reason: string,
      photos: string[],
      opportunityId?: string
    ) => {
      const result = await enqueueStatusUpdate(taskId, status, reason, photos, opportunityId);
      if (result.success && endpoint) {
        await mutateTasks(
          (current) => {
            if (!current) return current;
            return current.map((t: { id: string; status?: string }) =>
              t.id === taskId ? { ...t, status } : t
            );
          },
          { revalidate: false }
        );
      }
      return result;
    },
    [enqueueStatusUpdate, endpoint, mutateTasks]
  );

  const refreshTasksFromServer = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    await mutateTasks();
  }, [mutateTasks]);

  useEffect(() => {
    if (!selectedTask?.id || !rawTasks?.length) return;
    if (isOnboardingDemoEntity(selectedTask)) return;

    void (async () => {
      const fresh = rawTasks.find((t: { id: string }) => t.id === selectedTask.id);
      if (!fresh) {
        setSelectedTask(null);
        toast.warning("Visita indisponível", "Esta visita já não está na sua agenda.");
        return;
      }

      let status = fresh.status as string;
      try {
        const pending = await db.syncQueue
          .where("taskId")
          .equals(selectedTask.id)
          .filter(
            (i) => i.action === "UPDATE_STATUS" && (i.status === "pending" || i.status === "failed")
          )
          .first();
        if (pending?.payload?.status && typeof pending.payload.status === "string") {
          status = pending.payload.status;
        }
      } catch {
        /* ignore */
      }

      setSelectedTask({
        ...fresh,
        dueDate: new Date(fresh.dueDate),
        status,
      });
    })();
  }, [rawTasks, selectedTask?.id, toast]);

  useEffect(() => {
    if (!lastSyncSuccess) return;
    void mutateTasks();
  }, [lastSyncSuccess, mutateTasks]);

  const allTasks = useMemo(() => {
    if (!rawTasks || !Array.isArray(rawTasks)) return [];
    return rawTasks
      .map((t) => {
        const dueDate = parseClientDate(t.dueDate) ?? new Date();
        const updatedAt = parseClientDate(
          (t as { updatedAt?: string | Date | null }).updatedAt
        );
        return { ...t, dueDate, updatedAt };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [rawTasks]);

  const tasks = useMemo(() => {
    return allTasks.filter((t) => isTaskActive(t.status));
  }, [allTasks]);

  const historyTasks = useMemo(() => {
    return allTasks
      .filter((t) => !isTaskActive(t.status))
      .sort((a, b) => historySortTimestamp(b) - historySortTimestamp(a));
  }, [allTasks]);

  const taskLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTasks) {
      map.set(t.id, `${t.client} · NSI ${t.nsi || "—"}`);
    }
    return map;
  }, [allTasks]);

  const techNotificationScope = getNotificationScope("technician", userId);
  const agendaNotificationsReady =
    Boolean(userId) && !loading && !syncError && rawTasksData !== undefined;

  const agendaSnapshotItems = useMemo(() => {
    if (!agendaNotificationsReady || !Array.isArray(rawTasksData)) return null;
    return rawTasksData.map(
      (t: {
        id: string;
        dueDate: string;
        status: string;
        client: string;
        nsi?: string;
        title?: string;
        opportunityId?: string;
        serviceType?: string;
        stage?: string;
        services?: Array<{
          opportunityId: string;
          createdOnSite?: boolean;
          serviceType?: string;
          mode?: "now" | "later";
        }>;
        statusNote?: string;
      }) => {
        const onSite = (t.services ?? []).filter((s) => s.createdOnSite);
        const onSiteOpportunityIds = onSite.map((s) => s.opportunityId);
        const onSiteServices = onSite
          .filter((s) => s.serviceType && s.mode)
          .map((s) => ({
            opportunityId: s.opportunityId,
            serviceType: s.serviceType as string,
            mode: s.mode as "now" | "later",
          }));
        const serviceType = resolveServiceType({
          serviceType: t.serviceType,
          stage: t.stage,
          title: t.title,
        });
        return buildAgendaSnapshotItem({
          id: t.id,
          dueAt: toSafeIso(t.dueDate),
          status: t.status,
          client: t.client,
          nsi: t.nsi,
          visitTitle: t.title,
          opportunityId: t.opportunityId,
          onSiteOpportunityIds: onSiteOpportunityIds.length > 0 ? onSiteOpportunityIds : undefined,
          onSiteServices: onSiteServices.length > 0 ? onSiteServices : undefined,
          statusNote: t.statusNote,
          serviceType: serviceType || undefined,
        });
      }
    );
  }, [agendaNotificationsReady, rawTasksData]);

  useAgendaNotifications({
    scope: techNotificationScope,
    items: agendaSnapshotItems,
    ready: agendaNotificationsReady,
    toast,
  });

  const showAgendaLoadFailure = Boolean(syncError && !loading && allTasks.length === 0);

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate.toDateString() === calendarDate.toDateString()),
    [tasks, calendarDate]
  );

  const dayOverdueCount = useMemo(
    () => dayTasks.filter((t) => resolveTaskOverdue(t)).length,
    [dayTasks]
  );

  const { demoActive: onboardingMapDemoActive } = useOnboardingMapDemo(dayTasks, "technician");

  useOnboardingTechnicianTour({
    demoActive: onboardingMapDemoActive,
    setSelectedTask,
    setView,
  });

  const dayTasksForDisplay = useMemo(
    () => appendDemoTaskToDayList(dayTasks, onboardingMapDemoActive),
    [dayTasks, onboardingMapDemoActive]
  );

  const openAgendaNotificationOnMap = useCallback(
    (notification: InAppNotification) => {
      if (!notification.taskId) return;

      if (notification.dueAtIso) {
        const due = new Date(notification.dueAtIso);
        if (!Number.isNaN(due.getTime())) {
          setCalendarDate(due);
        }
      }

      setView("map");
      setMapAutoFitScope("all");
      setMapFitNonce((n) => n + 1);

      const task = allTasks.find((t) => t.id === notification.taskId);
      if (task) {
        setSelectedTask({ ...task, dueDate: new Date(task.dueDate) });
        return;
      }

      toast.warning(
        "Visita indisponível",
        "Não encontrámos esta visita na agenda. A sincronizar…"
      );
      void refreshTasksFromServer();
    },
    [allTasks, refreshTasksFromServer, toast]
  );

  useEffect(() => {
    const onOpenFromNotification = (event: Event) => {
      const detail = (event as CustomEvent<InAppNotificationOpenTaskDetail>).detail;
      if (!detail?.taskId) return;
      openAgendaNotificationOnMap({
        id: "",
        title: "",
        description: "",
        createdAt: Date.now(),
        read: true,
        taskId: detail.taskId,
        dueAtIso: detail.dueAtIso,
      });
    };
    window.addEventListener(IN_APP_NOTIFICATION_OPEN_TASK_EVENT, onOpenFromNotification);
    return () =>
      window.removeEventListener(IN_APP_NOTIFICATION_OPEN_TASK_EVENT, onOpenFromNotification);
  }, [openAgendaNotificationOnMap]);

  const shiftCalendarDay = useCallback((delta: number) => {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  const shiftCalendarStep = useCallback(
    (delta: number) => {
      setCalendarDate((prev) => {
        const d = new Date(prev);
        if (calendarView === "month") {
          d.setMonth(d.getMonth() + delta);
        } else if (calendarView === "week") {
          d.setDate(d.getDate() + delta * 7);
        } else {
          d.setDate(d.getDate() + delta);
        }
        return d;
      });
    },
    [calendarView]
  );

  const resetCalendarToToday = useCallback(() => {
    setCalendarDate(new Date());
  }, []);
  useCalendarMidnightRollover(resetCalendarToToday);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    at?: number;
  } | null>(null);

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;

  const { sharingEnabled: liveLocationSharing, toggleSharing: handleToggleLocationConsent } =
    useTechnicianLocationSharing({
      userId,
      userName,
      role: sessionRole,
      enabledPref: locationSharingEnabled,
      onTogglePref: setLocationSharingEnabled,
      onPositionUpdate: (pos) => {
        setUserLocation((prev) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          if (!prev) return { lat, lng, accuracy };
          const now = Date.now();
          const lastAt = prev.at ?? 0;
          const distM =
            Math.hypot(lat - prev.lat, lng - prev.lng) *
            111_320 *
            Math.cos((prev.lat * Math.PI) / 180);
          if (distM < 25 && now - lastAt < 10_000) return prev;
          return { lat, lng, accuracy, at: now };
        });
      },
      onConsentGranted: () =>
        toast.success("Localização ativa", "A partilha de GPS está ligada durante o expediente."),
      onConsentDenied: () =>
        toast.warning(
          "Permissão negada",
          "Ative a localização nas definições do navegador para partilhar a posição."
        ),
    });

  const locationSharingActive = liveLocationSharing && locationSharingEnabled;

  const lastSyncToastAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastSyncSuccess) return;
    if (lastSyncToastAtRef.current === lastSyncSuccess) return;
    lastSyncToastAtRef.current = lastSyncSuccess;
    toast.success("Sincronização concluída", "Dados enviados ao CRM.");
  }, [lastSyncSuccess, toast]);

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

  const { pullDistance, armed, isRefreshing } = usePullToRefresh({
    enabled: view === "list" && !loading,
    scrollElement: listScrollEl,
    nudgeElement: pullNudgeEl,
    onOfflineAttempt: () => {
      toast.warning("Sem rede", "Não é possível atualizar a agenda offline.");
    },
    onRefresh: async () => {
      await refreshTasksFromServer();
    },
  });

  const goPreviousDay = useCallback(() => shiftCalendarDay(-1), [shiftCalendarDay]);
  const goNextDay = useCallback(() => shiftCalendarDay(1), [shiftCalendarDay]);
  const goPreviousCalendarStep = useCallback(() => shiftCalendarStep(-1), [shiftCalendarStep]);
  const goNextCalendarStep = useCallback(() => shiftCalendarStep(1), [shiftCalendarStep]);

  useSwipeDayChange({
    enabled: view === "list" && !selectedTask,
    onPreviousDay: goPreviousDay,
    onNextDay: goNextDay,
    targetElement: listScrollEl,
  });

  useSwipeDayChange({
    enabled: view === "calendar" && !selectedTask,
    onPreviousDay: goPreviousCalendarStep,
    onNextDay: goNextCalendarStep,
    targetElement: calendarScrollEl,
  });

  const changeMainView = useCallback(
    (nextView: string, slideDir?: 1 | -1) => {
      if (nextView === view) return;
      const fromIdx = TECH_MAIN_VIEWS.indexOf(view as (typeof TECH_MAIN_VIEWS)[number]);
      const toIdx = TECH_MAIN_VIEWS.indexOf(nextView as (typeof TECH_MAIN_VIEWS)[number]);
      if (toIdx < 0) return;
      const dir =
        slideDir ?? (fromIdx >= 0 && toIdx > fromIdx ? 1 : fromIdx >= 0 && toIdx < fromIdx ? -1 : 0);
      setViewSlideDir(dir);
      setView(nextView);
      setSelectedTask(null);
      writeMainViewToUrl(nextView);
      hapticLight();
    },
    [view]
  );

  const shiftMainView = useCallback(
    (delta: number) => {
      const next = adjacentTechMainView(view, delta);
      if (!next) return;
      changeMainView(next, delta > 0 ? 1 : -1);
    },
    [view, changeMainView]
  );

  useEffect(() => {
    if (viewSlideDir === 0) return;
    const timer = window.setTimeout(() => setViewSlideDir(0), 340);
    return () => window.clearTimeout(timer);
  }, [view, viewSlideDir]);

  useSwipeEdgeViewChange({
    enabled: !selectedTask && view !== "map",
    currentView: view,
    onViewChange: (next) => changeMainView(next),
    targetElement: mainShellEl,
    onHint: setEdgeSwipeHint,
  });

  const viewPanelDragStyle =
    edgeSwipeHint.phase === "dragging"
      ? {
          transform: `translate3d(${
            edgeSwipeHint.direction === "next"
              ? -Math.min(edgeSwipeHint.progress, 1) * 24
              : Math.min(edgeSwipeHint.progress, 1) * 24
          }px, 0, 0)`,
        }
      : undefined;

  return (
    <div
      data-tech-shell
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background font-sans text-foreground"
    >
      
      <div className="safe-top z-50 shrink-0">
      {/* Banner de Consentimento de Localização (RGPD) */}
      {showLocationConsent && (
        <div className="bg-ink text-ink-foreground px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <MapPin className="w-5 h-5 text-primary-ink shrink-0" />
          <div className="text-xs font-semibold flex-1">
            <span>Deseja partilhar a sua localização durante o expediente para otimização de rotas e assistência em campo?</span>
            <button
              onClick={() => setShowRgpdModal(true)}
              className="ml-2 text-primary-ink hover:underline font-bold text-xs inline-flex items-center gap-0.5"
            >
              (Mais Informações / RGPD)
            </button>
          </div>
          <button
            onClick={() => {
              setShowLocationConsent(false);
              if (!locationSharingEnabled) {
                handleToggleLocationConsent();
              }
            }}
            className="min-h-12 whitespace-nowrap rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover"
          >
            Aceitar
          </button>
          <button
            onClick={() => {
              localStorage.setItem(CLIENT_PREF_KEYS.LOCATION_SHARING, "false");
              setLocationSharingEnabled(false);
              setShowLocationConsent(false);
            }}
            className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground transition-colors hover:text-ink-foreground"
            aria-label="Recusar partilha de localização"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Informações RGPD & Privacidade de Dados */}
      {showRgpdModal && (
        <div className="fixed inset-0 bg-scrim z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border-2 border-border-strong max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-ink text-ink-foreground flex items-center justify-between border-b-2 border-border-strong">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl text-primary-ink">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="ds-title text-sm tracking-wide">Política de Privacidade & RGPD</h3>
                  <p className="text-xs text-muted-foreground">Proteção de Dados & Telemetria em Campo</p>
                </div>
              </div>
              <button
                onClick={() => setShowRgpdModal(false)}
                className="p-1.5 text-muted-foreground hover:text-ink-foreground rounded-xl hover:bg-ink/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-muted-foreground space-y-4 leading-relaxed">
              <div className="bg-muted p-4 rounded-2xl border border-border/80 space-y-2">
                <h4 className="font-black text-foreground uppercase text-xs">1. Finalidade do Processamento</h4>
                <p>
                  As coordenadas GPS são utilizadas <strong>exclusivamente para a gestão operacional das rotas</strong>, atribuição de serviços urgentes na proximidade e estimativa precisa de chegada ao cliente.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-2xl border border-border/80 space-y-2">
                <h4 className="font-black text-foreground uppercase text-xs">2. Horários e Pausas Protegidas</h4>
                <p>
                  A recolha de localização é <strong>automaticamente bloqueada</strong> fora do horário de expediente (antes das 07:00 e após as 22:00) e durante a pausa de almoço (13:00 às 14:00).
                </p>
              </div>

              <div className="bg-muted p-4 rounded-2xl border border-border/80 space-y-2">
                <h4 className="font-black text-foreground uppercase text-xs">3. Retenção & Direito de Desconexão</h4>
                <p>
                  A posição em tempo real expira após <strong>5 minutos</strong> de inatividade e é eliminada de imediato do mapa do gestor quando termina sessão ou fecha a aplicação.
                </p>
              </div>

              <div className="bg-success-surface p-4 rounded-2xl border border-success-border space-y-2">
                <h4 className="font-black text-success-fg uppercase text-xs">4. Controlo Total do Utilizador</h4>
                <p className="text-success-fg">
                  Pode ativar ou pausar a partilha de localização a qualquer instante através do botão <strong>GPS Ativo / GPS Pausado</strong> no cabeçalho da sua aplicação.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRgpdModal(false)}
                className="px-5 py-2.5 bg-ink text-ink-foreground hover:bg-ink/90 font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Compreendido
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOnline ? (
        <div
          data-tour="tech-offline-banner"
          role="status"
          className="z-50 flex items-center justify-center border-b border-warning-solid/25 bg-warning-solid/10 px-3 py-1.5 text-center text-xs font-semibold text-warning-fg dark:text-warning-fg"
        >
          Sem rede — agenda e alterações ficam guardadas neste telemóvel até voltar a ligar.
        </div>
      ) : (
        <ServerConnectionBanner visible={serverUnreachable} />
      )}
      {isOnline && agendaDataStale && (
        <button
          type="button"
          onClick={() => void refreshTasksFromServer()}
          className="flex min-h-12 w-full items-center justify-center gap-2 bg-danger-solid/95 px-3 py-2 text-xs font-bold text-ink-foreground shadow-md active:bg-danger-solid/90"
        >
          Dados da agenda possivelmente desatualizados — toque para atualizar
        </button>
      )}
      </div>

      {/* Header Premium (Estilo Glassmorphism) */}
      <Header 
        userName={userName}
        userId={userId}
        isOnline={isOnline}
        tasksCount={tasks.length}
        isSyncing={isSyncing || queueSyncing}
        loading={loading}
        mutateTasks={refreshTasksFromServer}
        locationSharingEnabled={locationSharingActive}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onRetrySync={retryFailed}
        onRetrySyncItem={retryFailedItem}
        onRefreshQueueCounts={refreshCounts}
        resolveQueueTaskLabel={(id) => taskLabelById.get(id) || id}
        notificationScope={techNotificationScope}
        onOpenAgendaNotificationOnMap={openAgendaNotificationOnMap}
        onToggleLocationConsent={handleToggleLocationConsent}
        agendaLastSuccessAt={agendaLastSuccessAt}
        agendaDataStale={agendaDataStale}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden pb-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))]">
        <div
          ref={(node) => {
            mainShellRef.current = node;
            setMainShellEl(node);
          }}
          className="relative flex-1 overflow-hidden bg-background brutal-grid-bg touch-manipulation"
        >
        {!selectedTask && (
          <TechViewSwipeChrome
            currentView={view}
            hint={edgeSwipeHint}
            showEdgeAffordances={view !== "map"}
          />
        )}
        <div
          ref={(node) => {
            pullNudgeRef.current = node;
            setPullNudgeEl(node);
          }}
          className={cn(
            "relative h-full min-h-0 w-full",
            viewSlideDir === 1 && "tech-view-enter-next",
            viewSlideDir === -1 && "tech-view-enter-prev"
          )}
          style={viewPanelDragStyle}
        >
        {(pullDistance > 0 || isRefreshing) && view === "list" && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center py-2 text-xs font-black uppercase tracking-wider text-primary-ink">
            {isRefreshing ? "A atualizar…" : armed ? "Soltar para atualizar" : "Puxar para atualizar"}
          </div>
        )}
        {showAgendaLoadFailure && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            {!isOnline ? (
              <>
                <p className="text-sm font-black uppercase tracking-tight text-foreground">
                  Modo offline — sem agenda local
                </p>
                <p className="max-w-sm text-sm font-semibold text-muted-foreground">
                  Não há visitas guardadas neste telemóvel. Abra a app com rede pelo menos uma vez para
                  descarregar a agenda; depois pode trabalhar offline.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-black uppercase tracking-tight text-foreground">
                  Falha ao sincronizar
                </p>
                <p className="max-w-sm text-sm font-semibold text-muted-foreground">
                  Não foi possível carregar as visitas. Verifique a rede e tente novamente.
                </p>
                <Button onClick={() => void refreshTasksFromServer()}>Tentar novamente</Button>
              </>
            )}
          </div>
        )}
        {!showAgendaLoadFailure && (
          <div className="relative h-full min-h-0 w-full">
            {loading && (
              <div className="absolute inset-0 z-30 bg-background">
                {view === "map" ? <MapSkeleton /> : <TaskListSkeleton />}
              </div>
            )}
            <div
              ref={mapViewRef}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col",
                view !== "map" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "map"}
            >
              <div className="pointer-events-none absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
                <div className="pointer-events-auto flex min-h-12 flex-1 items-center gap-1 rounded-xl border-2 border-border-strong bg-card px-1.5 py-1 touch-manipulation" data-tour="tech-map-day">
                  <button
                    type="button"
                    onClick={() => shiftCalendarDay(-1)}
                    className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted active:bg-muted"
                    aria-label="Dia anterior"
                  >
                    ◀
                  </button>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 px-0.5 text-center">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="text-xs font-bold capitalize text-foreground" suppressHydrationWarning>
                      {formatPtDate(clientHydrated, calendarDate, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      · {dayTasksForDisplay.length}
                    </span>
                    {dayOverdueCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMapAutoFitScope("overdue");
                          setMapFitNonce((n) => n + 1);
                        }}
                        className="rounded-full border border-warning-border bg-warning-surface px-2 py-0.5 text-xs font-black text-warning-fg hover:bg-warning-surface"
                      >
                        {dayOverdueCount} atrasada{dayOverdueCount > 1 ? "s" : ""} — ver no mapa
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => shiftCalendarDay(1)}
                    className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted active:bg-muted"
                    aria-label="Dia seguinte"
                  >
                    ▶
                  </button>
                </div>

                {calendarDate.toDateString() !== new Date().toDateString() && (
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date())}
                    className="pointer-events-auto min-h-12 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-md touch-manipulation"
                  >
                    Hoje
                  </button>
                )}
              </div>

              <div className="relative min-h-0 flex-1" data-tour="tech-map-canvas">
              <MapComponent
                tasks={dayTasksForDisplay}
                onTaskSelect={setSelectedTask}
                markerInteraction="popup"
                autoFitKey={`${calendarDate.toDateString()}-${mapFitNonce}${onboardingMapDemoActive ? "-demo" : ""}`}
                autoFitScope={mapAutoFitScope}
                userLocation={userLocation}
                hqLocation={HQ_LOCATION}
                isTechnicianView={true}
                isOnline={isOnline}
                locationSharingEnabled={locationSharingActive}
                onToggleLocationSharing={handleToggleLocationConsent}
                onboardingMapTourId="technician"
              />
              </div>

              {dayTasksForDisplay.length === 0 && !onboardingMapDemoActive && isOnline && (
                <div className="pointer-events-none absolute inset-x-4 top-20 z-10 flex justify-center">
                  <p className="rounded-2xl border border-border bg-card/95 px-4 py-2 text-center text-xs font-bold text-muted-foreground shadow-lg">
                    Sem visitas neste dia — use as setas para mudar o dia.
                  </p>
                </div>
              )}
            </div>

            <div
              className={cn(
                "absolute inset-0 min-h-0",
                view !== "calendar" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "calendar"}
            >
              <TechCalendarView
                tasks={tasks}
                calendarDate={calendarDate}
                calendarView={calendarView}
                onNavigate={setCalendarDate}
                onViewChange={setCalendarView}
                onSelectEvent={setSelectedTask}
                scrollRef={(node) => {
                  calendarViewRef.current = node;
                  setCalendarScrollEl(node);
                }}
              />
            </div>

            <div
              data-tour="tech-history"
              className={cn(
                "absolute inset-0 overflow-y-auto custom-scrollbar p-4 pb-8 md:p-6 lg:px-8",
                view !== "history" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "history"}
            >
            <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl">
              <div className="flex flex-col mb-8">
                <DisplayHeading as="h2" lines={["Histórico"]} seal="asterisk" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Concluídos, cancelados e incompletos
                </p>
              </div>

              <button
                type="button"
                data-tour="tech-history-sync-queue"
                onClick={openSyncQueue}
                className="mb-6 flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-warning-solid bg-warning-surface px-5 py-4 text-left transition-colors hover:bg-warning-surface active:scale-[0.99] dark:border-warning-border dark:bg-ink/30 dark:hover:bg-ink/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-tight text-warning-fg dark:text-warning-fg">
                    Fila offline
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-warning-fg/80 dark:text-warning-fg/80">
                    {pendingCount + failedCount > 0
                      ? `${pendingCount + failedCount} alteração(ões) por sincronizar`
                      : "Ver alterações guardadas localmente"}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-surface/80 text-warning-fg dark:bg-warning-surface dark:text-warning-fg">
                  <RefreshCw className="h-5 w-5" aria-hidden />
                </span>
              </button>

              {historyTasks.length === 0 ? (
                <Card className="text-center py-20">
                  <CardContent className="flex flex-col items-center">
                    <History className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-bold text-sm">Nenhum serviço recente no histórico.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 md:grid md:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {historyTasks.map((task) => {
                    const isTaskComp = isTaskCompleted(task.status);
                    const isTaskCanc = isTaskCancelled(task.status);
                    const isTaskInc = isTaskIncomplete(task.status);
                    return (
                      <Card 
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="cursor-pointer transition-all active:scale-[0.99] [content-visibility:auto] [contain-intrinsic-size:auto_96px] hover:border-primary"
                      >
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              isTaskComp ? 'bg-primary/15 text-primary-ink' : 
                              isTaskCanc
                                ? 'bg-danger-solid/15 text-danger-solid'
                                : isTaskInc
                                  ? 'bg-warning-solid/15 text-warning-solid'
                                  : 'bg-secondary/80 text-muted-foreground'
                            }`}>
                              <History className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="ds-title text-sm tracking-tight text-foreground">{task.title}</h4>
                              <p className="text-xs text-muted-foreground font-bold uppercase mt-0.5">
                                {task.dueDate.toLocaleDateString('pt-PT')} • {task.client}
                              </p>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${
                            isTaskComp ? 'bg-primary text-primary-foreground border-2 border-border-strong' : 
                            isTaskCanc
                              ? 'bg-danger-solid text-ink-foreground border-2 border-border-strong'
                              : isTaskInc
                                ? 'bg-warning-solid text-primary-foreground border-2 border-border-strong'
                                : 'bg-primary text-primary-foreground border-2 border-border-strong'
                          }`}>
                            {historyStatusLabel(task.status)}
                          </span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            </div>

            <div
              ref={(node) => {
                listScrollRef.current = node;
                setListScrollEl(node);
              }}
              data-tour="tech-list-agenda"
              className={cn(
                "absolute inset-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 pb-8 md:p-6 lg:px-8 touch-manipulation",
                view !== "list" && "invisible pointer-events-none"
              )}
              aria-hidden={view !== "list"}
            >
            <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl">
              <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                 <div>
                    <DisplayHeading as="h2" lines={["Agenda"]} className="text-lg md:text-xl" />
                    <p className="text-xs font-semibold text-muted-foreground" suppressHydrationWarning>
                      {formatPtDate(clientHydrated, calendarDate, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {" · "}
                      {dayTasksForDisplay.length} visita{dayTasksForDisplay.length === 1 ? "" : "s"}
                    </p>
                 </div>
                 
                 <div className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-border-strong bg-card p-1.5 sm:w-auto touch-manipulation">
                    <button 
                      type="button"
                      onClick={() => shiftCalendarDay(-1)}
                      className="min-h-12 rounded-xl px-4 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink active:bg-muted"
                    >
                      Voltar
                    </button>
                    <div
                      className="min-w-[120px] px-4 text-center text-xs font-black uppercase tracking-widest text-foreground"
                      suppressHydrationWarning
                    >
                      {formatPtDate(clientHydrated, calendarDate, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <button 
                      type="button"
                      onClick={() => shiftCalendarDay(1)}
                      className="min-h-12 rounded-xl px-4 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink active:bg-muted"
                    >
                      Avançar
                    </button>
                 </div>
              </div>
              
              {dayTasksForDisplay.length === 0 ? (
                <div className="overflow-hidden rounded-2xl border-2 border-border-strong bg-card py-12 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-border-strong bg-muted">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-muted-foreground">
                    Sem visitas agendadas para hoje
                  </h3>
                  <button 
                    onClick={() => setCalendarDate(new Date())}
                    className="mt-4 text-xs font-black uppercase tracking-widest text-primary-ink transition-colors hover:text-foreground"
                  >
                    Voltar para o dia de hoje
                  </button>
                  <div className="mt-8">
                    <Marquee segments={["Agenda", "Campo", "Sync"]} />
                  </div>
                </div>
              ) : (
                <div className="space-y-5 md:grid md:grid-cols-2 lg:gap-5 lg:space-y-0">
                  {dayTasksForDisplay.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        setSelectedTask={setSelectedTask} 
                      />
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Slider Drawer de Detalhes Modularizado */}
      {selectedTask && (
        <TaskDetailsDrawer
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          isOnline={isOnline}
          userName={userName}
          mutateTasks={refreshTasksFromServer}
          enqueueStatusUpdate={enqueueStatusUpdateOptimistic}
          enqueueMeasurementsSave={enqueueMeasurementsSave}
          enqueueNote={enqueueNote}
          enqueueVisitService={enqueueVisitService}
          technicianId={userId}
        />
      )}

      {/* Navegação Inferior Modularizada */}
      <BottomNav
        view={view}
        setView={(next) => changeMainView(next)}
        setSelectedTask={setSelectedTask}
      />
    </div>
  );
}
