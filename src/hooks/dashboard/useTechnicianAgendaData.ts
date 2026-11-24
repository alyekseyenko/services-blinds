"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { isTaskActive } from "@/lib/crm/contract";
import { buildTechnicianTasksEndpoint } from "@/lib/api/technicianTasksEndpoint";
import { useSync } from "@/hooks/useSync";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { db } from "@/lib/db";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import {
  isVisitPendingTechnicianClosure,
  sortByScheduledAtAsc,
} from "@/lib/visitPendingClosure";
import { technicianHistorySortTime } from "@/lib/visits/historyOrder";
import { matchesHistoryVisitDate, matchesTaskHistoryOutcomes } from "@/lib/visits/historyFilters";
import type { useHistoryListFilters } from "@/hooks/useHistoryListFilters";
import type { RepairPaymentNote } from "@/lib/visits/repairPayment";
import { useToast } from "@/components/ui/ToastContext";

type TechnicianToast = ReturnType<typeof useToast>;

const EMPTY_TASK_LIST: never[] = [];

export function parseClientDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function historySortTimestamp(task: { updatedAt?: Date; dueDate: Date }): number {
  return technicianHistorySortTime(task);
}

export function useTechnicianAgendaData(params: {
  userId: string;
  userName: string;
  toast: TechnicianToast;
  historyFilters: ReturnType<typeof useHistoryListFilters>;
  selectedTask: any | null;
  setSelectedTask: (task: any | null) => void;
  calendarDate: Date;
}) {
  const { userId, userName, toast, historyFilters, selectedTask, setSelectedTask, calendarDate } =
    params;

  const openSyncQueue = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fieldops-open-sync-queue"));
  }, []);

  const endpoint = userId ? buildTechnicianTasksEndpoint(userId) : null;
  const {
    data: rawTasksData,
    isLoading: loading,
    isSyncing,
    error: syncError,
    mutate: mutateTasks,
    lastSuccessAt: agendaLastSuccessAt,
    isStale: agendaDataStale,
  } = useSync<any[]>(endpoint, { revalidateOnFocus: true, refreshInterval: 30_000 });
  const rawTasks = rawTasksData ?? EMPTY_TASK_LIST;

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
    processQueue,
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
      opportunityId?: string,
      paymentNotes?: RepairPaymentNote[]
    ) => {
      const result = await enqueueStatusUpdate(
        taskId,
        status,
        reason,
        photos,
        opportunityId,
        paymentNotes
      );
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
  }, [rawTasks, selectedTask?.id, toast, setSelectedTask]);

  useEffect(() => {
    if (!lastSyncSuccess) return;
    void mutateTasks();
  }, [lastSyncSuccess, mutateTasks]);

  const lastSyncToastAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lastSyncSuccess) return;
    if (lastSyncToastAtRef.current === lastSyncSuccess) return;
    lastSyncToastAtRef.current = lastSyncSuccess;
    toast.success("Sincronização concluída", "Dados enviados ao CRM.");
  }, [lastSyncSuccess, toast]);

  const allTasks = useMemo(() => {
    if (!rawTasks || !Array.isArray(rawTasks)) return [];
    return rawTasks
      .map((t) => {
        const dueDate = parseClientDate(t.dueDate) ?? new Date();
        const visitEndAt = parseClientDate(
          (t as { visitEndAt?: string | Date | null }).visitEndAt
        );
        const updatedAt = parseClientDate(
          (t as { updatedAt?: string | Date | null }).updatedAt
        );
        return { ...t, dueDate, visitEndAt: visitEndAt ?? undefined, updatedAt };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [rawTasks]);

  const tasks = useMemo(() => allTasks.filter((t) => isTaskActive(t.status)), [allTasks]);

  const pendingClosureTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) =>
        isVisitPendingTechnicianClosure({ status: t.status, dueAt: t.dueDate }, now)
      )
      .sort((a, b) => sortByScheduledAtAsc({ dueDate: a.dueDate }, { dueDate: b.dueDate }));
  }, [tasks]);

  const listShowsToday = useMemo(
    () => calendarDate.toDateString() === new Date().toDateString(),
    [calendarDate]
  );

  const historyTasks = useMemo(() => {
    return allTasks
      .filter((t) => !isTaskActive(t.status))
      .sort((a, b) => historySortTimestamp(b) - historySortTimestamp(a));
  }, [allTasks]);

  const filteredHistoryTasks = useMemo(() => {
    return historyTasks.filter((task) => {
      if (!matchesTaskHistoryOutcomes(task.status, historyFilters.outcomes)) {
        return false;
      }
      return matchesHistoryVisitDate(
        { dueDate: task.dueDate, updatedAt: task.updatedAt },
        historyFilters.range
      );
    });
  }, [historyTasks, historyFilters.outcomes, historyFilters.range]);

  const taskLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTasks) {
      const serviceBit = t.serviceNumber ? `N.º ${t.serviceNumber}` : null;
      const nsiBit = t.nsi && t.nsi !== "N/A" ? `NSI ${t.nsi}` : null;
      map.set(t.id, [t.client, serviceBit, nsiBit].filter(Boolean).join(" · "));
    }
    return map;
  }, [allTasks]);

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate.toDateString() === calendarDate.toDateString()),
    [tasks, calendarDate]
  );

  const dayOverdueCount = useMemo(
    () => dayTasks.filter((t) => resolveTaskOverdue(t)).length,
    [dayTasks]
  );

  const showAgendaLoadFailure = Boolean(syncError && !loading && allTasks.length === 0);

  return {
    rawTasksData,
    loading,
    isSyncing,
    syncError,
    agendaLastSuccessAt,
    agendaDataStale,
    isOnline,
    pendingCount,
    failedCount,
    retryFailed,
    retryFailedItem,
    refreshCounts,
    processQueue,
    queueSyncing,
    enqueueStatusUpdateOptimistic,
    enqueueMeasurementsSave,
    enqueueNote,
    enqueueVisitService,
    refreshTasksFromServer,
    openSyncQueue,
    allTasks,
    tasks,
    pendingClosureTasks,
    listShowsToday,
    historyTasks,
    filteredHistoryTasks,
    taskLabelById,
    dayTasks,
    dayOverdueCount,
    showAgendaLoadFailure,
  };
}