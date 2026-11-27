import "server-only";
import { crmFetch, CRMError } from "../client";
import {
  STAGE_GROUPS,
  normalizeString,
  isAssistanceService,
  isInstallationService,
  isMeasurementService,
  isTaskActive,
} from "../contract";
import type { AppTask } from "../schemas";
import { fetchAllGraphqlPages } from "../graphqlPagination";
import { technicianTaskDueDateWindow, TECHNICIAN_TASK_PAGE_SIZE } from "../technicianTaskWindow";
import { TASK_NODE_FIELDS, mapTaskNode } from "./queries";
import { assistantPatternForMember, parseAssistantIds } from "@/lib/visits/team";

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

async function fetchTasksAsAssistantPaged(memberId: string) {
  const { dueFrom, dueTo } = technicianTaskDueDateWindow();
  const assistantPattern = assistantPatternForMember(memberId);

  return fetchAllGraphqlPages({
    pageSize: TECHNICIAN_TASK_PAGE_SIZE,
    maxPages: 30,
    fetchPage: async (after) => {
      const query = `
        query getTasksAsAssistant(
          $pattern: String!
          $dueFrom: DateTime!
          $dueTo: DateTime!
          $first: Int!
          $after: String
        ) {
          tasks(
            filter: {
              and: [
                { equipaAuxiliarIds: { ilike: $pattern } }
                { dueAt: { gte: $dueFrom } }
                { dueAt: { lte: $dueTo } }
              ]
            }
            orderBy: { dueAt: AscNullsLast }
            first: $first
            after: $after
          ) {
            pageInfo { hasNextPage endCursor }
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
          pattern: assistantPattern,
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

export type TaskTeamAccess = {
  masterId: string;
  assistantIds: string[];
};

export async function getTaskTeamAccess(taskId: string): Promise<TaskTeamAccess | null> {
  const data = await crmFetch<{
    tasks: {
      edges: Array<{
        node: {
          assigneeId?: string | null;
          equipaAuxiliarIds?: string | null;
        };
      }>;
    };
  }>(
    `query GetTaskTeam($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            assigneeId
            equipaAuxiliarIds
          }
        }
      }
    }`,
    { id: taskId },
    { timeoutMs: 10000, maxRetries: 0 }
  );

  const node = data.tasks.edges[0]?.node;
  const masterId = node?.assigneeId?.trim();
  if (!masterId) return null;
  return {
    masterId,
    assistantIds: parseAssistantIds(node?.equipaAuxiliarIds),
  };
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

  const [assignedTasks, assistantTasks, terminalSupplement] = await Promise.all([
    fetchTasksByAssigneeId(technicianId),
    fetchTasksAsAssistantPaged(technicianId),
    fetchRecentTerminalTasksForAssignee(technicianId),
  ]);
  const nodeById = new Map<string, any>();
  for (const node of assignedTasks) nodeById.set(node.id, node);
  for (const node of assistantTasks) nodeById.set(node.id, node);
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
                  task?: { assigneeId?: string | null; equipaAuxiliarIds?: string | null } | null;
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
                      equipaAuxiliarIds
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
        const task = target.node?.task;
        if (!task) continue;
        if (task.assigneeId === assigneeId) return true;
        const assistants = parseAssistantIds(task.equipaAuxiliarIds);
        if (assistants.includes(assigneeId)) return true;
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
