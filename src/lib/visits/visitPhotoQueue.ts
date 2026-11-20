import { uploadVisitPhotoAction } from "@/actions/visit-photo-actions";
import { db, type VisitPhotoQueueItem } from "@/lib/db";
import type { ActionErrorCode } from "@/lib/types/action-response";
import {
  isPermanentSyncFailure,
  isTransientSyncFailure,
  SYNC_MAX_BUSINESS_RETRIES,
  syncRetryBackoffMs,
} from "@/lib/sync/syncQueuePolicy";

export function newVisitPhotoClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function countVisitPhotoQueue(): Promise<{ pending: number; failed: number }> {
  const pending = await db.visitPhotoQueue.where("status").equals("pending").count();
  const failed = await db.visitPhotoQueue.where("status").equals("failed").count();
  return { pending, failed };
}

export async function uploadVisitPhotoQueueItem(item: VisitPhotoQueueItem): Promise<void> {
  const formData = new FormData();
  formData.set("taskId", item.taskId);
  formData.set("opportunityId", item.opportunityId);
  formData.set("clientRequestId", item.clientRequestId);
  formData.set("filename", item.filename);
  formData.set("file", item.blob, item.filename);

  const result = await uploadVisitPhotoAction(formData);
  if (!result.success) {
    const err = new Error(result.error || "Não foi possível guardar a foto.");
    if (result.errorCode) {
      (err as Error & { errorCode?: ActionErrorCode }).errorCode = result.errorCode;
    }
    throw err;
  }
}

export async function handleVisitPhotoQueueFailure(
  item: VisitPhotoQueueItem,
  message: string,
  errorCode?: ActionErrorCode
): Promise<void> {
  if (!item.id) return;

  if (isPermanentSyncFailure(message, errorCode)) {
    await db.visitPhotoQueue.update(item.id, {
      retries: (item.retries || 0) + 1,
      lastError: message,
      status: "failed",
    });
    return;
  }

  if (isTransientSyncFailure(message, errorCode)) {
    const attempts = (item.transientAttempts || 0) + 1;
    const backoff = syncRetryBackoffMs(attempts);
    await db.visitPhotoQueue.update(item.id, {
      retries: item.retries || 0,
      lastError: message,
      status: "pending",
      transientAttempts: attempts,
      nextRetryAt: Date.now() + backoff,
    });
    return;
  }

  const currentRetries = (item.retries || 0) + 1;
  const isFailed = currentRetries >= SYNC_MAX_BUSINESS_RETRIES;
  await db.visitPhotoQueue.update(item.id, {
    retries: currentRetries,
    lastError: message,
    status: isFailed ? "failed" : "pending",
    nextRetryAt: isFailed ? undefined : Date.now() + syncRetryBackoffMs(currentRetries),
  });
}