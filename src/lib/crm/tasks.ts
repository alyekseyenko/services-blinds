import "server-only";
import { crmFetch, crmRestCreate, CRMError } from './client';
import { CRM_ADDRESS_GRAPHQL_FIELDS } from './contract';
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
  classifyOpportunityWorkflowOnTaskClose,
  clientAvailabilityForStatus,
  deriveWorkflowMarkerKey,
  getFallbackStageOnIncompleteWorkflow,
  isAssistanceService,
  isInstallationService,
  isMeasurementService,
} from './contract';
import {
  applyOpportunityStageTransition,
  resolveStageAfterTaskStatusChange,
} from './pipelineTransitions';
import { invalidateAdminCrmCache } from '@/lib/crmCache';
import { extractPhonesFromTwenty, getPrimaryPhone } from './phones';
import {
  buildVisitServicesFromTaskNode,
  parseVisitServicesMarker,
  resolvePrimaryOpportunityId,
  stripVisitServicesMarker,
  writeVisitServicesMarker,
} from './visitServicesMarker';
import { mergeTaskBodyWithObservations } from './visitServices';
import { fetchAllGraphqlPages } from './graphqlPagination';
import {
  technicianTaskDueDateWindow,
  TECHNICIAN_TASK_PAGE_SIZE,
} from './technicianTaskWindow';
import {
  appendSyncDoneMarker,
  hasSyncDoneMarker,
} from './syncIdempotency';
import {
  buildTechnicianLeftSiteNotePt,
  formatTaskStatusPt,
} from '@/lib/taskStatusLabels';

const PHONES_FIELDS = `
  primaryPhoneNumber
  primaryPhoneCallingCode
  additionalPhones {
    number
    callingCode
    countryCode
  }
`;

const TASK_NODE_FIELDS = `
  id
  title
  status
  dueAt
  updatedAt
  assigneeId
  scheduledBy
  technicianName
  bodyV2 { markdown }
  moradaDaReparacao {
    ${CRM_ADDRESS_GRAPHQL_FIELDS}
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
          name
          nsi
          stage
          notasImportantes { markdown }
          pointOfContact {
            phones {
              ${PHONES_FIELDS}
            }
          }
          moradaDeServico {
            ${CRM_ADDRESS_GRAPHQL_FIELDS}
          }
        }
      }
    }
  }
`;

type TechnicianTasksOrderBy = "AscNullsLast" | "Asc" | null;

async function fetchTasksByAssigneeIdPaged(
  assigneeId: string,
  orderBy: TechnicianTasksOrderBy
) {
  const { dueFrom, dueTo } = technicianTaskDueDateWindow();
  const orderByClause = orderBy ? `orderBy: { dueAt: ${orderBy} }` : "";

  return fetchAllGraphqlPages({
    pageSize: TECHNICIAN_TASK_PAGE_SIZE,
    maxPages: 30,
    fetchPage: async (after) => {
      const query = `
        query getTasksByAssignee(
          $assigneeId: UUID!
          $dueFrom: DateTime!
          $dueTo: DateTime!
          $first: Int!
          $after: String
        ) {
          tasks(
            filter: {
              and: [
                { assigneeId: { eq: $assigneeId } }
                { dueAt: { gte: $dueFrom } }
                { dueAt: { lte: $dueTo } }
              ]
            }
            ${orderByClause}
            first: $first
            after: $after
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                ${TASK_NODE_FIELDS}
              }
            }
          }
        }
      `;

      const data = await crmFetch<{
        tasks: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: any }>;
        };
      }>(
        query,
        {
          assigneeId,
          dueFrom,
          dueTo,
          first: TECHNICIAN_TASK_PAGE_SIZE,
          after,
        },
        { timeoutMs: 20000, maxRetries: 1 }
      );

      return {
        nodes: data.tasks.edges.map((edge) => edge.node),
        pageInfo: data.tasks.pageInfo,
      };
    },
  });
}

async function fetchTasksByAssigneeId(assigneeId: string) {
  const strategies: TechnicianTasksOrderBy[] = ["AscNullsLast", "Asc", null];
  let lastError: unknown;

  for (const orderBy of strategies) {
    try {
      return await fetchTasksByAssigneeIdPaged(assigneeId, orderBy);
    } catch (error) {
      lastError = error;
      if (!(error instanceof CRMError)) {
        throw error;
      }
      console.warn(
        `[fetchTasksByAssigneeId] Falha com orderBy=${String(orderBy)}:`,
        error.message
      );
    }
  }

  throw lastError;
}

function mapTaskNode(node: any): AppTask {
  const edges = node.taskTargets?.edges || [];
  const services = buildVisitServicesFromTaskNode(node);
  const primaryOppId = resolvePrimaryOpportunityId(services);
  const oppTarget =
    edges.find((e: any) => e.node?.targetOpportunity?.id === primaryOppId)?.node?.targetOpportunity ||
    edges.find((e: any) => e.node?.targetOpportunity)?.node?.targetOpportunity;
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
    dueDate: (() => {
      const parsed = node.dueAt ? new Date(node.dueAt) : new Date();
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    })(),
    address: (() => {
      const oppMorada = oppTarget?.moradaDeServico;
      const taskMorada = node.moradaDaReparacao;
      const street =
        oppMorada?.addressStreet1?.trim() || taskMorada?.addressStreet1?.trim() || "";
      const city =
        oppMorada?.addressCity?.trim() || taskMorada?.addressCity?.trim() || "";
      const postcode =
        oppMorada?.addressPostcode?.trim() || taskMorada?.addressPostcode?.trim() || "";
      const line = [street, city, postcode].filter(Boolean).join(", ");
      return line || "Endereço não especificado";
    })(),
    coordinates: (() => {
      const oppMorada = oppTarget?.moradaDeServico;
      const taskMorada = node.moradaDaReparacao;
      if (oppMorada?.addressLat != null && oppMorada?.addressLng != null) {
        return [oppMorada.addressLat, oppMorada.addressLng] as [number, number];
      }
      if (taskMorada?.addressLat != null && taskMorada?.addressLng != null) {
        return [taskMorada.addressLat, taskMorada.addressLng] as [number, number];
      }
      return null;
    })(),
    client: personTarget
      ? `${personTarget.name?.firstName || ''} ${personTarget.name?.lastName || ''}`.trim() || 'Cliente'
      : 'Cliente',
    report: node.bodyV2?.markdown || oppTarget?.notasImportantes?.markdown || '',
    opportunityId: oppTarget?.id,
    nsi:
      oppTarget?.nsi != null && String(oppTarget.nsi).trim() !== ""
        ? String(oppTarget.nsi)
        : "N/A",
    stage: oppTarget?.stage,
    serviceType: deriveWorkflowMarkerKey(oppTarget?.stage, node.title),
    scheduledBy: node.scheduledBy || 'Admin',
    assigneeId: node.assigneeId ?? null,
    technicianName: node.technicianName ?? null,
    clientPhone,
    clientPhones,
    isOverdue: isTaskOverdue(node.status, node.dueAt),
    services,
    personId: personTarget?.id,
    updatedAt: (() => {
      if (!node.updatedAt) return undefined;
      const parsed = new Date(node.updatedAt);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    })(),
  };
}

async function fetchRecentTerminalTasksForAssignee(assigneeId: string): Promise<any[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 45);
  since.setUTCHours(0, 0, 0, 0);

  try {
    const data = await crmFetch<{
      tasks: { edges: Array<{ node: any }> };
    }>(
      `query TerminalTasksForTechnician($assigneeId: UUID!, $since: DateTime!, $first: Int!) {
        tasks(
          filter: {
            and: [
              { assigneeId: { eq: $assigneeId } }
              { updatedAt: { gte: $since } }
            ]
          }
          orderBy: { updatedAt: DescNullsLast }
          first: $first
        ) {
          edges {
            node {
              ${TASK_NODE_FIELDS}
            }
          }
        }
      }`,
      { assigneeId, since: since.toISOString(), first: 80 },
      { timeoutMs: 20000, maxRetries: 0 }
    );

    return data.tasks.edges
      .map((edge) => edge.node)
      .filter((node) => !isTaskActive(node.status));
  } catch (error) {
    console.warn("[fetchRecentTerminalTasksForAssignee] Ignorar suplemento:", error);
    return [];
  }
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

  const [assignedTasks, terminalSupplement] = await Promise.all([
    fetchTasksByAssigneeId(technicianId),
    fetchRecentTerminalTasksForAssignee(technicianId),
  ]);
  const nodeById = new Map<string, any>();
  for (const node of assignedTasks) nodeById.set(node.id, node);
  for (const node of terminalSupplement) {
    if (!nodeById.has(node.id)) nodeById.set(node.id, node);
  }
  const mergedAssigneeTasks = [...nodeById.values()];

  const filtered = mergedAssigneeTasks.filter((node) => {
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
            return false;
          }
        }

        if (isInstallationTask) {
          if (STAGE_GROUPS.OBSOLETE_AFTER_INSTALLATION.includes(stageNorm)) {
            return false;
          }
        }

        if (isAssistanceTask) {
          if (STAGE_GROUPS.OBSOLETE_AFTER_ASSISTANCE.includes(stageNorm)) {
            return false;
          }
        }
      }

      return true;
    });

  const mapped: AppTask[] = [];
  for (const node of filtered) {
    try {
      mapped.push(mapTaskNode(node));
    } catch (err) {
      console.warn("[fetchTechnicianTasks] Ignorar tarefa com dados inválidos:", node?.id, err);
    }
  }
  return mapped;
}

/** Lightweight CRM check — avoids loading the full technician agenda. */
export async function technicianHasLinkedOpportunity(
  assigneeId: string,
  opportunityId: string
): Promise<boolean> {
  if (!assigneeId || !opportunityId) return false;

  try {
    const data = await crmFetch<{
      opportunities: {
        edges: Array<{
          node: {
            taskTargets?: {
              edges?: Array<{
                node?: {
                  task?: { assigneeId?: string | null } | null;
                };
              }>;
            };
          };
        }>;
      };
    }>(
      `query technicianOppAccessByOpp($opportunityId: UUID!) {
        opportunities(filter: { id: { eq: $opportunityId } }, first: 1) {
          edges {
            node {
              taskTargets {
                edges {
                  node {
                    task {
                      assigneeId
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { opportunityId },
      { timeoutMs: 12000, maxRetries: 0 }
    );

    for (const edge of data.opportunities?.edges ?? []) {
      const targets = edge.node?.taskTargets?.edges ?? [];
      for (const target of targets) {
        if (target.node?.task?.assigneeId === assigneeId) return true;
      }
    }
    return false;
  } catch {
    const tasks = await fetchTechnicianTasks(assigneeId);
    return tasks.some((task) => {
      if (task.opportunityId === opportunityId) return true;
      return task.services?.some((service) => service.opportunityId === opportunityId) ?? false;
    });
  }
}

type OpportunityPipelineContext = {
  id: string;
  name?: string | null;
  stage?: string | null;
  nsi?: number | string | null;
  pointOfContact?: {
    id?: string;
    emails?: { primaryEmail?: string };
  } | null;
};

async function fetchOpportunityPipelineContext(
  opportunityId: string
): Promise<OpportunityPipelineContext | null> {
  try {
    const oppRes = await crmFetch<{
      opportunities: { edges: Array<{ node: OpportunityPipelineContext }> };
    }>(
      `query getOppForTask($id: UUID!) {
        opportunities(filter: { id: { eq: $id } }, first: 1) {
          edges {
            node {
              id
              name
              nsi
              stage
              pointOfContact {
                id
                emails { primaryEmail }
              }
            }
          }
        }
      }`,
      { id: opportunityId }
    );
    return oppRes?.opportunities?.edges?.[0]?.node ?? null;
  } catch (e) {
    console.warn(`[updateTaskStatus] Could not fetch opportunity ${opportunityId}:`, e);
    return null;
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
  observations?: string,
  photos: string[] = [],
  clientRequestId?: string
): Promise<any> {
  const apiStatus = normalizeTaskStatus(status);
  const twentyStatus = toTwentyTaskStatus(status);

  if (clientRequestId) {
    const existingTask = await crmFetch<{
      tasks: { edges: Array<{ node: { status?: string; bodyV2?: { markdown?: string } } }> };
    }>(
      `query taskSyncMarker($id: UUID!) {
        tasks(filter: { id: { eq: $id } }, first: 1) {
          edges { node { status bodyV2 { markdown } } }
        }
      }`,
      { id: taskId },
      { timeoutMs: 8000, maxRetries: 0 }
    );
    const node = existingTask.tasks.edges[0]?.node;
    const body = node?.bodyV2?.markdown || "";
    if (hasSyncDoneMarker(body, clientRequestId)) {
      return { id: taskId, success: true, idempotent: true };
    }
  }

  // 1. Update Task in CRM
  const mutation = `
    mutation updateT($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) {
        id
        title
        status
        technicianName
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                nsi
                name
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
      }
    }
  `;

  let mergedBody = await mergeTaskBodyWithObservations(taskId, observations);
  if (clientRequestId && mergedBody) {
    mergedBody = appendSyncDoneMarker(mergedBody, clientRequestId);
  } else if (clientRequestId) {
    mergedBody = appendSyncDoneMarker("", clientRequestId);
  }

  const result = await crmFetch<any>(mutation, {
    id: taskId,
    data: {
      status: twentyStatus,
      bodyV2: mergedBody ? { markdown: mergedBody } : undefined
    }
  });

  const updatedTask = result.updateTask;
  if (!updatedTask) return { id: taskId, success: false };

  const visitMarker = parseVisitServicesMarker(mergedBody || "");
  const laterOppIds = new Set(
    visitMarker.filter((r) => r.mode === "later").map((r) => r.opportunityId)
  );
  const onSiteOppIds = new Set(visitMarker.map((r) => r.opportunityId));

  const oppTargetNodes =
    updatedTask.taskTargets?.edges
      ?.map((e: any) => e.node)
      .filter((n: any) => n?.targetOpportunityId) || [];

  const primaryTarget =
    oppTargetNodes.find((n: any) => !laterOppIds.has(n.targetOpportunityId)) ||
    oppTargetNodes[0];
  const oppId = primaryTarget?.targetOpportunityId as string | undefined;

  // Twenty often omits nested `opportunity` on updateTask — always refresh from CRM.
  const opp = oppId ? await fetchOpportunityPipelineContext(oppId) : null;
  const clientEmail = opp?.pointOfContact?.emails?.primaryEmail;
  const personId = opp?.pointOfContact?.id;

  // 2. Orchestrate Notifications and Reports (Side Effects)
  const { triggerNotification } = await import('./notifications');

  const isIncomplete = apiStatus === CRM_TASK_STATUS.INCOMPLETO;
  const isCompleted =
    apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE;

  const n8nSideEffects: Promise<unknown>[] = [];

  if (isIncomplete) {
    n8nSideEffects.push(
      triggerNotification('technician_report', {
        taskId,
        status: apiStatus,
        observations,
        title: updatedTask.title,
        pointOfContactEmail: clientEmail
      })
    );
  }

  if (isCompleted || isIncomplete) {
    if (isCompleted) {
      n8nSideEffects.push(
        triggerNotification('service_completed', {
          taskId,
          opportunityId: oppId,
          title: updatedTask.title,
          pointOfContactEmail: clientEmail
        })
      );
    }

    const { serverTriggerServiceReport } = await import('../notificationAction');
    n8nSideEffects.push(
      serverTriggerServiceReport({
        taskId,
        opportunityId: oppId,
        status: apiStatus,
        observations,
        photos,
        nsi: opp?.nsi || 'NSI',
        clientName: opp?.name || 'Cliente',
        serviceType: deriveWorkflowMarkerKey(opp?.stage, updatedTask.title),
        taskTitle: updatedTask.title
      })
    );
  }

  if (n8nSideEffects.length > 0) {
    const results = await Promise.allSettled(n8nSideEffects);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('Falha ao enfileirar automação n8n (visita já gravada no CRM):', result.reason);
      }
    }
  }

  // 3. Criar uma nota nativa no CRM se houver observações/relatório do técnico para manter o histórico centralizado
  const { createOpportunityNote } = await import('./notes');
  if (oppId && observations && observations.trim()) {
    try {
      const noteTitle = `Relatório técnico (${formatTaskStatusPt(status)})`;
      await createOpportunityNote(
        oppId,
        personId || null,
        noteTitle,
        observations,
        clientRequestId ? `${clientRequestId}-report` : undefined
      );
    } catch (noteErr) {
      console.warn('Failed to automatically create CRM Note for technician report:', noteErr);
    }
  }

  const isVisitClosedOnSite =
    apiStatus === CRM_TASK_STATUS.CONCLUIDO ||
    apiStatus === CRM_TASK_STATUS.DONE ||
    apiStatus === CRM_TASK_STATUS.INCOMPLETO ||
    apiStatus === CRM_TASK_STATUS.CANCELADO;

  if (isVisitClosedOnSite && oppTargetNodes.length > 0) {
    const leftSiteNote = buildTechnicianLeftSiteNotePt(
      updatedTask.technicianName,
      apiStatus
    );

    for (const target of oppTargetNodes) {
      const linkedOppId = target.targetOpportunityId as string;
      const contactId =
        target.opportunity?.pointOfContact?.id ?? personId ?? null;
      try {
        await createOpportunityNote(
          linkedOppId,
          contactId,
          leftSiteNote.title,
          leftSiteNote.body,
          clientRequestId ? `${clientRequestId}-left-${linkedOppId}` : undefined
        );
      } catch (noteErr) {
        console.warn(
          `[updateTaskStatus] Failed to create left-site note for ${linkedOppId}:`,
          noteErr
        );
      }
    }
  }

  // 4. Stage transitions for each linked opportunity (skip "schedule later" on complete)
  if (apiStatus !== CRM_TASK_STATUS.EM_CURSO) {
    try {
      for (const target of oppTargetNodes) {
        const linkedOppId = target.targetOpportunityId as string;
        if (!linkedOppId) continue;

        if (
          laterOppIds.has(linkedOppId) &&
          (apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE)
        ) {
          continue;
        }

        const embeddedOpp = target.opportunity;
        const linkedOpp =
          embeddedOpp?.stage != null && embeddedOpp?.stage !== ""
            ? embeddedOpp
            : await fetchOpportunityPipelineContext(linkedOppId);
        if (!linkedOpp?.stage) continue;

        // On-site extra services follow their own stage, not the parent visit title.
        const closeTaskTitle = onSiteOppIds.has(linkedOppId) ? undefined : updatedTask.title;
        const workflow = classifyOpportunityWorkflowOnTaskClose(
          linkedOpp.stage,
          linkedOpp.name,
          closeTaskTitle
        );
        const targetStage = resolveStageAfterTaskStatusChange(workflow, apiStatus);
        if (!targetStage) continue;

        if (
          (apiStatus === CRM_TASK_STATUS.INCOMPLETO ||
            apiStatus === CRM_TASK_STATUS.CANCELADO) &&
          laterOppIds.has(linkedOppId)
        ) {
          continue;
        }

        const reason =
          apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE
            ? "task_completed"
            : "task_incomplete_or_cancelled";

        const stageResult = await applyOpportunityStageTransition(
          linkedOppId,
          targetStage,
          reason,
          {
            currentStage: linkedOpp.stage,
            taskStatus: apiStatus,
            opportunityName: linkedOpp.name,
            taskTitle: closeTaskTitle,
          }
        );
        if (stageResult.status === "conflict") {
          console.warn(
            "[Pipeline] Stage transition skipped after task update (conflict with CRM)",
            {
              opportunityId: linkedOppId,
              reason,
              crmStage: stageResult.currentStage,
              requestedTarget: stageResult.targetStage,
            }
          );
        }
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
  status?: string;
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
  } = taskData;

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
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
  } = taskData;

  if (!assigneeId) {
    throw new Error('Selecione um técnico válido do Twenty CRM para associar a visita.');
  }

  const dueAtIso = dueAt instanceof Date ? dueAt.toISOString() : new Date(dueAt).toISOString();
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

async function mergeClientCancellationIntoBody(taskId: string, reason: string): Promise<string> {
  const query = `
    query taskBodyForClientCancel($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            bodyV2 { markdown }
          }
        }
      }
    }
  `;
  const result = await crmFetch<{ tasks?: { edges?: { node?: { bodyV2?: { markdown?: string } } }[] } }>(
    query,
    { id: taskId }
  );
  const existing = result.tasks?.edges?.[0]?.node?.bodyV2?.markdown || "";
  const records = parseVisitServicesMarker(existing);
  const stripped = stripVisitServicesMarker(existing);
  const line = `CANCELAMENTO PELO CLIENTE: ${reason}`;
  const body = stripped.trim() ? `${stripped.trim()}\n\n${line}` : line;
  return writeVisitServicesMarker(body, records);
}

type CancelTaskTarget = {
  targetOpportunityId?: string;
  opportunity?: { id?: string; stage?: string; name?: string };
};

async function revertOpportunitiesAfterCancel(
  taskData: { title?: string; taskTargets?: { edges?: { node?: CancelTaskTarget }[] } },
  explicitOpportunityId?: string
): Promise<void> {
  const edges = taskData?.taskTargets?.edges ?? [];
  const seen = new Set<string>();

  const processOpp = async (oppId: string, opp?: CancelTaskTarget["opportunity"]) => {
    if (!oppId || seen.has(oppId)) return;
    seen.add(oppId);
    const workflow = classifyOpportunityWorkflow(opp?.stage, opp?.name || taskData?.title);
    const fallbackStage = getFallbackStageOnIncompleteWorkflow(workflow);
    const stageResult = await applyOpportunityStageTransition(
      oppId,
      fallbackStage,
      "task_incomplete_or_cancelled",
      {
        currentStage: opp?.stage,
        taskStatus: CRM_TASK_STATUS.CANCELADO,
        opportunityName: opp?.name,
        taskTitle: taskData?.title,
      }
    );
    if (stageResult.status === "conflict") {
      console.warn("[Pipeline] Stage transition skipped on cancel (conflict with CRM)", {
        opportunityId: oppId,
        crmStage: stageResult.currentStage,
      });
    }
  };

  if (explicitOpportunityId) {
    const edge = edges.find((e) => e?.node?.targetOpportunityId === explicitOpportunityId);
    await processOpp(explicitOpportunityId, edge?.node?.opportunity);
  }

  for (const edge of edges) {
    const node = edge?.node;
    const oppId = node?.targetOpportunityId || node?.opportunity?.id;
    if (oppId) {
      await processOpp(oppId, node?.opportunity);
    }
  }
}

async function cancelTaskWithPipelineFallback(
  taskId: string,
  options: { clientCancellationReason?: string; explicitOpportunityId?: string } = {}
): Promise<boolean> {
  const bodyMarkdown = options.clientCancellationReason
    ? await mergeClientCancellationIntoBody(taskId, options.clientCancellationReason)
    : undefined;

  const mutation = bodyMarkdown
    ? `
    mutation cancelByClient($id: UUID!, $body: RichTextUpdateInput!) {
      updateTask(id: $id, data: { status: CANCELADO, bodyV2: $body }) {
        id
        title
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                id
                stage
                name
              }
            }
          }
        }
      }
    }
  `
    : `
    mutation cancelT($id: UUID!) {
      updateTask(id: $id, data: { status: CANCELADO }) {
        id
        title
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                id
                stage
                name
              }
            }
          }
        }
      }
    }
  `;

  const variables = bodyMarkdown
    ? { id: taskId, body: { markdown: bodyMarkdown } }
    : { id: taskId };

  const result = await crmFetch<{
    updateTask?: {
      title?: string;
      taskTargets?: { edges?: { node?: CancelTaskTarget }[] };
    };
  }>(mutation, variables);
  const taskData = result.updateTask;

  await revertOpportunitiesAfterCancel(taskData ?? {}, options.explicitOpportunityId);
  await invalidateAdminCrmCache();
  return true;
}

export async function cancelAppointment(taskId: string, opportunityId?: string) {
  return cancelTaskWithPipelineFallback(taskId, { explicitOpportunityId: opportunityId });
}

export async function cancelAppointmentByClient(id: string, reason: string) {
  return cancelTaskWithPipelineFallback(id, { clientCancellationReason: reason });
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
