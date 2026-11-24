"use client";

import { useCallback, useEffect, useMemo } from "react";
import { buildAgendaSnapshotItem, toSafeIso } from "@/lib/agendaDiff";
import { isUrgentVisitMarkdown } from "@/lib/crm/urgentSchedulingUi";
import { resolveServiceType } from "@/lib/techniciansConfig";
import {
  IN_APP_NOTIFICATION_OPEN_TASK_EVENT,
  getNotificationScope,
  type InAppNotification,
  type InAppNotificationOpenTaskDetail,
} from "@/lib/inAppNotifications";
import { useAgendaNotifications } from "@/hooks/useAgendaNotifications";
import { useClientRatingNotifications } from "@/hooks/useClientRatingNotifications";
import { useToast } from "@/components/ui/ToastContext";

type TechnicianToast = ReturnType<typeof useToast>;

export function useTechnicianAgendaNotifications(params: {
  userId: string;
  rawTasksData: any[] | undefined;
  loading: boolean;
  syncError: unknown;
  allTasks: any[];
  toast: TechnicianToast;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  setView: (view: string) => void;
  setMapAutoFitScope: (scope: "all" | "overdue") => void;
  setMapFitNonce: React.Dispatch<React.SetStateAction<number>>;
  setSelectedTask: (task: any) => void;
  refreshTasksFromServer: () => Promise<void>;
}) {
  const {
    userId,
    rawTasksData,
    loading,
    syncError,
    allTasks,
    toast,
    setCalendarDate,
    setView,
    setMapAutoFitScope,
    setMapFitNonce,
    setSelectedTask,
    refreshTasksFromServer,
  } = params;

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
        serviceNumber?: string;
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
        report?: string;
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
          serviceNumber: t.serviceNumber,
          visitTitle: t.title,
          opportunityId: t.opportunityId,
          onSiteOpportunityIds: onSiteOpportunityIds.length > 0 ? onSiteOpportunityIds : undefined,
          onSiteServices: onSiteServices.length > 0 ? onSiteServices : undefined,
          statusNote: t.statusNote,
          serviceType: serviceType || undefined,
          urgent: isUrgentVisitMarkdown(t.report),
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
  useClientRatingNotifications({
    scope: techNotificationScope,
    ready: agendaNotificationsReady,
    toast,
  });

  const openAgendaNotificationOnMap = useCallback(
    (notification: InAppNotification) => {
      if (!notification.taskId && !notification.opportunityId) return;

      if (notification.dueAtIso) {
        const due = new Date(notification.dueAtIso);
        if (!Number.isNaN(due.getTime())) {
          setCalendarDate(due);
        }
      }

      setView("map");
      setMapAutoFitScope("all");
      setMapFitNonce((n) => n + 1);

      const task =
        (notification.taskId
          ? allTasks.find((t) => t.id === notification.taskId)
          : undefined) ??
        (notification.opportunityId
          ? allTasks.find((t) => t.opportunityId === notification.opportunityId)
          : undefined);

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
    [
      allTasks,
      refreshTasksFromServer,
      setCalendarDate,
      setMapAutoFitScope,
      setMapFitNonce,
      setSelectedTask,
      setView,
      toast,
    ]
  );

  useEffect(() => {
    const onOpenFromNotification = (event: Event) => {
      const detail = (event as CustomEvent<InAppNotificationOpenTaskDetail>).detail;
      if (!detail?.taskId && !detail?.opportunityId) return;
      openAgendaNotificationOnMap({
        id: "",
        title: "",
        description: "",
        createdAt: Date.now(),
        read: true,
        taskId: detail.taskId,
        opportunityId: detail.opportunityId,
        dueAtIso: detail.dueAtIso,
      });
    };
    window.addEventListener(IN_APP_NOTIFICATION_OPEN_TASK_EVENT, onOpenFromNotification);
    return () =>
      window.removeEventListener(IN_APP_NOTIFICATION_OPEN_TASK_EVENT, onOpenFromNotification);
  }, [openAgendaNotificationOnMap]);

  return {
    techNotificationScope,
    openAgendaNotificationOnMap,
  };
}