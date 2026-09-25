import { createOpportunityNote } from "@/lib/crm/notes";
import {
  updateOpportunityClientAvailability,
  updateOpportunityServiceAddress,
  updateOpportunityStage,
} from "@/lib/crm/opportunities";
import { triggerNotification } from "@/lib/crm/notifications";
import { createTechnicalVisit, type CreateTechnicalVisitInput } from "@/lib/crm/tasks";
import {
  CRM_TASK_STATUS,
  getNextStageOnSchedule,
  normalizeString,
} from "@/lib/crm/contract";

export interface ScheduleVisitCoreInput {
  title: string;
  dueAt: Date;
  notes?: string;
  assigneeId: string;
  technicianName: string;
  morada?: CreateTechnicalVisitInput["morada"];
  opportunityId: string;
  personId?: string;
  pointOfContactEmail?: string;
  clientName?: string;
  taskId?: string;
  currentStage: string;
  scheduledByName: string;
  scheduledByMemberId: string;
  notifyClient?: boolean;
  noteTitle?: string;
  routeStopLabel?: string;
  urgent?: boolean;
}

export interface ScheduleVisitCoreResult {
  taskId: string;
  dueAtIso: string;
}

export interface SchedulePlan {
  taskStatus: string;
  notifyClient: boolean;
  nextStage: string | null;
}

const URGENT_BODY_PREFIX =
  "URGENTE — agendado diretamente, sem confirmação do cliente.";

export function buildSchedulePlan(input: {
  urgent?: boolean;
  currentStage: string;
}): SchedulePlan {
  if (input.urgent) {
    const nextStage = getNextStageOnSchedule(input.currentStage);
    const currentNorm = normalizeString(input.currentStage);
    const nextNorm = normalizeString(nextStage);
    return {
      taskStatus: CRM_TASK_STATUS.AGENDADO,
      notifyClient: false,
      nextStage: nextNorm !== currentNorm ? nextStage : null,
    };
  }
  return {
    taskStatus: CRM_TASK_STATUS.POR_AGENDAR,
    notifyClient: true,
    nextStage: null,
  };
}

function formatAddress(morada?: CreateTechnicalVisitInput["morada"]): string {
  if (!morada) return "";
  return [
    morada.addressStreet1,
    morada.addressCity,
    morada.addressPostcode,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildTaskBody(
  notes?: string,
  routeStopLabel?: string,
  urgent?: boolean
): string {
  const base = (() => {
    const trimmed = notes?.trim();
    if (routeStopLabel && trimmed) {
      return `${routeStopLabel}\n\n${trimmed}`;
    }
    if (trimmed) return trimmed;
    if (routeStopLabel) return routeStopLabel;
    return "";
  })();

  if (!urgent) return base;
  return base ? `${URGENT_BODY_PREFIX}\n\n${base}` : URGENT_BODY_PREFIX;
}

/**
 * Shared scheduling pipeline: standard flow proposes visit (POR_AGENDAR) and notifies client;
 * urgent flow confirms immediately (AGENDADO) without n8n automations.
 */
export async function scheduleVisitCore(
  input: ScheduleVisitCoreInput
): Promise<ScheduleVisitCoreResult> {
  const {
    title,
    dueAt,
    notes,
    assigneeId,
    technicianName,
    morada,
    opportunityId,
    personId,
    pointOfContactEmail,
    clientName,
    taskId,
    currentStage,
    scheduledByName,
    scheduledByMemberId,
    noteTitle = "Scheduling Instructions",
    routeStopLabel,
    urgent = false,
  } = input;

  const plan = buildSchedulePlan({ urgent, currentStage });
  const notifyClient =
    plan.notifyClient && (input.notifyClient !== undefined ? input.notifyClient : true);

  const taskBody = buildTaskBody(notes, routeStopLabel, urgent);

  const task = await createTechnicalVisit({
    title,
    dueAt,
    body: taskBody,
    assigneeId,
    morada,
    opportunityId,
    personId,
    pointOfContactEmail,
    taskId,
    scheduledByName,
    scheduledByMemberId,
    technicianName,
    status: plan.taskStatus,
  });

  if (!task?.id) {
    throw new Error("Não foi possível criar a visita técnica no Twenty CRM.");
  }

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();

  await updateOpportunityClientAvailability(opportunityId, dueAtIso).catch((err) =>
    console.error("[scheduleVisitCore] client availability error:", err)
  );

  if (morada) {
    await updateOpportunityServiceAddress(opportunityId, morada).catch((err) =>
      console.error("[scheduleVisitCore] opportunity service address error:", err)
    );
  }

  if (plan.nextStage) {
    await updateOpportunityStage(opportunityId, plan.nextStage).catch((err) =>
      console.error("[scheduleVisitCore] stage advance error:", err)
    );
  }

  if (urgent) {
    await createOpportunityNote(
      opportunityId,
      personId || null,
      "Agendamento urgente",
      `Agendado diretamente por ${scheduledByName}, sem confirmação do cliente nem automações.`
    ).catch((err) => console.error("[scheduleVisitCore] urgent note error:", err));
  }

  if (notes?.trim()) {
    await createOpportunityNote(
      opportunityId,
      personId || null,
      noteTitle,
      notes.trim()
    ).catch((err) => console.error("[scheduleVisitCore] note error:", err));
  }

  if (notifyClient) {
    await triggerNotification("appointment_scheduled", {
      taskId: task.id,
      opportunityId,
      title,
      dueAt: dueAtIso,
      pointOfContactEmail,
      clientName: clientName || "Cliente",
      address: formatAddress(morada),
      technicianName,
      notes: notes?.trim() || undefined,
      scheduledBy: scheduledByName,
      routeStopLabel,
      pendingConfirmation: true,
      taskStatus: CRM_TASK_STATUS.POR_AGENDAR,
    }).catch((err) => console.error("[scheduleVisitCore] notification error:", err));
  }

  return { taskId: task.id, dueAtIso };
}
