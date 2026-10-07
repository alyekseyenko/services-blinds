import "server-only";
import { crmFetch } from "./client";
import { fetchServiceItemsByOpportunity } from "./items";
import { MeasurementsPayload, MeasurementsPayloadSchema } from "@/lib/schemas";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { measurementSheetHasData } from "@/lib/schemas/measurementSheet";
import { buildMeasurementSheetFromPayload } from "@/lib/measurementSheetBuilder";
import {
  parseAndGroupServiceItems,
  parseMeasurementsFromReport,
  productGroupsToMeasurementsPayload,
} from "@/lib/measurementsUtils";
import { formatVisitServiceTypeLabel } from "@/lib/visitServiceTypeLabel";
import { CRM_ADDRESS_GRAPHQL_FIELDS } from "./contract";
import { isMeasurementsDbConfigured } from "@/lib/measurements/db/client";
import { processMeasurementsOutboxBatch } from "@/lib/measurements/processOutbox";
import {
  getLatestMeasurementsPayload,
  getLatestSheetByOpportunity,
  saveSubmittedSheet,
} from "@/lib/measurements/repo";

function formatServiceAddress(morada?: {
  addressStreet1?: string | null;
  addressStreet2?: string | null;
  addressCity?: string | null;
  addressPostcode?: string | null;
} | null): string {
  if (!morada) return "N/A";
  return (
    [
      morada.addressStreet1,
      morada.addressStreet2,
      morada.addressCity,
      morada.addressPostcode,
    ]
      .filter((p) => Boolean(p?.trim()))
      .join(", ") || "N/A"
  );
}

function pickPrimaryTask(
  taskTargets?: { edges?: Array<{ node?: { task?: Record<string, unknown> } }> }
) {
  const tasks =
    taskTargets?.edges
      ?.map((e) => e.node?.task)
      .filter((t): t is Record<string, unknown> => Boolean(t)) ?? [];
  if (tasks.length === 0) return null;
  return tasks[0];
}

async function resolveMeasurementsPayloadFromCrm(
  opportunityId: string,
  notesMarkdown: string
): Promise<MeasurementsPayload | null> {
  const fromNotes = parseMeasurementsFromReport(notesMarkdown);
  if (fromNotes?.groups?.length) {
    const validated = MeasurementsPayloadSchema.safeParse(fromNotes);
    if (validated.success && validated.data.groups.some((g) => g.measurements.length > 0)) {
      return validated.data;
    }
  }

  const items = await fetchServiceItemsByOpportunity(opportunityId);
  if (!items.length) return null;
  const groups = parseAndGroupServiceItems(items as Array<Record<string, unknown>>);
  if (!groups.length) return null;
  return productGroupsToMeasurementsPayload(groups);
}

type OppMeasurementContext = {
  clientName: string;
  nsi?: string;
  address: string;
  serviceLabel?: string;
  technicianName?: string;
  visitDateIso?: string;
};

async function fetchOpportunityMeasurementContext(
  opportunityId: string
): Promise<OppMeasurementContext | null> {
  const query = `
    query getOppMeasurements($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }) {
        edges {
          node {
            id
            name
            nsi
            stage
            moradaDeServico {
              ${CRM_ADDRESS_GRAPHQL_FIELDS}
            }
            pointOfContact {
              name { firstName lastName }
            }
            taskTargets {
              edges {
                node {
                  task {
                    dueAt
                    technicianName
                    title
                  }
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
  }>(query, { id: opportunityId });

  const node = data?.opportunities?.edges?.[0]?.node;
  if (!node) return null;

  const contact = node.pointOfContact as {
    name?: { firstName?: string; lastName?: string };
  } | undefined;
  const clientName =
    [contact?.name?.firstName, contact?.name?.lastName].filter(Boolean).join(" ").trim() ||
    String(node.name || "Cliente");

  const task = pickPrimaryTask(
    node.taskTargets as { edges?: Array<{ node?: { task?: Record<string, unknown> } }> }
  );

  return {
    clientName,
    nsi: node.nsi ? String(node.nsi) : undefined,
    address: formatServiceAddress(
      node.moradaDeServico as {
        addressStreet1?: string;
        addressCity?: string;
        addressPostcode?: string;
        addressStreet2?: string;
      }
    ),
    serviceLabel: formatVisitServiceTypeLabel({
      stage: String(node.stage || ""),
      visitTitle: task?.title ? String(task.title) : String(node.name || ""),
    }),
    technicianName: task?.technicianName ? String(task.technicianName) : undefined,
    visitDateIso: task?.dueAt ? String(task.dueAt) : undefined,
  };
}

export async function fetchMeasurementsPayloadForOpportunity(
  opportunityId: string
): Promise<MeasurementsPayload | null> {
  if (isMeasurementsDbConfigured()) {
    const fromDb = await getLatestMeasurementsPayload(opportunityId);
    if (fromDb?.groups?.length) {
      return fromDb;
    }
  }

  const query = `
    query getOppNotes($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }) {
        edges { node { notasImportantes { markdown } } }
      }
    }
  `;
  const data = await crmFetch<{
    opportunities?: { edges?: Array<{ node?: { notasImportantes?: { markdown?: string } } }> };
  }>(query, { id: opportunityId });
  const notes =
    data?.opportunities?.edges?.[0]?.node?.notasImportantes?.markdown || "";
  return resolveMeasurementsPayloadFromCrm(opportunityId, notes);
}

export async function fetchMeasurementSheet(opportunityId: string): Promise<MeasurementSheet | null> {
  if (isMeasurementsDbConfigured()) {
    const fromDb = await getLatestSheetByOpportunity(opportunityId);
    if (fromDb && measurementSheetHasData(fromDb)) {
      return fromDb;
    }
  }

  const ctx = await fetchOpportunityMeasurementContext(opportunityId);
  if (!ctx) return null;

  const query = `
    query getOppNotes($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }) {
        edges { node { notasImportantes { markdown } } }
      }
    }
  `;
  const data = await crmFetch<{
    opportunities?: { edges?: Array<{ node?: { notasImportantes?: { markdown?: string } } }> };
  }>(query, { id: opportunityId });
  const notes =
    data?.opportunities?.edges?.[0]?.node?.notasImportantes?.markdown || "";

  const payload = await resolveMeasurementsPayloadFromCrm(opportunityId, notes);
  if (!payload) return null;

  const sheet = buildMeasurementSheetFromPayload(
    {
      opportunityId,
      clientName: ctx.clientName,
      nsi: ctx.nsi,
      address: ctx.address,
      serviceLabel: ctx.serviceLabel,
      technicianName: ctx.technicianName,
      visitDateIso: ctx.visitDateIso,
    },
    payload
  );

  return measurementSheetHasData(sheet) ? sheet : null;
}

export async function saveMeasurements(
  taskId: string,
  opportunityId: string,
  measurements: MeasurementsPayload,
  clientRequestId?: string,
  technicianMeta?: { technicianName?: string; technicianUserId?: string }
) {
  try {
    const parsed = MeasurementsPayloadSchema.safeParse(measurements);
    if (!parsed.success) {
      return { success: false, error: "Dados de medidas inválidos." };
    }

    if (!isMeasurementsDbConfigured()) {
      return {
        success: false,
        error: "Base de dados de medições indisponível. Contacte o suporte.",
      };
    }

    const ctx = await fetchOpportunityMeasurementContext(opportunityId);
    if (!ctx) {
      return { success: false, error: "Oportunidade não encontrada no CRM." };
    }

    const saveResult = await saveSubmittedSheet({
      opportunityId,
      taskId,
      clientRequestId,
      technicianName: technicianMeta?.technicianName ?? ctx.technicianName,
      technicianUserId: technicianMeta?.technicianUserId,
      clientName: ctx.clientName,
      nsi: ctx.nsi,
      address: ctx.address,
      serviceLabel: ctx.serviceLabel,
      visitAt: ctx.visitDateIso ? new Date(ctx.visitDateIso) : undefined,
      payload: parsed.data,
    });

    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    void processMeasurementsOutboxBatch().catch((err) => {
      console.warn("[saveMeasurements] outbox:", err);
    });

    return {
      success: true,
      idempotent: saveResult.idempotent,
      sheetId: saveResult.sheetId,
      version: saveResult.version,
    };
  } catch (error: unknown) {
    console.error("Error saving measurements:", error);
    const message = error instanceof Error ? error.message : "Erro ao guardar medições.";
    return { success: false, error: message };
  }
}
