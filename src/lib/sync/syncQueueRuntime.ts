import { syncUpdateTaskStatusAction } from "@/actions/tasks-actions";
import { submitMeasurementsAction } from "@/actions/measurements-actions";
import { createOpportunityNoteAction } from "@/actions/notes-actions";
import { createVisitServiceAction } from "@/actions/visit-services-actions";
import type { SyncQueueItem } from "@/lib/db";
import { isBrowserOnline } from "@/lib/networkOnline";
import type { SyncFailedItem } from "@/lib/schemas/syncTelemetry";
import type { ActionErrorCode } from "@/lib/types/action-response";

export const JITTER_MIN_MS = 50;
export const JITTER_MAX_MS = 500;
export const TELEMETRY_MIN_INTERVAL_MS = 30000;
export const SYNC_LOCK_NAME = "fieldops-sync-queue";
export const SERVER_ACTION_TIMEOUT_MS = 30_000;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomJitter() {
  return Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;
}

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function withSyncQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    let executedInLock = false;
    try {
      return await navigator.locks.request(SYNC_LOCK_NAME, { mode: "exclusive" }, async () => {
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

export function withServerActionTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), SERVER_ACTION_TIMEOUT_MS);
    }),
  ]);
}

export function getNextRetryAt(item: SyncQueueItem): number | undefined {
  const value = item.payload?.nextRetryAt;
  return typeof value === "number" ? value : undefined;
}

export function getTransientAttempts(item: SyncQueueItem): number {
  const value = item.payload?.transientAttempts;
  return typeof value === "number" ? value : 0;
}

export async function dispatchSyncQueueAction(item: SyncQueueItem): Promise<void> {
  const clientRequestId =
    typeof item.payload?.clientRequestId === "string" ? item.payload.clientRequestId : undefined;

  if (item.action === "UPDATE_STATUS") {
    const visitArrivedAt =
      typeof item.payload.visitArrivedAt === "number" ? item.payload.visitArrivedAt : undefined;
    const statusResult = await withServerActionTimeout(
      syncUpdateTaskStatusAction(
        item.payload.taskId,
        item.payload.status,
        item.payload.reason,
        item.payload.photos || [],
        clientRequestId,
        item.timestamp,
        visitArrivedAt,
        Array.isArray(item.payload.paymentNotes) ? item.payload.paymentNotes : undefined
      )
    );
    if (!statusResult.success) {
      const err = new Error(statusResult.error || "Falha ao sincronizar o estado da visita.");
      if (statusResult.errorCode) {
        (err as Error & { errorCode?: ActionErrorCode }).errorCode = statusResult.errorCode;
      }
      throw err;
    }
    return;
  }

  if (item.action === "SAVE_MEASUREMENTS") {
    const result = await withServerActionTimeout(
      submitMeasurementsAction(
        item.payload.taskId,
        item.payload.opportunityId,
        item.payload.data,
        clientRequestId
      )
    );
    if (!result.success) {
      throw new Error(result.error || "Falha ao sincronizar medições.");
    }
    return;
  }

  if (item.action === "ADD_NOTE") {
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
      throw new Error(noteResult.error || "Falha ao sincronizar nota.");
    }
    return;
  }

  if (item.action === "CREATE_VISIT_SERVICE") {
    const visitResult = await withServerActionTimeout(createVisitServiceAction(item.payload));
    if (!visitResult.success) {
      throw new Error(visitResult.error || "Falha ao sincronizar o serviço no local.");
    }
  }
}

export type SendSyncTelemetryInput = {
  technicianId: string;
  technicianName: string;
  pendingCount: number;
  failedCount: number;
  lastSyncSuccess: number | null;
  failedItems: SyncFailedItem[];
};

export async function sendSyncTelemetry(input: SendSyncTelemetryInput): Promise<void> {
  try {
    await fetch("/api/sync-telemetry", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technicianId: input.technicianId,
        technicianName: input.technicianName,
        pendingCount: input.pendingCount,
        failedCount: input.failedCount,
        isOnline: isBrowserOnline(),
        lastSyncSuccess: input.lastSyncSuccess,
        failedItems: input.failedItems,
      }),
    });
  } catch {
    // Telemetria não deve bloquear o técnico
  }
}