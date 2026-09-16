import { useState, useEffect, useCallback, useRef } from 'react';
import { db, SyncQueueItem } from '@/lib/db';
import { updateTaskStatus, saveMeasurements } from '@/lib/crm';
import { createOpportunityNoteAction } from '@/actions/notes-actions';
import type { SyncFailedItem } from '@/lib/schemas/syncTelemetry';

const MAX_SYNC_RETRIES = 5;
const JITTER_MIN_MS = 50;
const JITTER_MAX_MS = 500;
const TELEMETRY_MIN_INTERVAL_MS = 30000;

export interface UseSyncQueueOptions {
  technicianId?: string;
  technicianName?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomJitter() {
  return Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;
}

export function useSyncQueue(options: UseSyncQueueOptions = {}) {
  const { technicianId, technicianName } = options;
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<number | null>(null);
  const syncingRef = useRef(false);
  const lastTelemetryAtRef = useRef(0);
  const lastTelemetryFailedRef = useRef(-1);
  const lastSyncSuccessRef = useRef<number | null>(null);

  const reportTelemetry = useCallback(async (pending: number, failed: number) => {
    if (!technicianId || typeof window === 'undefined') return;

    const now = Date.now();
    const shouldForce = failed > 0 && failed !== lastTelemetryFailedRef.current;
    if (!shouldForce && now - lastTelemetryAtRef.current < TELEMETRY_MIN_INTERVAL_MS) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId,
          technicianName: technicianName || 'Técnico',
          pendingCount: pending,
          failedCount: failed,
          isOnline: navigator.onLine,
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

  const processQueue = useCallback(async () => {
    if (syncingRef.current || typeof window === 'undefined' || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    let syncedAny = false;

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();

      if (pendingItems.length === 0) {
        await refreshCounts();
        return;
      }

      console.log(`[SyncQueue] A processar ${pendingItems.length} ação(ões) pendente(s)...`);

      for (const item of pendingItems) {
        await sleep(randomJitter());

        try {
          if (item.action === 'UPDATE_STATUS') {
            await updateTaskStatus(
              item.payload.taskId,
              item.payload.status,
              item.payload.reason,
              item.payload.photos || []
            );
          } else if (item.action === 'SAVE_MEASUREMENTS') {
            const result = await saveMeasurements(
              item.payload.taskId,
              item.payload.opportunityId,
              item.payload.data
            );
            if (!result.success) {
              throw new Error(result.error || 'Falha ao sincronizar medições.');
            }
          } else if (item.action === 'ADD_NOTE') {
            const noteResult = await createOpportunityNoteAction(
              item.payload.opportunityId,
              item.payload.personId || null,
              item.payload.title,
              item.payload.body
            );
            if (!noteResult.success) {
              throw new Error(noteResult.error || 'Falha ao sincronizar nota.');
            }
          }

          if (item.id) {
            await db.syncQueue.delete(item.id);
            syncedAny = true;
            console.log(`[SyncQueue] Ação ${item.id} sincronizada com sucesso com o CRM.`);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          const currentRetries = (item.retries || 0) + 1;
          const isFailed = currentRetries >= MAX_SYNC_RETRIES;

          console.error(`[SyncQueue] Falha ao sincronizar ação ${item.id} (tentativa ${currentRetries}/${MAX_SYNC_RETRIES}):`, error);

          if (item.id) {
            await db.syncQueue.update(item.id, {
              retries: currentRetries,
              lastError: message,
              status: isFailed ? 'failed' : 'pending',
            });
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
    }
  }, [refreshCounts]);

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
          });
        }
      }
      processQueue();
    } catch (e) {
      console.error("[SyncQueue] Erro ao reiniciar itens falhados:", e);
    }
  }, [processQueue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      refreshCounts();

      const handleOnline = () => {
        setIsOnline(true);
        processQueue();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (navigator.onLine) {
        processQueue();
      }

      const interval = setInterval(() => {
        if (navigator.onLine) {
          processQueue();
        } else {
          refreshCounts();
        }
      }, 60000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, [processQueue, refreshCounts]);

  const enqueueStatusUpdate = useCallback(async (
    taskId: string,
    status: string,
    reason: string,
    photos: string[],
    opportunityId?: string
  ) => {
    if (navigator.onLine) {
      try {
        await updateTaskStatus(taskId, status, reason, photos);
        await refreshCounts();
        return { success: true, queued: false };
      } catch (error) {
        console.warn("[SyncQueue] Falha direta na rede, a colocar na fila offline...", error);
      }
    }

    const item: SyncQueueItem = {
      taskId,
      action: 'UPDATE_STATUS',
      payload: { taskId, status, reason, photos, opportunityId },
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    const existing = await db.syncQueue
      .where('taskId').equals(taskId)
      .filter((i) => i.action === 'UPDATE_STATUS' && i.status === 'pending')
      .first();

    if (existing?.id) {
      item.id = existing.id;
      await db.syncQueue.put(item);
    } else {
      await db.syncQueue.add(item);
    }

    await refreshCounts();
    return { success: true, queued: true };
  }, [refreshCounts]);

  const enqueueMeasurementsSave = useCallback(async (
    taskId: string,
    opportunityId: string,
    data: unknown
  ) => {
    if (navigator.onLine) {
      try {
        const result = await saveMeasurements(taskId, opportunityId, data);
        if (!result.success) {
          throw new Error(result.error || 'Falha ao guardar medições.');
        }
        await refreshCounts();
        return { success: true, queued: false };
      } catch (error) {
        console.warn("[SyncQueue] Falha direta na rede para medições, a colocar na fila offline...", error);
      }
    }

    const item: SyncQueueItem = {
      taskId,
      action: 'SAVE_MEASUREMENTS',
      payload: { taskId, opportunityId, data },
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    const existing = await db.syncQueue
      .where('taskId').equals(taskId)
      .filter((i) => i.action === 'SAVE_MEASUREMENTS' && i.status === 'pending')
      .first();

    if (existing?.id) {
      item.id = existing.id;
      await db.syncQueue.put(item);
    } else {
      await db.syncQueue.add(item);
    }

    await refreshCounts();
    return { success: true, queued: true };
  }, [refreshCounts]);

  const enqueueNote = useCallback(async (
    opportunityId: string,
    personId: string | null,
    title: string,
    body: string
  ) => {
    if (navigator.onLine) {
      try {
        const result = await createOpportunityNoteAction(opportunityId, personId, title, body);
        if (!result.success) {
          throw new Error(result.error || 'Falha ao criar nota.');
        }
        await refreshCounts();
        return { success: true, queued: false };
      } catch (error) {
        console.warn("[SyncQueue] Falha direta na rede para nota, a colocar na fila offline...", error);
      }
    }

    const item: SyncQueueItem = {
      taskId: opportunityId,
      action: 'ADD_NOTE',
      payload: { opportunityId, personId, title, body },
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
    processQueue,
    retryFailed,
  };
}
