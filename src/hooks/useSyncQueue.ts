import { useState, useEffect, useCallback, useRef } from "react";
import { db, type SyncQueueItem } from "@/lib/db";
import { countVisitPhotoQueue } from "@/lib/visits/visitPhotoQueue";
import { isBrowserOnline } from "@/lib/networkOnline";
import type { SyncFailedItem } from "@/lib/schemas/syncTelemetry";
import { isTransientSyncFailure } from "@/lib/sync/syncQueuePolicy";
import type { ActionErrorCode } from "@/lib/types/action-response";
import type { RepairPaymentNote } from "@/lib/visits/repairPayment";
import { useToast } from "@/components/ui/ToastContext";
import { toUserMessage } from "@/lib/userMessages";
import { getNotificationScope } from "@/lib/inAppNotifications";
import { agendaDiffKindsForQueueAction, markLocalAgendaChange } from "@/lib/agendaLocalChanges";
import { recordMeasurementsAgendaTimeline } from "@/lib/agendaMeasurementsTimeline";
import {
  dispatchSyncQueueAction,
  getNextRetryAt,
  randomJitter,
  sendSyncTelemetry,
  sleep,
  TELEMETRY_MIN_INTERVAL_MS,
  withSyncQueueLock,
} from "@/lib/sync/syncQueueRuntime";
import {
  applySyncQueueItemFailure,
  drainVisitPhotoQueue,
  resetAllFailedQueueItems,
  resetSingleFailedQueueItem,
  STALE_CLIENT_USER_MESSAGE,
} from "@/lib/sync/syncQueueRetry";
import {
  enqueueMeasurementsSaveOp,
  enqueueNoteOp,
  enqueueStatusUpdateOp,
  enqueueVisitServiceOp,
  type SyncQueueEnqueueContext,
} from "@/lib/sync/syncQueueEnqueue";

export interface UseSyncQueueOptions {
  technicianId?: string;
  technicianName?: string;
  onOpenSyncQueue?: () => void;
}

export function useSyncQueue(options: UseSyncQueueOptions = {}) {
  const { technicianId, technicianName, onOpenSyncQueue } = options;
  const toast = useToast();
  const lastFailedToastAtRef = useRef(0);
  const [isOnline, setIsOnline] = useState(() => isBrowserOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<number | null>(null);
  const syncingRef = useRef(false);
  const rerunAfterCompleteRef = useRef(false);
  const lastTelemetryAtRef = useRef(0);
  const lastTelemetryFailedRef = useRef(-1);
  const lastSyncSuccessRef = useRef<number | null>(null);
  const onOpenSyncQueueRef = useRef(onOpenSyncQueue);
  onOpenSyncQueueRef.current = onOpenSyncQueue;
  const queuePausedReasonRef = useRef<"stale" | "session" | null>(null);

  const reportTelemetry = useCallback(
    async (pending: number, failed: number) => {
      if (!technicianId || typeof window === "undefined") return;

      const now = Date.now();
      const shouldForce = failed > 0 && failed !== lastTelemetryFailedRef.current;
      const idleInterval =
        pending === 0 && failed === 0 ? TELEMETRY_MIN_INTERVAL_MS * 4 : TELEMETRY_MIN_INTERVAL_MS;
      if (!shouldForce && now - lastTelemetryAtRef.current < idleInterval) {
        return;
      }

      lastTelemetryAtRef.current = now;
      lastTelemetryFailedRef.current = failed;

      let failedItems: SyncFailedItem[] = [];
      try {
        const rows = await db.syncQueue.where("status").equals("failed").toArray();
        failedItems = rows.slice(0, 25).map((item) => ({
          action: item.action,
          taskId: item.taskId,
          lastError: item.lastError,
          retries: item.retries,
          timestamp: item.timestamp,
        }));
      } catch {
        // ignore
      }

      await sendSyncTelemetry({
        technicianId,
        technicianName: technicianName || "Técnico",
        pendingCount: pending,
        failedCount: failed,
        lastSyncSuccess: lastSyncSuccessRef.current,
        failedItems,
      });
    },
    [technicianId, technicianName]
  );

  useEffect(() => {
    lastSyncSuccessRef.current = lastSyncSuccess;
  }, [lastSyncSuccess]);

  const refreshCounts = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const pending = await db.syncQueue.where("status").equals("pending").count();
      const failed = await db.syncQueue.where("status").equals("failed").count();
      const photoCounts = await countVisitPhotoQueue();
      setPendingCount(pending + photoCounts.pending);
      setFailedCount(failed + photoCounts.failed);
      await reportTelemetry(pending + photoCounts.pending, failed + photoCounts.failed);
    } catch (e) {
      console.warn("Could not read syncQueue counts:", e);
    }
  }, [reportTelemetry]);

  const notifyQueueFailure = useCallback(
    (message: string) => {
      const now = Date.now();
      if (now - lastFailedToastAtRef.current < 4000) return;
      lastFailedToastAtRef.current = now;
      toast.error(
        "Alteração não sincronizada",
        toUserMessage(message, "Verifique a fila de sincronização."),
        onOpenSyncQueueRef.current
          ? {
              label: "Ver fila",
              onClick: () => onOpenSyncQueueRef.current?.(),
            }
          : undefined
      );
    },
    [toast]
  );

  const failureDeps = useCallback(
    () => ({
      onStaleClient: () => {
        queuePausedReasonRef.current = "stale";
        toast.warning("Versão desatualizada", STALE_CLIENT_USER_MESSAGE);
      },
      onSessionExpired: () => {
        queuePausedReasonRef.current = "session";
        toast.warning("Sessão expirada", "Inicie sessão para sincronizar as alterações pendentes.");
      },
      onPermanentFailure: notifyQueueFailure,
    }),
    [notifyQueueFailure, toast]
  );

  const handleQueueItemFailure = useCallback(
    async (item: SyncQueueItem, message: string, errorCode?: ActionErrorCode) => {
      await applySyncQueueItemFailure(item, message, errorCode, failureDeps());
    },
    [failureDeps]
  );

  const processVisitPhotoQueue = useCallback(async () => drainVisitPhotoQueue(), []);

  const processQueue = useCallback(async () => {
    if (queuePausedReasonRef.current) return;
    if (syncingRef.current || typeof window === "undefined" || !isBrowserOnline()) return;

    const run = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);

      let syncedAny = false;

      try {
        if (await processVisitPhotoQueue()) {
          syncedAny = true;
        }

        const pendingItems = await db.syncQueue.where("status").equals("pending").toArray();
        pendingItems.sort((a, b) => (a.id || 0) - (b.id || 0));

        if (pendingItems.length === 0) {
          await refreshCounts();
          return;
        }

        const tasksWaitingBackoff = new Set<string>();

        for (const item of pendingItems) {
          if (!isBrowserOnline()) break;

          const nextRetryAt = getNextRetryAt(item);
          if (nextRetryAt && Date.now() < nextRetryAt) {
            if (item.taskId) tasksWaitingBackoff.add(item.taskId);
            continue;
          }

          if (item.taskId && tasksWaitingBackoff.has(item.taskId)) {
            continue;
          }

          await sleep(randomJitter());

          try {
            await dispatchSyncQueueAction(item);
            if (item.id) {
              await db.syncQueue.delete(item.id);
              syncedAny = true;
              if (technicianId) {
                const scope = getNotificationScope("technician", technicianId);
                if (item.action === "SAVE_MEASUREMENTS" && item.taskId) {
                  const oppId = item.payload?.opportunityId;
                  void recordMeasurementsAgendaTimeline(scope, {
                    taskId: item.taskId,
                    opportunityId: typeof oppId === "string" ? oppId : undefined,
                    synced: true,
                  });
                }
                const kinds = agendaDiffKindsForQueueAction(
                  item.action,
                  (item.payload ?? {}) as Record<string, unknown>
                );
                if (kinds.length > 0) {
                  markLocalAgendaChange(scope, item.taskId, kinds);
                  const oppId = item.payload?.opportunityId;
                  if (typeof oppId === "string") {
                    markLocalAgendaChange(scope, oppId, kinds);
                  }
                }
              }
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            const errorCode =
              error instanceof Error
                ? (error as Error & { errorCode?: ActionErrorCode }).errorCode
                : undefined;
            console.error(`[SyncQueue] Falha ao sincronizar ação ${item.id}:`, error);
            await handleQueueItemFailure(item, message, errorCode);
            if (item.taskId) {
              tasksWaitingBackoff.add(item.taskId);
            }
            if (isTransientSyncFailure(message, errorCode) && !isBrowserOnline()) {
              break;
            }
          }
        }
      } catch (e) {
        console.error("[SyncQueue] Erro geral ao processar fila:", e);
      } finally {
        syncingRef.current = false;
        setSyncing(false);
        if (syncedAny) {
          setLastSyncSuccess(Date.now());
        }
        await refreshCounts();
        if (rerunAfterCompleteRef.current) {
          rerunAfterCompleteRef.current = false;
          queueMicrotask(() => {
            void processQueueRef.current();
          });
        }
      }
    };

    await withSyncQueueLock(run);
  }, [refreshCounts, handleQueueItemFailure, technicianId, processVisitPhotoQueue]);

  const retryFailed = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      await resetAllFailedQueueItems();
      if (syncingRef.current) {
        rerunAfterCompleteRef.current = true;
      } else {
        processQueue();
      }
    } catch (e) {
      console.error("[SyncQueue] Erro ao reiniciar itens falhados:", e);
      toast.error("Fila de sincronização", toUserMessage(e, "Não foi possível repetir a sincronização."));
    }
  }, [processQueue, toast]);

  const retryFailedItem = useCallback(
    async (itemId: number) => {
      if (typeof window === "undefined") return;
      try {
        const ok = await resetSingleFailedQueueItem(itemId);
        if (!ok) return;
        if (syncingRef.current) {
          rerunAfterCompleteRef.current = true;
        } else {
          processQueue();
        }
      } catch (e) {
        console.error("[SyncQueue] Erro ao repetir item:", e);
        toast.error("Fila de sincronização", toUserMessage(e, "Não foi possível repetir este item."));
      }
    },
    [processQueue, toast]
  );

  const processQueueRef = useRef(processQueue);
  processQueueRef.current = processQueue;
  const refreshCountsRef = useRef(refreshCounts);
  refreshCountsRef.current = refreshCounts;

  useEffect(() => {
    if (!technicianId || typeof window === "undefined") return;
    void refreshCountsRef.current();
  }, [technicianId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(isBrowserOnline());
      void refreshCountsRef.current();

      const handleOnline = () => {
        setIsOnline(true);
        void processQueueRef.current();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if (isBrowserOnline()) {
        void processQueueRef.current();
      }

      const interval = setInterval(() => {
        if (isBrowserOnline()) {
          void processQueueRef.current();
        } else {
          void refreshCountsRef.current();
        }
      }, 60000);

      const onVisible = () => {
        if (document.visibilityState === "visible" && isBrowserOnline()) {
          void processQueueRef.current();
        }
      };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        document.removeEventListener("visibilitychange", onVisible);
        clearInterval(interval);
      };
    }
  }, []);

  const enqueueCtx = useCallback((): SyncQueueEnqueueContext => ({
    technicianId,
    refreshCounts,
  }), [technicianId, refreshCounts]);

  const enqueueStatusUpdate = useCallback(
    (
      taskId: string,
      status: string,
      reason: string,
      photos: string[],
      opportunityId?: string,
      paymentNotes?: RepairPaymentNote[]
    ) => enqueueStatusUpdateOp(enqueueCtx(), taskId, status, reason, photos, opportunityId, paymentNotes),
    [enqueueCtx]
  );

  const enqueueMeasurementsSave = useCallback(
    (taskId: string, opportunityId: string, data: unknown) =>
      enqueueMeasurementsSaveOp(enqueueCtx(), taskId, opportunityId, data),
    [enqueueCtx]
  );

  const enqueueVisitService = useCallback(
    (payload: Record<string, unknown>) => enqueueVisitServiceOp(enqueueCtx(), payload),
    [enqueueCtx]
  );

  const enqueueNote = useCallback(
    (opportunityId: string, personId: string | null, title: string, body: string, taskId?: string) =>
      enqueueNoteOp(enqueueCtx(), opportunityId, personId, title, body, taskId),
    [enqueueCtx]
  );

  return {
    isOnline,
    syncing,
    pendingCount,
    failedCount,
    lastSyncSuccess,
    enqueueStatusUpdate,
    enqueueMeasurementsSave,
    enqueueNote,
    enqueueVisitService,
    processQueue,
    processVisitPhotoQueue,
    retryFailed,
    retryFailedItem,
    refreshCounts,
  };
}