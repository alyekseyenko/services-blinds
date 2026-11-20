import "server-only";

import { crmFetch } from "@/lib/crm/client";
import { createOpportunityNote } from "@/lib/crm/notes";
import { parseVisitServicesMarker } from "@/lib/crm/visitServicesMarker";
import {
  isRepairPaymentComplete,
  isRepairPaymentMethod,
  opportunityRequiresRepairPayment,
  repairPaymentNoteBody,
  type RepairPaymentNote,
} from "@/lib/visits/repairPayment";

type TargetNode = {
  targetOpportunityId?: string;
  targetOpportunity?: { id?: string; stage?: string; name?: string };
  opportunity?: { stage?: string; name?: string };
};

export async function assertRepairPaymentsBeforeClose(
  taskId: string,
  paymentNotes: RepairPaymentNote[] | undefined
): Promise<void> {
  const required = await repairOpportunityIdsForClose(taskId);
  if (required.length === 0) return;

  const chosen = new Map((paymentNotes ?? []).map((note) => [note.opportunityId, note]));
  const missing = required.filter((id) => {
    const note = chosen.get(id);
    return !isRepairPaymentComplete(note?.method, note?.detail);
  });
  if (missing.length > 0) {
    throw new Error("Não foi possível concluir: indique o pagamento de cada reparação.");
  }
}

export async function recordRepairPaymentNotes(
  paymentNotes: RepairPaymentNote[] | undefined,
  personId: string | null | undefined,
  clientRequestId?: string
): Promise<void> {
  if (!paymentNotes?.length) return;
  for (const note of paymentNotes) {
    if (!isRepairPaymentComplete(note.method, note.detail)) {
      throw new Error("Não foi possível concluir: o tipo de pagamento da reparação é inválido.");
    }
    await createOpportunityNote(
      note.opportunityId,
      personId || null,
      "Pagamento",
      repairPaymentNoteBody(note),
      clientRequestId ? `${clientRequestId}-pay-${note.opportunityId}` : undefined
    );
  }
}

async function repairOpportunityIdsForClose(taskId: string): Promise<string[]> {
  const data = await crmFetch<{
    tasks: {
      edges: Array<{
        node: {
          bodyV2?: { markdown?: string };
          taskTargets?: { edges: Array<{ node: TargetNode }> };
        };
      }>;
    };
  }>(
    `query taskRepairTargets($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges {
          node {
            bodyV2 { markdown }
            taskTargets {
              edges {
                node {
                  targetOpportunityId
                  targetOpportunity { id stage name }
                }
              }
            }
          }
        }
      }
    }`,
    { id: taskId },
    { timeoutMs: 8000, maxRetries: 0 }
  );

  const node = data.tasks.edges[0]?.node;
  if (!node) return [];
  const marker = parseVisitServicesMarker(node.bodyV2?.markdown);
  const markerByOpp = new Map(marker.map((row) => [row.opportunityId, row]));
  const later = new Set(marker.filter((row) => row.mode === "later").map((row) => row.opportunityId));
  const alreadyPaid = new Set(
    marker
      .filter((row) => isRepairPaymentComplete(row.paymentMethod, row.paymentDetail))
      .map((row) => row.opportunityId)
  );

  const ids: string[] = [];
  for (const edge of node.taskTargets?.edges ?? []) {
    const target = edge.node;
    const opportunityId = target?.targetOpportunity?.id || target?.targetOpportunityId;
    if (!opportunityId || later.has(opportunityId) || alreadyPaid.has(opportunityId)) continue;
    const stage = target?.targetOpportunity?.stage || target?.opportunity?.stage;
    const name = target?.targetOpportunity?.name || target?.opportunity?.name;
    const markerRow = markerByOpp.get(opportunityId);
    if (
      opportunityRequiresRepairPayment({
        stage,
        name,
        serviceType: markerRow?.serviceType,
        mode: markerRow?.mode,
      })
    ) {
      ids.push(opportunityId);
    }
  }
  return ids;
}
