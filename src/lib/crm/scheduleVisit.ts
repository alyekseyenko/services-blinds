import { createOpportunityNote } from "@/lib/crm/notes";
import {
  updateOpportunityClientAvailability,
  updateOpportunityServiceAddress,
} from "@/lib/crm/opportunities";
import {
  applyOpportunityStageTransition,
  OpportunityStageConflictError,
} from "@/lib/crm/pipelineTransitions";
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
  warnings?: string[];
}

export interface SchedulePlan {
  taskStatus: string;
  notifyClient: boolean;
  nextStage: string | null;
}

const URGENT_BODY_PREFIX =
  "URGENTE — agendado diretamente, sem confirmação do cliente.";

/** When true, admin scheduling uses POR_AGENDAR + n8n client confirmation (legacy). */
export function isClientConfirmationSchedulingEnabled(): boolean {
  return process.env.SCHEDULING_CLIENT_CONFIRMATION_ENABLED === "true";
}

function buildDirectSchedulePlan(currentStage: string): SchedulePlan {
  const nextStage = getNextStageOnSchedule(currentStage);
  const currentNorm = normalizeString(currentStage);
  const nextNorm = normalizeString(nextStage);
  return {
    taskStatus: CRM_TASK_STATUS.AGENDADO,
    notifyClient: false,
    nextStage: nextNorm !== currentNorm ? nextStage : null,
  };
}

export function buildSchedulePlan(input: {
  urgent?: boolean;
  currentStage: string;
}): SchedulePlan {
  const useLegacyConfirmation =
    isClientConfirmationSchedulingEnabled() && !input.urgent;

  if (!useLegacyConfirmation) {
    return buildDirectSchedulePlan(input.currentStage);
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
 * Shared scheduling pipeline: by default confirms immediately (AGENDADO) without n8n.
 * Legacy client-confirmation flow (POR_AGENDAR + appointment_scheduled webhook) only when
 * SCHEDULING_CLIENT_CONFIRMATION_ENABLED=true and not urgent.
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
    noteTitle = "Instruções de agendamento",
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

  if (plan.nextStage) {
    const stageResult = await applyOpportunityStageTransition(
      opportunityId,
      plan.nextStage,
      "schedule_visit",
      { currentStage: currentStage }
    );
    if (stageResult.status === "conflict") {
      throw new OpportunityStageConflictError(stageResult);
    }
  }

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
  const warnings: string[] = [];

  try {
    await updateOpportunityClientAvailability(opportunityId, dueAtIso);
  } catch (err) {
    console.error("[scheduleVisitCore] client availability error:", err);
    warnings.push("Não foi possível atualizar a disponibilidade do cliente no CRM.");
  }

  if (morada) {
    try {
      await updateOpportunityServiceAddress(opportunityId, morada);
    } catch (err) {
      console.error("[scheduleVisitCore] opportunity service address error:", err);
      warnings.push("Não foi possível atualizar a morada no CRM.");
    }
  }

  if (urgent) {
    try {
      await createOpportunityNote(
        opportunityId,
        personId || null,
        "Agendamento urgente",
        `Agendado diretamente por ${scheduledByName}, sem confirmação do cliente nem automações.`
      );
    } catch (err) {
      console.error("[scheduleVisitCore] urgent note error:", err);
      warnings.push("Não foi possível criar a nota de urgência no CRM.");
    }
  }

  if (notes?.trim()) {
    try {
      await createOpportunityNote(opportunityId, personId || null, noteTitle, notes.trim());
    } catch (err) {
      console.error("[scheduleVisitCore] note error:", err);
      warnings.push("Não foi possível guardar as instruções de agendamento no CRM.");
    }
  }

  if (notifyClient) {
    try {
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
      });
    } catch (err) {
      console.error("[scheduleVisitCore] notification error:", err);
      warnings.push("Não foi possível enviar a notificação de agendamento ao cliente.");
    }
  }

  return { taskId: task.id, dueAtIso, warnings: warnings.length ? warnings : undefined };
}
