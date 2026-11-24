import { db, type SyncQueueItem, type VisitPhotoQueueItem } from "@/lib/db";
import { isBrowserOnline } from "@/lib/networkOnline";
import {
  isPermanentSyncFailure,
  isTransientSyncFailure,
  isSessionExpiredSyncError,
  syncRetryBackoffMs,
  SYNC_MAX_BUSINESS_RETRIES,
  FIELDOPS_STALE_CLIENT_EVENT,
} from "@/lib/sync/syncQueuePolicy";
import { getTransientAttempts } from "@/lib/sync/syncQueueRuntime";
import type { ActionErrorCode } from "@/lib/types/action-response";
import {
  handleVisitPhotoQueueFailure,
  uploadVisitPhotoQueueItem,
} from "@/lib/visits/visitPhotoQueue";
import { isStaleServerActionError, STALE_CLIENT_USER_MESSAGE } from "@/lib/staleClientError";

export type SyncQueueFailureDeps = {
  onStaleClient: () => void;
  onSessionExpired: (message: string) => void;
  onPermanentFailure: (message: string) => void;
};

export async function applySyncQueueItemFailure(
  item: SyncQueueItem,
  message: string,
  errorCode: ActionErrorCode | undefined,
  deps: SyncQueueFailureDeps
): Promise<void> {
  if (!item.id) return;

  if (isStaleServerActionError(message)) {
    deps.onStaleClient();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(FIELDOPS_STALE_CLIENT_EVENT));
    }
    await db.syncQueue.update(item.id, {
      lastError: message,
      status: "pending",
    });
    return;
  }

  if (isSessionExpiredSyncError(message)) {
    deps.onSessionExpired("Sessão expirada — inicie sessão para sincronizar.");
    await db.syncQueue.update(item.id, {
      lastError: message,
      status: "pending",
    });
    return;
  }

  if (isPermanentSyncFailure(message, errorCode)) {
    await db.syncQueue.update(item.id, {
      retries: (item.retries || 0) + 1,
      lastError: message,
      status: "failed",
    });
    deps.onPermanentFailure(message);
    return;
  }

  if (isTransientSyncFailure(message, errorCode)) {
    const attempts = getTransientAttempts(item) + 1;
    const backoff = syncRetryBackoffMs(attempts);
    await db.syncQueue.update(item.id, {
      retries: item.retries || 0,
      lastError: message,
      status: "pending",
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
    status: isFailed ? "failed" : "pending",
    payload: {
      ...item.payload,
      nextRetryAt: isFailed ? undefined : Date.now() + syncRetryBackoffMs(currentRetries),
    },
  });
  if (isFailed) {
    deps.onPermanentFailure(message);
  }
}

export { STALE_CLIENT_USER_MESSAGE };

export async function resetAllFailedQueueItems(): Promise<void> {
  const failedItems = await db.syncQueue.where("status").equals("failed").toArray();
  for (const item of failedItems) {
    if (item.id) {
      await db.syncQueue.update(item.id, {
        status: "pending",
        retries: 0,
        lastError: undefined,
        payload: { ...item.payload, nextRetryAt: undefined },
      });
    }
  }
  const failedPhotos = await db.visitPhotoQueue.where("status").equals("failed").toArray();
  for (const photo of failedPhotos) {
    if (photo.id) {
      await db.visitPhotoQueue.update(photo.id, {
        status: "pending",
        retries: 0,
        lastError: undefined,
        nextRetryAt: undefined,
        transientAttempts: 0,
      });
    }
  }
}

export async function resetSingleFailedQueueItem(itemId: number): Promise<boolean> {
  const row = await db.syncQueue.get(itemId);
  if (!row) return false;
  await db.syncQueue.update(itemId, {
    status: "pending",
    retries: 0,
    lastError: undefined,
    payload: { ...row.payload, nextRetryAt: undefined, transientAttempts: 0 },
  });
  return true;
}

export async function drainVisitPhotoQueue(): Promise<boolean> {
  const pendingPhotos = await db.visitPhotoQueue.where("status").equals("pending").toArray();
  pendingPhotos.sort((a, b) => a.capturedAt - b.capturedAt);
  let syncedAny = false;

  for (const item of pendingPhotos) {
    if (!isBrowserOnline()) break;
    if (item.nextRetryAt && Date.now() < item.nextRetryAt) continue;

    try {
      await uploadVisitPhotoQueueItem(item);
      if (item.id) {
        await db.visitPhotoQueue.delete(item.id);
        syncedAny = true;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      const errorCode =
        error instanceof Error ? (error as Error & { errorCode?: ActionErrorCode }).errorCode : undefined;
      console.error("[VisitPhotoQueue] Falha ao enviar foto:", error);
      await handleVisitPhotoQueueFailure(item as VisitPhotoQueueItem, message, errorCode);
    }
  }
  if (syncedAny && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fieldops:visit-photo-queue-drained"));
  }
  return syncedAny;
}