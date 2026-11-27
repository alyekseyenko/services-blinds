import "server-only";

import { crmFetch } from "@/lib/crm/client";
import { parseCrmClientRating } from "@/lib/crm/contract";
import { formatServiceNumber } from "@/lib/crm/serviceNumber";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import { parseAssistantIds } from "@/lib/visits/team";
import type { ClientRatingNotice } from "@/lib/agenda/clientRatingDiff";

const WINDOW_DAYS = 21;

type RawOpp = {
  id: string;
  name?: string | null;
  nsi?: number | string | null;
  numeroDeServico?: number | string | null;
  avaliacaoDoCliente?: unknown;
  feedbackDoCliente?: string | null;
  pointOfContact?: {
    name?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  taskTargets?: {
    edges?: Array<{
      node?: {
        task?: {
          id?: string;
          assigneeId?: string | null;
          technicianName?: string | null;
          equipaAuxiliarIds?: string | null;
          dueAt?: string | null;
          status?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
};

function pickTask(node: RawOpp): {
  id?: string;
  assigneeId?: string | null;
  technicianName?: string | null;
  equipaAuxiliarIds?: string | null;
  dueAt?: string | null;
} | undefined {
  return (
    (node.taskTargets?.edges ?? [])
      .map((edge) => edge.node?.task)
      .find((task) => Boolean(task?.id)) ?? undefined
  );
}

export function mapClientRatingNotice(node: RawOpp): ClientRatingNotice | null {
  const rating = parseCrmClientRating(node.avaliacaoDoCliente);
  if (rating === null) return null;
  const contact = node.pointOfContact?.name;
  const clientName =
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() ||
    node.name?.trim() ||
    "Cliente";
  const task = pickTask(node);
  const feedback = node.feedbackDoCliente?.trim() || undefined;
  const nsi = node.nsi != null && String(node.nsi).trim() ? String(node.nsi).trim() : undefined;
  return {
    opportunityId: node.id,
    taskId: task?.id,
    dueAt: task?.dueAt ?? undefined,
    clientName,
    serviceNumber: formatServiceNumber(node.numeroDeServico),
    nsi,
    rating,
    feedback,
    assigneeId: task?.assigneeId ?? undefined,
    technicianName: canonicalTechnicianName(task?.technicianName) || undefined,
  };
}

function expandRatingRecipients(notice: ClientRatingNotice, assistantIds: string[]): ClientRatingNotice[] {
  const base = [notice];
  const extras = assistantIds
    .filter((id) => id && id !== notice.assigneeId)
  .map((assigneeId) => ({ ...notice, assigneeId }));
  return [...base, ...extras];
}

export async function fetchRecentClientRatings(): Promise<ClientRatingNotice[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
  const query = `
    query RecentClientRatings($since: DateTime!) {
      opportunities(
        filter: { updatedAt: { gte: $since } }
        orderBy: { updatedAt: DescNullsLast }
        first: 80
      ) {
        edges {
          node {
            id
            name
            nsi
            numeroDeServico
            avaliacaoDoCliente
            feedbackDoCliente
            pointOfContact { name { firstName lastName } }
            taskTargets {
              edges {
                node {
                  task { id assigneeId technicianName equipaAuxiliarIds dueAt status }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await crmFetch<{
    opportunities?: { edges?: Array<{ node?: RawOpp }> };
  }>(query, { since: since.toISOString() }, { timeoutMs: 20000, maxRetries: 1 });
  const notices: ClientRatingNotice[] = [];
  for (const edge of data.opportunities?.edges ?? []) {
    if (!edge.node) continue;
    const notice = mapClientRatingNotice(edge.node);
    if (!notice) continue;
    const task = pickTask(edge.node);
    const assistantIds = parseAssistantIds(task?.equipaAuxiliarIds);
    notices.push(...expandRatingRecipients(notice, assistantIds));
  }
  return notices;
}
