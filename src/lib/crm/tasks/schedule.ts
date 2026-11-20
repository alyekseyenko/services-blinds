import "server-only";
import { crmFetch, crmRestCreate } from "../client";
import { CRM_TASK_STATUS, clientAvailabilityForStatus, toTwentyTaskStatus } from "../contract";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import { isScheduleEndAfterStart } from "@/lib/visits/calendarVisitSpan";

export interface CreateTechnicalVisitInput {
  title: string;
  dueAt: Date | string;
  body?: string;
  assigneeId: string;
  morada?: {
    addressStreet1?: string;
    addressStreet2?: string;
    addressCity?: string;
    addressState?: string;
    addressPostcode?: string;
    addressCountry?: string;
    addressLat?: number | null;
    addressLng?: number | null;
  } | null;
  opportunityId?: string;
  personId?: string;
  pointOfContactEmail?: string;
  taskId?: string;
  scheduledByName?: string;
  scheduledByMemberId?: string;
  technicianName?: string;
  status?: string;
  /** When `null`, clears an existing CRM end time. When omitted, leaves unchanged. */
  horaDeFim?: Date | string | null;
}

function resolveHoraDeFimForCrm(
  dueAt: Date | string,
  horaDeFim: Date | string | null | undefined
): string | null | undefined {
  if (horaDeFim === undefined) return undefined;
  if (horaDeFim === null || horaDeFim === "") return null;
  const start = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const end = horaDeFim instanceof Date ? horaDeFim : new Date(horaDeFim);
  if (Number.isNaN(end.getTime()) || !isScheduleEndAfterStart(start, end)) return null;
  return end.toISOString();
}

function buildMoradaPayload(
  morada: CreateTechnicalVisitInput['morada']
): Record<string, unknown> | undefined {
  if (!morada) return undefined;

  return {
    addressStreet1: morada.addressStreet1 ?? '',
    addressStreet2: morada.addressStreet2 ?? '',
    addressCity: morada.addressCity ?? '',
    addressState: morada.addressState ?? '',
    addressPostcode: morada.addressPostcode ?? '',
    addressCountry: morada.addressCountry ?? 'Portugal',
    addressLat: morada.addressLat ?? null,
    addressLng: morada.addressLng ?? null,
  };
}

async function updateTechnicalVisitProposal(
  taskId: string,
  taskData: CreateTechnicalVisitInput
): Promise<{ id: string }> {
  const {
    title,
    dueAt,
    body,
    assigneeId,
    morada,
    technicianName = "",
    scheduledByName = "Admin",
    status = CRM_TASK_STATUS.POR_AGENDAR,
    horaDeFim,
  } = taskData;

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
  const horaDeFimIso = resolveHoraDeFimForCrm(dueAt, horaDeFim);
  const moradaDaReparacao = buildMoradaPayload(morada);
  const mutation = `
    mutation updateProposedVisit($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) {
        id
      }
    }
  `;

  const clientAvailability = clientAvailabilityForStatus(status);
  const result = await crmFetch<{ updateTask: { id: string } }>(mutation, {
    id: taskId,
    data: {
      title,
      dueAt: dueAtIso,
      bodyV2: { markdown: body ?? "" },
      status: toTwentyTaskStatus(status),
      assigneeId,
      technicianName,
      scheduledBy: scheduledByName,
      moradaDaReparacao,
      ...(clientAvailability ? { disponibilidadeDoCliente: clientAvailability } : {}),
      ...(horaDeFimIso !== undefined ? { horaDeFim: horaDeFimIso } : {}),
    },
  });

  return result.updateTask;
}

export async function createTechnicalVisit(taskData: CreateTechnicalVisitInput) {
  const { 
    title, dueAt, body, assigneeId, morada, opportunityId, 
    personId, 
    taskId,
    scheduledByName = "Admin",
    scheduledByMemberId,
    technicianName = "",
    status = CRM_TASK_STATUS.POR_AGENDAR,
    horaDeFim,
  } = taskData;

  if (!assigneeId) {
    throw new Error('Selecione um técnico válido do Twenty CRM para associar a visita.');
  }

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
  const horaDeFimIso = resolveHoraDeFimForCrm(dueAt, horaDeFim);
  const moradaDaReparacao = buildMoradaPayload(morada);
  const taskStatus = toTwentyTaskStatus(status);
  const isExistingTask = Boolean(taskId);

  let task: { id: string } | null = null;

  if (taskId) {
    task = await updateTechnicalVisitProposal(taskId, taskData);
  } else if (scheduledByMemberId && scheduledByName) {
    const clientAvailability = clientAvailabilityForStatus(status);
    task = await crmRestCreate<{ id: string }>('tasks', {
      title,
      dueAt: dueAtIso,
      bodyV2: { markdown: body ?? '' },
      status: taskStatus,
      assigneeId,
      technicianName,
      scheduledBy: scheduledByName,
      ...(horaDeFimIso != null ? { horaDeFim: horaDeFimIso } : {}),
      ...(clientAvailability ? { disponibilidadeDoCliente: clientAvailability } : {}),
      ...(moradaDaReparacao ? { moradaDaReparacao } : {}),
      createdBy: {
        source: 'MANUAL',
        name: scheduledByName,
        workspaceMemberId: scheduledByMemberId,
        context: {},
      },
    });
  } else {
    const mutation = `
      mutation createT($data: TaskCreateInput!) {
        createTask(data: $data) {
          id
          title
          assigneeId
        }
      }
    `;

    const clientAvailability = clientAvailabilityForStatus(status);
    const result = await crmFetch<{ createTask: { id: string } }>(mutation, {
      data: {
        title,
        dueAt: dueAtIso,
        bodyV2: { markdown: body },
        status: taskStatus,
        assigneeId,
        technicianName,
        scheduledBy: scheduledByName,
        moradaDaReparacao,
        ...(clientAvailability ? { disponibilidadeDoCliente: clientAvailability } : {}),
        ...(horaDeFimIso != null ? { horaDeFim: horaDeFimIso } : {}),
      },
    });
    task = result.createTask;
  }

  if (task && task.id && !isExistingTask) {
    const targetMutation = `
      mutation createTT($data: TaskTargetCreateInput!) {
        createTaskTarget(data: $data) {
          id
        }
      }
    `;

    const isDuplicateTargetError = (error: unknown): boolean => {
      const message = error instanceof Error ? error.message : String(error);
      return /duplicate entry|unique constraint/i.test(message);
    };

    const linkTarget = async (data: Record<string, string>) => {
      try {
        await crmFetch(targetMutation, { data });
      } catch (firstError) {
        if (isDuplicateTargetError(firstError)) {
          return;
        }
        console.warn("[createTechnicalVisit] createTaskTarget failed, retrying once...", firstError);
        try {
          await crmFetch(targetMutation, { data });
        } catch (retryError) {
          if (!isDuplicateTargetError(retryError)) {
            throw retryError;
          }
        }
      }
    };

    if (opportunityId) {
      await linkTarget({ taskId: task.id, targetOpportunityId: opportunityId });
    }
    if (personId) {
      await linkTarget({ taskId: task.id, targetPersonId: personId });
    }
  }

  await invalidateAdminCrmCache();
  return task;
}
