import { useState, useEffect, useCallback, useRef } from 'react';
import { db, SyncQueueItem } from '@/lib/db';
import { isBrowserOnline } from '@/lib/networkOnline';
import { isOnboardingDemoEntity } from '@/lib/onboarding/demoMapPin';
import { syncUpdateTaskStatusAction } from '@/actions/tasks-actions';
import { submitMeasurementsAction } from '@/actions/measurements-actions';
import { createOpportunityNoteAction } from '@/actions/notes-actions';
import { createVisitServiceAction } from '@/actions/visit-services-actions';
import type { SyncFailedItem } from '@/lib/schemas/syncTelemetry';
import {
  isPermanentBusinessSyncError,
  isTransientSyncError,
  isSessionExpiredSyncError,
  syncRetryBackoffMs,
  SYNC_MAX_BUSINESS_RETRIES,
  FIELDOPS_STALE_CLIENT_EVENT,
} from '@/lib/sync/syncQueuePolicy';
import { isStaleServerActionError, STALE_CLIENT_USER_MESSAGE } from '@/lib/staleClientError';

const JITTER_MIN_MS = 50;
const JITTER_MAX_MS = 500;
const TELEMETRY_MIN_INTERVAL_MS = 30000;
const SYNC_LOCK_NAME = 'fieldops-sync-queue';

import { useToast } from '@/components/ui/ToastContext';
import { toUserMessage } from '@/lib/userMessages';
import { getNotificationScope } from '@/lib/inAppNotifications';
import {
  agendaDiffKindsForQueueAction,
  agendaDiffKindsForTaskStatusUpdate,
  markLocalAgendaChange,
} from '@/lib/agendaLocalChanges';
import { recordMeasurementsAgendaTimeline } from '@/lib/agendaMeasurementsTimeline';

export interface UseSyncQueueOptions {
  technicianId?: string;
  technicianName?: string;
  onOpenSyncQueue?: () => void;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomJitter() {
  return Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;
}

function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function withSyncQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    let executedInLock = false;
    try {
      return await navigator.locks.request(SYNC_LOCK_NAME, { mode: 'exclusive' }, async () => {
        executedInLock = true;
        return await fn();
      });
    } catch (err) {
      if (executedInLock) throw err;
      return fn();
    }
  }
  return fn();
}

const SERVER_ACTION_TIMEOUT_MS = 30_000;

function withServerActionTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), SERVER_ACTION_TIMEOUT_MS);
    }),
  ]);
}

function getNextRetryAt(item: SyncQueueItem): number | undefined {
  const value = item.payload?.nextRetryAt;
  return typeof value === 'number' ? value : undefined;
}

function getTransientAttempts(item: SyncQueueItem): number {
  const value = item.payload?.transientAttempts;
  return typeof value === 'number' ? value : 0;
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

  const reportTelemetry = useCallback(async (pending: number, failed: number) => {
    if (!technicianId || typeof window === 'undefined') return;

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
      const rows = await db.syncQueue.where('status').equals('failed').toArray();
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

    try {
      await fetch('/api/sync-telemetry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId,
          technicianName: technicianName || 'Técnico',
          pendingCount: pending,
          failedCount: failed,
          isOnline: isBrowserOnline(),
          lastSyncSuccess: lastSyncSuccessRef.current,
          failedItems,
        }),
      });
    } catch {
      // Telemetria não deve bloquear o técnico
    }
  }, [technicianId, technicianName]);

  useEffect(() => {
    lastSyncSuccessRef.current = lastSyncSuccess;
  }, [lastSyncSuccess]);

  const refreshCounts = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const pending = await db.syncQueue.where('status').equals('pending').count();
      const failed = await db.syncQueue.where('status').equals('failed').count();
      setPendingCount(pending);
      setFailedCount(failed);
      await reportTelemetry(pending, failed);
    } catch (e) {
      console.warn("Could not read syncQueue counts:", e);
    }
  }, [reportTelemetry]);

  const processQueueItem = useCallback(async (item: SyncQueueItem) => {
    const clientRequestId =
      typeof item.payload?.clientRequestId === 'string'
        ? item.payload.clientRequestId
        : undefined;

    if (item.action === 'UPDATE_STATUS') {
      const statusResult = await withServerActionTimeout(
        syncUpdateTaskStatusAction(
        item.payload.taskId,
        item.payload.status,
        item.payload.reason,
        item.payload.photos || [],
        clientRequestId
        )
      );
      if (!statusResult.success) {
        throw new Error(statusResult.error || 'Falha ao sincronizar o estado da visita.');
      }
      return;
    }

    if (item.action === 'SAVE_MEASUREMENTS') {
      const result = await withServerActionTimeout(
        submitMeasurementsAction(
        item.payload.taskId,
        item.payload.opportunityId,
        item.payload.data,
        clientRequestId
        )
      );
      if (!result.success) {
        throw new Error(result.error || 'Falha ao sincronizar medições.');
      }
      return;
    }

    if (item.action === 'ADD_NOTE') {
      const noteResult = await withServerActionTimeout(
        createOpportunityNoteAction(
        item.payload.opportunityId,
        item.payload.personId || null,
        item.payload.title,
        item.payload.body,
        item.payload.taskId,
        clientRequestId
        )
      );
      if (!noteResult.success) {
        throw new Error(noteResult.error || 'Falha ao sincronizar nota.');
      }
      return;
    }

    if (item.action === 'CREATE_VISIT_SERVICE') {
      const visitResult = await withServerActionTimeout(createVisitServiceAction(item.payload));
      if (!visitResult.success) {
        throw new Error(visitResult.error || "Falha ao sincronizar o serviço no local.");
      }
    }
  }, []);

  const notifyQueueFailure = useCallback(
    (message: string) => {
      const now = Date.now();
      if (now - lastFailedToastAtRef.current < 4000) return;
      lastFailedToastAtRef.current = now;
      toast.error(
        'Alteração não sincronizada',
        toUserMessage(message, 'Verifique a fila de sincronização.'),
        onOpenSyncQueueRef.current
          ? {
              label: 'Ver fila',
              onClick: () => onOpenSyncQueueRef.current?.(),
            }
          : undefined
      );
    },
    [toast]
  );

  const handleQueueItemFailure = useCallback(
    async (item: SyncQueueItem, message: string) => {
      if (!item.id) return;

      if (isStaleServerActionError(message)) {
        queuePausedReasonRef.current = "stale";
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(FIELDOPS_STALE_CLIENT_EVENT));
        }
        await db.syncQueue.update(item.id, {
          lastError: message,
          status: "pending",
        });
        toast.warning("Versão desatualizada", STALE_CLIENT_USER_MESSAGE);
        return;
      }

      if (isSessionExpiredSyncError(message)) {
        queuePausedReasonRef.current = "session";
        await db.syncQueue.update(item.id, {
          lastError: message,
          status: "pending",
        });
        toast.warning(
          "Sessão expirada",
          "Inicie sessão para sincronizar as alterações pendentes."
        );
        return;
      }

      if (isPermanentBusinessSyncError(message)) {
        await db.syncQueue.update(item.id, {
          retries: (item.retries || 0) + 1,
          lastError: message,
          status: 'failed',
        });
        notifyQueueFailure(message);
        return;
      }

      if (isTransientSyncError(message)) {
        const attempts = getTransientAttempts(item) + 1;
        const backoff = syncRetryBackoffMs(attempts);
        await db.syncQueue.update(item.id, {
          retries: item.retries || 0,
          lastError: message,
          status: 'pending',
          payload: {
            ...item.payload,
            transientAttempts: attempts,
            nextRetryAt: Date.now() + backoff,
          },
        });
        return;
      }

      const currentRetries = (item.retries || 0) + 1;
      const isFailed = currentRetries >= SYNC_MAX_BUSINESS_RETRIES;
      await db.syncQueue.update(item.id, {
        retries: currentRetries,
        lastError: message,
        status: isFailed ? 'failed' : 'pending',
        payload: {
          ...item.payload,
          nextRetryAt: isFailed ? undefined : Date.now() + syncRetryBackoffMs(currentRetries),
        },
      });
      if (isFailed) {
        notifyQueueFailure(message);
      }
    },
    [notifyQueueFailure, toast]
  );

  const processQueue = useCallback(async () => {
    if (queuePausedReasonRef.current) return;
    if (syncingRef.current || typeof window === 'undefined' || !isBrowserOnline()) return;

    const run = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);

      let syncedAny = false;

      try {
        const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
        pendingItems.sort((a, b) => (a.id || 0) - (b.id || 0));

        if (pendingItems.length === 0) {
          await refreshCounts();
          return;
        }

        const tasksWaitingBackoff = new Set<string>();

        for (const item of pendingItems) {
          if (!isBrowserOnline()) {
            break;
          }

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
            await processQueueItem(item);
            if (item.id) {
              await db.syncQueue.delete(item.id);
              syncedAny = true;
              if (technicianId) {
                const scope = getNotificationScope('technician', technicianId);
                if (item.action === 'SAVE_MEASUREMENTS' && item.taskId) {
                  const oppId = item.payload?.opportunityId;
                  void recordMeasurementsAgendaTimeline(scope, {
                    taskId: item.taskId,
                    opportunityId: typeof oppId === 'string' ? oppId : undefined,
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
                  if (typeof oppId === 'string') {
                    markLocalAgendaChange(scope, oppId, kinds);
                  }
                }
              }
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`[SyncQueue] Falha ao sincronizar ação ${item.id}:`, error);
            await handleQueueItemFailure(item, message);
            if (isTransientSyncError(message) && !isBrowserOnline()) {
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
  }, [refreshCounts, processQueueItem, handleQueueItemFailure, technicianId]);

  const retryFailed = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const failedItems = await db.syncQueue.where('status').equals('failed').toArray();
      for (const item of failedItems) {
        if (item.id) {
          await db.syncQueue.update(item.id, {
            status: 'pending',
            retries: 0,
            lastError: undefined,
            payload: { ...item.payload, nextRetryAt: undefined },
          });
        }
      }
      if (syncingRef.current) {
        rerunAfterCompleteRef.current = true;
      } else {
        processQueue();
      }
    } catch (e) {
      console.error("[SyncQueue] Erro ao reiniciar itens falhados:", e);
      toast.error('Fila de sincronização', toUserMessage(e, 'Não foi possível repetir a sincronização.'));
    }
  }, [processQueue, toast]);

  const retryFailedItem = useCallback(
    async (itemId: number) => {
      if (typeof window === 'undefined') return;
      try {
        const row = await db.syncQueue.get(itemId);
        if (!row) return;
        await db.syncQueue.update(itemId, {
          status: 'pending',
          retries: 0,
          lastError: undefined,
          payload: { ...row.payload, nextRetryAt: undefined, transientAttempts: 0 },
        });
        if (syncingRef.current) {
          rerunAfterCompleteRef.current = true;
        } else {
          processQueue();
        }
      } catch (e) {
        console.error('[SyncQueue] Erro ao repetir item:', e);
        toast.error('Fila de sincronização', toUserMessage(e, 'Não foi possível repetir este item.'));
      }
    },
    [processQueue, toast]
  );

  const processQueueRef = useRef(processQueue);
  processQueueRef.current = processQueue;
  const refreshCountsRef = useRef(refreshCounts);
  refreshCountsRef.current = refreshCounts;

  useEffect(() => {
    if (!technicianId || typeof window === 'undefined') return;
    void refreshCountsRef.current();
  }, [technicianId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(isBrowserOnline());
      void refreshCountsRef.current();

      const handleOnline = () => {
        setIsOnline(true);
        void processQueueRef.current();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

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
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        document.removeEventListener("visibilitychange", onVisible);
        clearInterval(interval);
      };
    }
  }, []);

  const enqueueStatusUpdate = useCallback(async (
    taskId: string,
    status: string,
    reason: string,
    photos: string[],
    opportunityId?: string
  ) => {
    if (isOnboardingDemoEntity({ id: taskId })) {
      return { success: true, queued: false };
    }

    const notifyScope = technicianId
      ? getNotificationScope("technician", technicianId)
      : null;
    const statusKinds = agendaDiffKindsForTaskStatusUpdate(status);
    const markOwnAgendaChange = () => {
      if (!notifyScope || statusKinds.length === 0) return;
      markLocalAgendaChange(notifyScope, taskId, statusKinds);
      if (opportunityId) markLocalAgendaChange(notifyScope, opportunityId, statusKinds);
    };

    const clientRequestId = newClientRequestId();
    const buildItem = (): SyncQueueItem => ({
      taskId,
      action: 'UPDATE_STATUS',
      payload: {
        taskId,
        status,
        reason,
        photos,
        opportunityId,
        clientRequestId,
      },
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    });

    if (isBrowserOnline()) {
      try {
        const direct = await withSyncQueueLock(async () =>
          syncUpdateTaskStatusAction(taskId, status, reason, photos, clientRequestId)
        );
        if (!direct.success) {
          if (isPermanentBusinessSyncError(direct.error || '')) {
            return { success: false, queued: false, error: direct.error };
          }
          throw new Error(direct.error || 'Falha ao atualizar o estado da visita.');
        }
        markOwnAgendaChange();
        await refreshCounts();
        return { success: true, queued: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isPermanentBusinessSyncError(message)) {
          return { success: false, queued: false, error: message };
        }
        console.warn("[SyncQueue] Falha direta na rede, a colocar na fila offline...", error);
      }
    }

    const existing = await db.syncQueue
      .where('taskId').equals(taskId)
      .filter((i) => i.action === 'UPDATE_STATUS' && i.status === 'pending')
      .first();

    if (existing?.id) {
      await db.syncQueue.delete(existing.id);
    }
    await db.syncQueue.add(buildItem());
    markOwnAgendaChange();

    await refreshCounts();
    return { success: true, queued: true };
  }, [refreshCounts, technicianId]);

  const enqueueMeasurementsSave = useCallback(async (
    taskId: string,
    opportunityId: string,
    data: unknown
  ) => {
    if (isOnboardingDemoEntity({ id: taskId })) {
      return { success: true, queued: false };
    }

    const clientRequestId = newClientRequestId();

    if (isBrowserOnline()) {
      try {
        const result = await withSyncQueueLock(async () =>
          submitMeasurementsAction(taskId, opportunityId, data, clientRequestId)
        );
        if (!result.success) {
          if (isPermanentBusinessSyncError(result.error || '')) {
            return { success: false, queued: false, error: result.error };
          }
          throw new Error(result.error || 'Falha ao guardar medições.');
        }
        await refreshCounts();
        if (technicianId) {
          const scope = getNotificationScope('technician', technicianId);
          void recordMeasurementsAgendaTimeline(scope, {
            taskId,
            opportunityId,
            synced: true,
          });
        }
        return { success: true, queued: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isPermanentBusinessSyncError(message)) {
          return { success: false, queued: false, error: message };
        }
        console.warn("[SyncQueue] Falha direta na rede para medições, a colocar na fila offline...", error);
      }
    }

    const item: SyncQueueItem = {
      taskId,
      action: 'SAVE_MEASUREMENTS',
      payload: { taskId, opportunityId, data, clientRequestId },
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    const existing = await db.syncQueue
      .where('taskId').equals(taskId)
      .filter((i) => i.action === 'SAVE_MEASUREMENTS' && i.status === 'pending')
      .first();

    if (existing?.id) {
      await db.syncQueue.delete(existing.id);
    }
    await db.syncQueue.add(item);

    await refreshCounts();
    if (technicianId) {
      const scope = getNotificationScope('technician', technicianId);
      void recordMeasurementsAgendaTimeline(scope, {
        taskId,
        opportunityId,
        synced: false,
      });
    }
    return { success: true, queued: true };
  }, [refreshCounts, technicianId]);

  const enqueueVisitService = useCallback(async (payload: Record<string, unknown>) => {
    const taskId = String(payload.taskId || '');
    if (isOnboardingDemoEntity({ id: taskId })) {
      return {
        success: true,
        queued: false,
        opportunityId: `${taskId}-extra-${Date.now()}`,
      };
    }
    const clientRequestId = String(payload.clientRequestId || newClientRequestId());
    const enrichedPayload = { ...payload, clientRequestId };

    if (isBrowserOnline()) {
      try {
        const result = await withSyncQueueLock(async () =>
          createVisitServiceAction(enrichedPayload)
        );
        if (!result.success) {
          if (isPermanentBusinessSyncError(result.error || '')) {
            return { success: false, queued: false, error: result.error };
          }
          throw new Error(result.error || "Falha ao criar o serviço no local.");
        }
        if (technicianId) {
          const scope = getNotificationScope("technician", technicianId);
          const kinds = ["nova", "servico_extra"] as const;
          markLocalAgendaChange(scope, taskId, [...kinds]);
          const oppId = result.data?.opportunityId;
          if (oppId) markLocalAgendaChange(scope, oppId, [...kinds]);
        }
        await refreshCounts();
        return { success: true, queued: false, opportunityId: result.data?.opportunityId };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isPermanentBusinessSyncError(message)) {
          return { success: false, queued: false, error: message };
        }
        console.warn('[SyncQueue] On-site service failed online, queueing offline...', error);
      }
    }

    const item: SyncQueueItem = {
      taskId,
      action: 'CREATE_VISIT_SERVICE',
      payload: enrichedPayload,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    const existing = await db.syncQueue
      .where('taskId')
      .equals(taskId)
      .filter(
        (i) =>
          i.action === 'CREATE_VISIT_SERVICE' &&
          i.status === 'pending' &&
          i.payload?.clientRequestId === clientRequestId
      )
      .first();

    if (existing?.id) {
      await db.syncQueue.delete(existing.id);
    }
    await db.syncQueue.add(item);
    if (technicianId) {
      const kinds = ["nova", "servico_extra"] as const;
      markLocalAgendaChange(getNotificationScope("technician", technicianId), taskId, [...kinds]);
    }

    await refreshCounts();
    return { success: true, queued: true };
  }, [refreshCounts, technicianId]);

  const enqueueNote = useCallback(async (
    opportunityId: string,
    personId: string | null,
    title: string,
    body: string,
    taskId?: string
  ) => {
    if (taskId && isOnboardingDemoEntity({ id: taskId })) {
      return { success: true, queued: false };
    }

    const clientRequestId = newClientRequestId();

    if (isBrowserOnline()) {
      try {
        const result = await withSyncQueueLock(async () =>
          createOpportunityNoteAction(
            opportunityId,
            personId,
            title,
            body,
            taskId,
            clientRequestId
          )
        );
        if (!result.success) {
          if (isPermanentBusinessSyncError(result.error || '')) {
            return { success: false, queued: false, error: result.error };
          }
          throw new Error(result.error || 'Falha ao criar nota.');
        }
        await refreshCounts();
        return { success: true, queued: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isPermanentBusinessSyncError(message)) {
          return { success: false, queued: false, error: message };
        }
        console.warn("[SyncQueue] Falha direta na rede para nota, a colocar na fila offline...", error);
      }
    }

    const item: SyncQueueItem = {
      taskId: taskId || opportunityId,
      action: 'ADD_NOTE',
      payload: {
        opportunityId,
        personId,
        title,
        body,
        taskId,
        clientRequestId,
      },
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    await db.syncQueue.add(item);
    await refreshCounts();
    return { success: true, queued: true };
  }, [refreshCounts]);

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
    retryFailed,
    retryFailedItem,
    refreshCounts,
  };
}
