import "server-only";
import { crmFetch } from "../client";
import {
  CRM_TASK_STATUS,
  classifyOpportunityWorkflow,
  getFallbackStageOnIncompleteWorkflow,
} from "../contract";
import { applyOpportunityStageTransition } from "../pipelineTransitions";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import {
  parseVisitServicesMarker,
  stripVisitServicesMarker,
  writeVisitServicesMarker,
} from "../visitServicesMarker";

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
