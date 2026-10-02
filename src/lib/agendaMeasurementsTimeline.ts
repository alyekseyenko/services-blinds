import type { AppTask } from "@/lib/crm/schemas";
import type { AgendaNotificationVisit } from "@/lib/agendaNotificationPayload";
import { bellTitleForTimeline } from "@/lib/agendaNotificationPayload";
import { appendTimelineEvent } from "@/lib/agendaVisitLifecycle";
import { db } from "@/lib/db";
import {
  agendaNotificationThreadKey,
  loadInAppNotifications,
  pushOrMergeAgendaInAppNotification,
} from "@/lib/inAppNotifications";
import { resolveServiceType } from "@/lib/techniciansConfig";

export function measurementsTimelineDetail(synced: boolean): string {
  return synced
    ? "Medições sincronizadas com o CRM."
    : "Medições guardadas — serão enviadas quando houver rede.";
}

async function visitHintFromLocalTask(taskId: string): Promise<AgendaNotificationVisit | undefined> {
  const local = await db.tasks.where("twentyId").equals(taskId).first();
  const task = local?.data as AppTask | undefined;
  if (!task) return undefined;

  const due =
    task.dueDate instanceof Date
      ? task.dueDate.toISOString()
      : typeof task.dueDate === "string"
        ? task.dueDate
        : undefined;

  const serviceType = resolveServiceType({
    serviceType: task.serviceType,
    stage: task.stage,
    title: task.title,
  });

  return {
    clientName: task.client?.trim() || undefined,
    visitTitle: task.title?.trim() || undefined,
    dueAtIso: due,
    serviceType: serviceType || undefined,
  };
}

/** Regista no sininho da agenda (técnico) que medições foram guardadas ou sincronizadas. */
export async function recordMeasurementsAgendaTimeline(
  scope: string,
  input: { taskId: string; opportunityId?: string; synced: boolean }
): Promise<void> {
  if (!scope || typeof window === "undefined") return;

  const taskId = input.taskId.trim();
  if (!taskId) return;

  const now = Date.now();
  const detail = measurementsTimelineDetail(input.synced);
  const threadKey = `task:${taskId}`;

  const loaded = loadInAppNotifications(scope);
  const existing = loaded.find(
    (n) => agendaNotificationThreadKey(n) === threadKey
  );

  let timeline = existing?.agendaTimeline ?? [];
  timeline = appendTimelineEvent(
    timeline,
    { kind: "medicoes_guardadas", detail },
    now
  );

  const visitHint = await visitHintFromLocalTask(taskId);
  const localTask = await db.tasks.where("twentyId").equals(taskId).first();
  const localOppId = (localTask?.data as AppTask | undefined)?.opportunityId;
  const visit: AgendaNotificationVisit = {
    ...existing?.visit,
    ...visitHint,
  };
  const opportunityId = input.opportunityId ?? existing?.opportunityId ?? localOppId;

  const title = bellTitleForTimeline(timeline);

  pushOrMergeAgendaInAppNotification(scope, {
    title,
    description: detail,
    taskId,
    dueAtIso: visit.dueAtIso ?? existing?.dueAtIso,
    opportunityId,
    taskStatus: existing?.taskStatus,
    agendaKind: existing?.agendaKind ?? "em_curso",
    visit,
    agendaTimeline: timeline,
    notificationKind: "agenda",
  });
}
