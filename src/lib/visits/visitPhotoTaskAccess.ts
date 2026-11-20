import "server-only";

import { crmFetch } from "@/lib/crm/client";

export async function assertTaskLinkedToOpportunity(
  taskId: string,
  opportunityId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await crmFetch<{
    tasks: {
      edges: Array<{
        node: {
          taskTargets?: {
            edges?: Array<{ node?: { targetOpportunityId?: string | null } | null }>;
          } | null;
        };
      }>;
    };
  }>(
    `query VisitPhotoTaskTarget($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            taskTargets {
              edges { node { targetOpportunityId } }
            }
          }
        }
      }
    }`,
    { id: taskId },
    { timeoutMs: 12_000, maxRetries: 1 }
  );

  const targets =
    data.tasks.edges[0]?.node?.taskTargets?.edges
      ?.map((edge) => edge?.node?.targetOpportunityId)
      .filter((id): id is string => Boolean(id)) ?? [];

  if (targets.length === 0) {
    return { ok: false, error: "Visita sem serviço associado." };
  }

  if (!targets.includes(opportunityId)) {
    return { ok: false, error: "O serviço não corresponde a esta visita." };
  }

  return { ok: true };
}