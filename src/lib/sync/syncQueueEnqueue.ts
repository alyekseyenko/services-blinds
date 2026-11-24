import { syncUpdateTaskStatusAction } from "@/actions/tasks-actions";
import { submitMeasurementsAction } from "@/actions/measurements-actions";
import { createOpportunityNoteAction } from "@/actions/notes-actions";
import { createVisitServiceAction } from "@/actions/visit-services-actions";
import { db, type SyncQueueItem } from "@/lib/db";
import { isBrowserOnline } from "@/lib/networkOnline";
import { isOnboardingDemoEntity } from "@/lib/demo/demoIds";
import { getNotificationScope } from "@/lib/inAppNotifications";
import {
  agendaDiffKindsForTaskStatusUpdate,
  markLocalAgendaChange,
} from "@/lib/agendaLocalChanges";
import { recordMeasurementsAgendaTimeline } from "@/lib/agendaMeasurementsTimeline";
import { isPermanentSyncFailure } from "@/lib/sync/syncQueuePolicy";
import { newClientRequestId, withSyncQueueLock } from "@/lib/sync/syncQueueRuntime";
import type { RepairPaymentNote } from "@/lib/visits/repairPayment";
import { resolveVisitArrivedAtMs } from "@/lib/visits/offlineStatusSync";

export type SyncQueueEnqueueContext = {
  technicianId?: string;
  refreshCounts: () => Promise<void>;
};

export async function enqueueStatusUpdateOp(
  ctx: SyncQueueEnqueueContext,
  taskId: string,
  status: string,
  reason: string,
  photos: string[],
  opportunityId?: string,
  paymentNotes?: RepairPaymentNote[]
): Promise<{ success: boolean; queued: boolean; error?: string }> {
  if (isOnboardingDemoEntity({ id: taskId })) {
    return { success: true, queued: false };
  }

  const notifyScope = ctx.technicianId ? getNotificationScope("technician", ctx.technicianId) : null;
  const statusKinds = agendaDiffKindsForTaskStatusUpdate(status);
  const markOwnAgendaChange = () => {
    if (!notifyScope || statusKinds.length === 0) return;
    markLocalAgendaChange(notifyScope, taskId, statusKinds);
    if (opportunityId) markLocalAgendaChange(notifyScope, opportunityId, statusKinds);
  };

  const clientRequestId = newClientRequestId();
  const buildPayload = (occurredAt: number, visitArrivedAt?: number) => ({
    taskId,
    status,
    reason,
    photos,
    opportunityId,
    clientRequestId,
    occurredAt,
    ...(paymentNotes?.length ? { paymentNotes } : {}),
    ...(visitArrivedAt !== undefined ? { visitArrivedAt } : {}),
  });
  const buildItem = (occurredAt: number, visitArrivedAt?: number): SyncQueueItem => ({
    taskId,
    action: "UPDATE_STATUS",
    payload: buildPayload(occurredAt, visitArrivedAt),
    timestamp: occurredAt,
    status: "pending",
    retries: 0,
  });

  if (isBrowserOnline()) {
    try {
      const direct = await withSyncQueueLock(async () =>
        syncUpdateTaskStatusAction(
          taskId,
          status,
          reason,
          photos,
          clientRequestId,
          undefined,
          undefined,
          paymentNotes
        )
      );
      if (!direct.success) {
        if (isPermanentSyncFailure(direct.error || "", direct.errorCode)) {
          return { success: false, queued: false, error: direct.error };
        }
        throw new Error(direct.error || "Falha ao atualizar o estado da visita.");
      }
      markOwnAgendaChange();
      await ctx.refreshCounts();
      return { success: true, queued: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isPermanentSyncFailure(message)) {
        return { success: false, queued: false, error: message };
      }
      console.warn("[SyncQueue] Falha direta na rede, a colocar na fila offline...", error);
    }
  }

  const existing = await db.syncQueue
    .where("taskId")
    .equals(taskId)
    .filter((i) => i.action === "UPDATE_STATUS" && i.status === "pending")
    .first();

  const occurredAt = Date.now();
  const visitArrivedAt = resolveVisitArrivedAtMs(
    existing?.payload as Record<string, unknown> | undefined,
    status,
    occurredAt
  );

  if (existing?.id) {
    await db.syncQueue.delete(existing.id);
  }
  await db.syncQueue.add(buildItem(occurredAt, visitArrivedAt));
  markOwnAgendaChange();

  await ctx.refreshCounts();
  return { success: true, queued: true };
}

export async function enqueueMeasurementsSaveOp(
  ctx: SyncQueueEnqueueContext,
  taskId: string,
  opportunityId: string,
  data: unknown
): Promise<{ success: boolean; queued: boolean; error?: string }> {
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
        if (isPermanentSyncFailure(result.error || "")) {
          return { success: false, queued: false, error: result.error };
        }
        throw new Error(result.error || "Falha ao guardar medições.");
      }
      await ctx.refreshCounts();
      if (ctx.technicianId) {
        const scope = getNotificationScope("technician", ctx.technicianId);
        void recordMeasurementsAgendaTimeline(scope, {
          taskId,
          opportunityId,
          synced: true,
        });
      }
      return { success: true, queued: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isPermanentSyncFailure(message)) {
        return { success: false, queued: false, error: message };
      }
      console.warn("[SyncQueue] Falha direta na rede para medições, a colocar na fila offline...", error);
    }
  }

  const item: SyncQueueItem = {
    taskId,
    action: "SAVE_MEASUREMENTS",
    payload: { taskId, opportunityId, data, clientRequestId },
    timestamp: Date.now(),
    status: "pending",
    retries: 0,
  };

  const existing = await db.syncQueue
    .where("taskId")
    .equals(taskId)
    .filter(
      (i) =>
        i.action === "SAVE_MEASUREMENTS" &&
        i.status === "pending" &&
        String(i.payload?.opportunityId ?? "") === opportunityId
    )
    .first();

  if (existing?.id) {
    await db.syncQueue.delete(existing.id);
  }
  await db.syncQueue.add(item);

  await ctx.refreshCounts();
  if (ctx.technicianId) {
    const scope = getNotificationScope("technician", ctx.technicianId);
    void recordMeasurementsAgendaTimeline(scope, {
      taskId,
      opportunityId,
      synced: false,
    });
  }
  return { success: true, queued: true };
}

export async function enqueueVisitServiceOp(
  ctx: SyncQueueEnqueueContext,
  payload: Record<string, unknown>
): Promise<{ success: boolean; queued: boolean; error?: string; opportunityId?: string }> {
  const taskId = String(payload.taskId || "");
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
      const result = await withSyncQueueLock(async () => createVisitServiceAction(enrichedPayload));
      if (!result.success) {
        if (isPermanentSyncFailure(result.error || "")) {
          return { success: false, queued: false, error: result.error };
        }
        throw new Error(result.error || "Falha ao criar o serviço no local.");
      }
      if (ctx.technicianId) {
        const scope = getNotificationScope("technician", ctx.technicianId);
        const kinds = ["nova", "servico_extra"] as const;
        markLocalAgendaChange(scope, taskId, [...kinds]);
        const oppId = result.data?.opportunityId;
        if (oppId) markLocalAgendaChange(scope, oppId, [...kinds]);
      }
      await ctx.refreshCounts();
      return { success: true, queued: false, opportunityId: result.data?.opportunityId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isPermanentSyncFailure(message)) {
        return { success: false, queued: false, error: message };
      }
      console.warn("[SyncQueue] On-site service failed online, queueing offline...", error);
    }
  }

  const item: SyncQueueItem = {
    taskId,
    action: "CREATE_VISIT_SERVICE",
    payload: enrichedPayload,
    timestamp: Date.now(),
    status: "pending",
    retries: 0,
  };

  const existing = await db.syncQueue
    .where("taskId")
    .equals(taskId)
    .filter(
      (i) =>
        i.action === "CREATE_VISIT_SERVICE" &&
        i.status === "pending" &&
        i.payload?.clientRequestId === clientRequestId
    )
    .first();

  if (existing?.id) {
    await db.syncQueue.delete(existing.id);
  }
  await db.syncQueue.add(item);
  if (ctx.technicianId) {
    const kinds = ["nova", "servico_extra"] as const;
    markLocalAgendaChange(getNotificationScope("technician", ctx.technicianId), taskId, [...kinds]);
  }

  await ctx.refreshCounts();
  return { success: true, queued: true };
}

export async function enqueueNoteOp(
  ctx: SyncQueueEnqueueContext,
  opportunityId: string,
  personId: string | null,
  title: string,
  body: string,
  taskId?: string
): Promise<{ success: boolean; queued: boolean; error?: string }> {
  if (taskId && isOnboardingDemoEntity({ id: taskId })) {
    return { success: true, queued: false };
  }

  const clientRequestId = newClientRequestId();

  if (isBrowserOnline()) {
    try {
      const result = await withSyncQueueLock(async () =>
        createOpportunityNoteAction(opportunityId, personId, title, body, taskId, clientRequestId)
      );
      if (!result.success) {
        if (isPermanentSyncFailure(result.error || "")) {
          return { success: false, queued: false, error: result.error };
        }
        throw new Error(result.error || "Falha ao criar nota.");
      }
      await ctx.refreshCounts();
      return { success: true, queued: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isPermanentSyncFailure(message)) {
        return { success: false, queued: false, error: message };
      }
      console.warn("[SyncQueue] Falha direta na rede para nota, a colocar na fila offline...", error);
    }
  }

  const item: SyncQueueItem = {
    taskId: taskId || opportunityId,
    action: "ADD_NOTE",
    payload: {
      opportunityId,
      personId,
      title,
      body,
      taskId,
      clientRequestId,
    },
    timestamp: Date.now(),
    status: "pending",
    retries: 0,
  };

  await db.syncQueue.add(item);
  await ctx.refreshCounts();
  return { success: true, queued: true };
}