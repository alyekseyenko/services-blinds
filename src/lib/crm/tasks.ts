"use server";
import { crmFetch, crmRestCreate } from './client';
import { CRMTaskSchema, AppTask } from './schemas';
import { z } from 'zod';
import { isTaskOverdue } from "@/lib/taskUtils";
import {
  CRM_STAGES,
  CRM_TASK_STATUS,
  STAGE_GROUPS,
  normalizeString,
  normalizeTaskStatus,
  toTwentyTaskStatus,
  isTaskCompleted,
  isTaskCancelled,
  isTaskActive,
  classifyOpportunityWorkflow,
  deriveWorkflowMarkerKey,
  getCompletionStageForWorkflow,
  getFallbackStageOnIncompleteWorkflow,
  isAssistanceService,
  isInstallationService,
  isMeasurementService,
} from './contract';
import { invalidateAdminCrmCache } from '@/lib/crmCache';
import { extractPhonesFromTwenty, getPrimaryPhone } from './phones';

const PHONES_FIELDS = `
  primaryPhoneNumber
  primaryPhoneCallingCode
  additionalPhones {
    number
    callingCode
    countryCode
  }
`;

const TECHNICIAN_TASK_FETCH_LIMIT = 150;

const TASK_NODE_FIELDS = `
  id
  title
  status
  dueAt
  assigneeId
  scheduledBy
  technicianName
  bodyV2 { markdown }
  moradaDaReparacao {
    addressStreet1
    addressCity
    addressLat
    addressLng
  }
  taskTargets {
    edges {
      node {
        targetPerson {
          name {
            firstName
            lastName
          }
          phones {
            ${PHONES_FIELDS}
          }
        }
        targetOpportunity {
          id
          nsi
          stage
          notasImportantes { markdown }
          pointOfContact {
            phones {
              ${PHONES_FIELDS}
            }
          }
          moradaDeServico {
            addressStreet1
            addressCity
            addressLat
            addressLng
          }
        }
      }
    }
  }
`;

async function fetchTasksByAssigneeId(assigneeId: string) {
  const query = `
    query getTasksByAssignee($assigneeId: UUID!) {
      tasks(
        filter: { assigneeId: { eq: $assigneeId } }
        orderBy: { dueAt: AscNullsLast }
        first: ${TECHNICIAN_TASK_FETCH_LIMIT}
      ) {
        edges {
          node {
            ${TASK_NODE_FIELDS}
          }
        }
      }
    }
  `;

  const data = await crmFetch<{ tasks: { edges: Array<{ node: any }> } }>(
    query,
    { assigneeId },
    { timeoutMs: 8000, maxRetries: 1 }
  );
  return data.tasks.edges.map((edge) => edge.node);
}

function mapTaskNode(node: any): AppTask {
  const edges = node.taskTargets?.edges || [];
  const oppTarget = edges.find((e: any) => e.node?.targetOpportunity)?.node?.targetOpportunity;
  const personTarget = edges.find((e: any) => e.node?.targetPerson)?.node?.targetPerson;
  const personPhones = extractPhonesFromTwenty(personTarget?.phones);
  const clientPhones =
    personPhones.length > 0
      ? personPhones
      : extractPhonesFromTwenty(oppTarget?.pointOfContact?.phones);
  const clientPhone = getPrimaryPhone(clientPhones);

  return {
    id: node.id,
    twentyId: node.id,
    title: node.title,
    status: node.status,
    dueDate: new Date(node.dueAt),
    address: [
      oppTarget?.moradaDeServico?.addressStreet1 || node.moradaDaReparacao?.addressStreet1,
      oppTarget?.moradaDeServico?.addressCity || node.moradaDaReparacao?.addressCity,
    ]
      .filter(Boolean)
      .join(', ') || 'Endereço não especificado',
    coordinates:
      oppTarget?.moradaDeServico?.addressLat && oppTarget?.moradaDeServico?.addressLng
        ? [oppTarget.moradaDeServico.addressLat, oppTarget.moradaDeServico.addressLng]
        : node.moradaDaReparacao?.addressLat
          ? [node.moradaDaReparacao.addressLat, node.moradaDaReparacao.addressLng]
          : null,
    client: personTarget
      ? `${personTarget.name?.firstName || ''} ${personTarget.name?.lastName || ''}`.trim() || 'Cliente'
      : 'Cliente',
    report: node.bodyV2?.markdown || oppTarget?.notasImportantes?.markdown || '',
    opportunityId: oppTarget?.id,
    nsi: oppTarget?.nsi || 'N/A',
    stage: oppTarget?.stage,
    serviceType: deriveWorkflowMarkerKey(oppTarget?.stage, node.title),
    scheduledBy: node.scheduledBy || 'Admin',
    assigneeId: node.assigneeId ?? null,
    technicianName: node.technicianName ?? null,
    clientPhone,
    clientPhones,
    isOverdue: isTaskOverdue(node.status, node.dueAt),
  };
}

export async function getTaskStatusForPublicPortal(taskId: string): Promise<string | null> {
  const data = await crmFetch<{
    tasks: { edges: Array<{ node: { status?: string | null } }> };
  }>(
    `query GetTaskStatus($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges { node { status } }
      }
    }`,
    { id: taskId }
  );

  return data.tasks.edges[0]?.node?.status ?? null;
}

export async function getTaskAssigneeId(taskId: string): Promise<string | null> {
  const data = await crmFetch<{
    tasks: { edges: Array<{ node: { assigneeId?: string | null } }> };
  }>(
    `query GetTaskAssignee($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges { node { assigneeId } }
      }
    }`,
    { id: taskId }
  );

  return data.tasks.edges[0]?.node?.assigneeId ?? null;
}

export async function fetchTechnicianTasks(technicianId: string): Promise<AppTask[]> {
  if (!technicianId) return [];

  const assignedTasks = await fetchTasksByAssigneeId(technicianId);

  return assignedTasks
    .filter((node) => {
      // Only hide obsolete tasks from the active agenda — keep terminal tasks for history.
      if (!isTaskActive(node.status)) return true;

      const edges = node.taskTargets?.edges || [];
      const opp = edges.find((e: any) => e.node?.targetOpportunity)?.node?.targetOpportunity;
      if (opp) {
        const stageNorm = normalizeString(opp.stage);
        const isInstallationTask = isInstallationService(opp.stage, node.title);
        const isMeasurementTask = !isInstallationTask && isMeasurementService(opp.stage, node.title);
        const isAssistanceTask = isAssistanceService(opp.stage, node.title);

        if (isMeasurementTask) {
          if (STAGE_GROUPS.OBSOLETE_AFTER_MEASUREMENT.includes(stageNorm)) {
            console.log(`[Filter] Omitindo tarefa de medição antiga ${node.id} (${node.title}) pois a Oportunidade avançou para ${opp.stage}`);
            return false;
          }
        }

        if (isInstallationTask) {
          if (STAGE_GROUPS.OBSOLETE_AFTER_INSTALLATION.includes(stageNorm)) {
            console.log(`[Filter] Omitindo tarefa de instalação concluída ${node.id} (${node.title}) pois a Oportunidade está no estágio ${opp.stage}`);
            return false;
          }
        }

        if (isAssistanceTask) {
          if (STAGE_GROUPS.OBSOLETE_AFTER_ASSISTANCE.includes(stageNorm)) {
            console.log(`[Filter] Omitindo tarefa de assistência concluída ${node.id} (${node.title}) pois a Oportunidade está no estágio ${opp.stage}`);
            return false;
          }
        }
      }

      return true;
    })
    .map(mapTaskNode);
}

export async function updateTaskStatus(taskId: string, status: string, observations?: string, photos: string[] = []): Promise<any> {
  const apiStatus = normalizeTaskStatus(status);
  const twentyStatus = toTwentyTaskStatus(status);
  
  // 1. Update Task in CRM
  const mutation = `
    mutation updateT($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) {
        id
        title
        status
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                nsi
                name
                stage
                pointOfContact {
                  emails {
                    primaryEmail
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await crmFetch<any>(mutation, {
    id: taskId,
    data: {
      status: twentyStatus,
      bodyV2: observations ? { markdown: observations } : undefined
    }
  });

  const updatedTask = result.updateTask;
  if (!updatedTask) return { id: taskId, success: false };

  const target = updatedTask.taskTargets?.edges[0]?.node;
  const oppId = target?.targetOpportunityId;

  // 1.1 Se temos o ID da oportunidade, obter dados atualizados da oportunidade no Twenty CRM
  let oppData: any = null;
  if (oppId) {
    try {
      const oppQuery = `
        query getOppForTask($id: UUID!) {
          opportunities(filter: { id: { eq: $id } }) {
            edges {
              node {
                id
                name
                nsi
                stage
                pointOfContact {
                  id
                  emails {
                    primaryEmail
                  }
                }
              }
            }
          }
        }
      `;
      const oppRes = await crmFetch<any>(oppQuery, { id: oppId });
      oppData = oppRes?.opportunities?.edges?.[0]?.node || null;
    } catch (e) {
      console.warn('[updateTaskStatus] Could not fetch parent opportunity:', e);
    }
  }

  const opp = oppData;
  const clientEmail = opp?.pointOfContact?.emails?.primaryEmail;
  const personId = opp?.pointOfContact?.id;

  // 2. Orchestrate Notifications and Reports (Side Effects)
  const { triggerNotification } = await import('./notifications');

  if (status === "Cancelado" || status === "Incompleto") {
    await triggerNotification('technician_report', {
      taskId,
      status: apiStatus,
      observations,
      title: updatedTask.title,
      pointOfContactEmail: clientEmail
    });
  }

  if (status === "Concluído" || status === "Incompleto") {
    if (status === "Concluído") {
      await triggerNotification('service_completed', {
        taskId,
        opportunityId: oppId,
        title: updatedTask.title,
        pointOfContactEmail: clientEmail
      });
    }

    // Trigger Full Service Report (Google Drive via n8n)
    try {
      const { serverTriggerServiceReport } = await import('../notificationAction');
      await serverTriggerServiceReport({
        taskId,
        opportunityId: oppId,
        status: apiStatus,
        observations,
        photos,
        nsi: opp?.nsi || 'NSI',
        clientName: opp?.name || 'Cliente',
        serviceType: deriveWorkflowMarkerKey(opp?.stage, updatedTask.title),
        taskTitle: updatedTask.title
      });
    } catch (e) {
      console.warn('Failed to trigger service report:', e);
    }
  }

  // 3. Criar uma nota nativa no CRM se houver observações/relatório do técnico para manter o histórico centralizado
  if (oppId && observations && observations.trim()) {
    try {
      const { createOpportunityNote } = await import('./notes');
      const noteTitle = `Relatório Técnico (${status})`;
      await createOpportunityNote(
        oppId,
        personId || null,
        noteTitle,
        observations
      );
    } catch (noteErr) {
      console.warn('Failed to automatically create CRM Note for technician report:', noteErr);
    }
  }

  // 4. Transições de Etapa Resilientes da Oportunidade
  // EM CURSO: apenas regista chegada — NÃO move pipeline, NÃO dispara relatório final.
  if (oppId && apiStatus !== CRM_TASK_STATUS.EM_CURSO) {
    try {
      const { updateOpportunityStage } = await import('./opportunities');
      const workflow = classifyOpportunityWorkflow(opp?.stage, updatedTask.title);
      const completionStage = getCompletionStageForWorkflow(workflow);

      if (apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE) {
        if (completionStage) {
          console.log(`[CRM Transition] Oportunidade ${oppId} avançada para ${completionStage} (${workflow})`);
          await updateOpportunityStage(oppId, completionStage);
        }
      } else if (apiStatus === CRM_TASK_STATUS.INCOMPLETO || apiStatus === CRM_TASK_STATUS.CANCELADO) {
        const fallbackStage = getFallbackStageOnIncompleteWorkflow(workflow);
        await updateOpportunityStage(oppId, fallbackStage);
      }
    } catch (stageErr) {
      console.warn('Failed to auto-update opportunity stage on task status change:', stageErr);
    }
  }

  await invalidateAdminCrmCache();
  return updatedTask;
}

export async function updateTaskCoordinates(taskId: string, lat: number, lng: number) {
  const mutation = `
    mutation updateTaskCoords($id: UUID!, $moradaDaReparacao: AddressObjectInput!) {
      updateTask(id: $id, data: { moradaDaReparacao: $moradaDaReparacao }) {
        id
        moradaDaReparacao {
          addressLat
          addressLng
        }
      }
    }
  `;
  return await crmFetch(mutation, {
    id: taskId,
    moradaDaReparacao: { addressLat: lat, addressLng: lng }
  });
}

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

export async function createTechnicalVisit(taskData: CreateTechnicalVisitInput) {
  const { 
    title, dueAt, body, assigneeId, morada, opportunityId, 
    personId, 
    scheduledByName = "Admin",
    scheduledByMemberId,
    technicianName = "" 
  } = taskData;

  if (!assigneeId) {
    throw new Error('Selecione um técnico válido do Twenty CRM para associar a visita.');
  }

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
  const moradaDaReparacao = buildMoradaPayload(morada);

  let task: { id: string } | null = null;

  if (scheduledByMemberId && scheduledByName) {
    task = await crmRestCreate<{ id: string }>('tasks', {
      title,
      dueAt: dueAtIso,
      bodyV2: { markdown: body ?? '' },
      status: 'AGENDADO',
      assigneeId,
      technicianName,
      scheduledBy: scheduledByName,
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

    const result = await crmFetch<{ createTask: { id: string } }>(mutation, {
      data: {
        title,
        dueAt: dueAtIso,
        bodyV2: { markdown: body },
        status: 'AGENDADO',
        assigneeId,
        technicianName,
        scheduledBy: scheduledByName,
        moradaDaReparacao,
      },
    });
    task = result.createTask;
  }

  if (task && task.id) {
    const targetMutation = `
      mutation createTT($data: TaskTargetCreateInput!) {
        createTaskTarget(data: $data) {
          id
        }
      }
    `;

    const linkTarget = async (data: Record<string, string>) => {
      try {
        await crmFetch(targetMutation, { data });
      } catch (firstError) {
        console.warn("[createTechnicalVisit] createTaskTarget falhou, a tentar novamente...", firstError);
        await crmFetch(targetMutation, { data });
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

export async function cancelAppointment(taskId: string, opportunityId?: string) {
  const mutation = `
    mutation cancelT($id: UUID!) {
      updateTask(id: $id, data: { status: CANCELADO }) { 
        id 
        title
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                stage
                name
              }
            }
          }
        }
      }
    }
  `;

  const result = await crmFetch<any>(mutation, { id: taskId });
  const taskData = result.updateTask;
  const target = taskData?.taskTargets?.edges?.[0]?.node;
  const oppId = opportunityId || target?.targetOpportunityId;
  const opp = target?.opportunity;

  if (oppId) {
    const { updateOpportunityStage } = await import('./opportunities');
    const workflow = classifyOpportunityWorkflow(opp?.stage, opp?.name || taskData?.title);
    const fallbackStage = getFallbackStageOnIncompleteWorkflow(workflow);
    await updateOpportunityStage(oppId, fallbackStage);
  } else {
    await invalidateAdminCrmCache();
  }

  return true;
}

export async function cancelAppointmentByClient(id: string, reason: string) {
  const mutation = `
    mutation cancelByClient($id: UUID!, $body: RichTextUpdateInput!) {
      updateTask(id: $id, data: { status: CANCELADO, bodyV2: $body }) { 
        id 
        title
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                stage
                name
              }
            }
          }
        }
      }
    }
  `;

  const result = await crmFetch<any>(mutation, { 
    id, 
    body: { markdown: `CANCELAMENTO PELO CLIENTE: ${reason}` }
  });

  const taskData = result.updateTask;
  const target = taskData?.taskTargets?.edges?.[0]?.node;
  const oppId = target?.targetOpportunityId;
  const opp = target?.opportunity;

  if (oppId) {
    const { updateOpportunityStage } = await import('./opportunities');
    const workflow = classifyOpportunityWorkflow(opp?.stage, opp?.name || taskData?.title);
    const fallbackStage = getFallbackStageOnIncompleteWorkflow(workflow);
    await updateOpportunityStage(oppId, fallbackStage);
  } else {
    await invalidateAdminCrmCache();
  }

  return true;
}

export async function backfillTaskAssignee(
  taskId: string,
  assigneeId: string,
  technicianName?: string
): Promise<boolean> {
  const mutation = `
    mutation backfillAssignee($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) {
        id
        assigneeId
      }
    }
  `;

  await crmFetch(mutation, {
    id: taskId,
    data: {
      assigneeId,
      technicianName: technicianName || undefined,
    },
  });

  return true;
}
