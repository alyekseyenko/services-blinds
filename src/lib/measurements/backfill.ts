import "server-only";
import { fetchServiceItemsByOpportunity } from "@/lib/crm/items";
import {
  parseAndGroupServiceItems,
  parseMeasurementsFromReport,
  productGroupsToMeasurementsPayload,
} from "@/lib/measurements/utils";
import { crmFetch } from "@/lib/crm/client";
import { isMeasurementsDbConfigured } from "./db/client";
import { getLatestSheetByOpportunity, saveSubmittedSheet } from "./repo";

type BackfillResult = {
  scanned: number;
  imported: number;
  skipped: number;
  errors: string[];
};

export async function runMeasurementsBackfill(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<BackfillResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 500;
  const result: BackfillResult = { scanned: 0, imported: 0, skipped: 0, errors: [] };

  if (!isMeasurementsDbConfigured()) {
    result.errors.push("MEASUREMENTS_DATABASE_URL não configurado.");
    return result;
  }

  const query = `
    query listOppsWithNotes {
      opportunities(first: ${limit}, orderBy: { updatedAt: DescNullsLast }) {
        edges {
          node {
            id
            name
            nsi
            notasImportantes { markdown }
            taskTargets {
              edges {
                node {
                  task { id dueAt technicianName title }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await crmFetch<{
    opportunities?: { edges?: Array<{ node?: Record<string, unknown> }> };
  }>(query);

  const edges = data?.opportunities?.edges ?? [];
  for (const edge of edges) {
    const node = edge.node;
    if (!node?.id) continue;
    const opportunityId = String(node.id);
    result.scanned += 1;

    const existing = await getLatestSheetByOpportunity(opportunityId);
    if (existing) {
      result.skipped += 1;
      continue;
    }

    const notes =
      (node.notasImportantes as { markdown?: string } | undefined)?.markdown || "";
    let payload = parseMeasurementsFromReport(notes);
    if (!payload?.groups?.length) {
      const items = await fetchServiceItemsByOpportunity(opportunityId);
      if (items.length) {
        const groups = parseAndGroupServiceItems(items as Array<Record<string, unknown>>);
        if (groups.length) {
          payload = productGroupsToMeasurementsPayload(groups);
        }
      }
    }

    if (!payload?.groups?.length) {
      result.skipped += 1;
      continue;
    }

    const task =
      (node.taskTargets as { edges?: Array<{ node?: { task?: Record<string, unknown> } }> })
        ?.edges?.[0]?.node?.task ?? null;

    const taskId = task?.id ? String(task.id) : opportunityId;

    if (dryRun) {
      result.imported += 1;
      continue;
    }

    const save = await saveSubmittedSheet({
      opportunityId,
      taskId,
      clientRequestId: `backfill:${opportunityId}`,
      clientName: String(node.name || "Cliente"),
      nsi: node.nsi ? String(node.nsi) : undefined,
      address: "",
      technicianName: task?.technicianName ? String(task.technicianName) : undefined,
      visitAt: task?.dueAt ? new Date(String(task.dueAt)) : undefined,
      payload,
    });

    if (save.success) {
      result.imported += 1;
    } else {
      result.errors.push(`${opportunityId}: ${save.error}`);
    }
  }

  return result;
}
