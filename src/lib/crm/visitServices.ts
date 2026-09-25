import { crmFetch } from "./client";
import { CRM_STAGES } from "./contract";
import type {
  CreateVisitServicePayload,
  ExtraServiceType,
  UpdateVisitServicePayload,
  VisitServiceMode,
} from "@/lib/schemas";
import { saveMeasurements } from "./measurements";
import { createOpportunityNote } from "./notes";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import {
  buildVisitServicesFromTaskNode,
  parseVisitServicesMarker,
  resolvePrimaryOpportunityId,
  sanitizeUserMarkdown,
  stripVisitServicesMarker,
  writeVisitServicesMarker,
  type VisitServiceMarkerRecord,
} from "./visitServicesMarker";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";

const SERVICE_TYPE_STAGE: Record<ExtraServiceType, string> = {
  TIRAR_MEDIDAS: CRM_STAGES.TIRAR_MEDIDAS,
  REMEDICAO: CRM_STAGES.REMEDICAO,
  MANUTENCAO: CRM_STAGES.MANUTENCAO,
  REPARACAO: CRM_STAGES.REPARACAO,
};

function defaultModeForServiceType(serviceType: ExtraServiceType): VisitServiceMode {
  if (serviceType === "TIRAR_MEDIDAS" || serviceType === "REMEDICAO") return "now";
  return "now";
}

const TASK_FOR_VISIT_QUERY = `
  query getTaskForVisit($id: UUID!) {
    tasks(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
          id
          title
          assigneeId
          bodyV2 { markdown }
          taskTargets {
            edges {
              node {
                id
                targetPersonId
                targetOpportunityId
                targetPerson {
                  id
                }
                targetOpportunity {
                  id
                  name
                  nsi
                  stage
                  pointOfContact { id }
                  moradaDeServico {
                    addressStreet1
                    addressStreet2
                    addressCity
                    addressState
                    addressPostcode
                    addressCountry
                    addressLat
                    addressLng
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchTaskNode(taskId: string) {
  const data = await crmFetch<{
    tasks: { edges: Array<{ node: any }> };
  }>(TASK_FOR_VISIT_QUERY, { id: taskId });
  return data.tasks.edges[0]?.node ?? null;
}

export async function createVisitService(
  payload: CreateVisitServicePayload,
  technicianName: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  try {
    const task = await fetchTaskNode(payload.taskId);
    if (!task) {
      return { success: false, error: "Visita não encontrada." };
    }

    const markdown = task.bodyV2?.markdown || "";
    const existing = parseVisitServicesMarker(markdown);
    const duplicate = existing.find((r) => r.clientRequestId === payload.clientRequestId);
    if (duplicate) {
      return { success: true, opportunityId: duplicate.opportunityId };
    }

    const services = buildVisitServicesFromTaskNode(task);
    const primaryId = resolvePrimaryOpportunityId(services);
    const primaryOpp = task.taskTargets?.edges
      ?.map((e: any) => e.node?.targetOpportunity)
      .find((o: any) => o?.id === primaryId);

    if (!primaryOpp) {
      return { success: false, error: "Serviço principal não encontrado nesta visita." };
    }

    const personId =
      task.taskTargets?.edges?.find((e: any) => e.node?.targetPerson)?.node?.targetPerson?.id ||
      primaryOpp.pointOfContact?.id;

    const mode =
      payload.mode ??
      defaultModeForServiceType(payload.serviceType);

    if (
      (payload.serviceType === "TIRAR_MEDIDAS" || payload.serviceType === "REMEDICAO") &&
      mode === "later"
    ) {
      return { success: false, error: "Medição e remediação têm de ser feitas agora." };
    }

    const clientLabel =
      primaryOpp.name?.split("—")[0]?.trim() ||
      primaryOpp.name ||
      "Cliente";
    const oppName = `${getExtraServiceTypeLabel(payload.serviceType)} — ${clientLabel}`;
    const stage = SERVICE_TYPE_STAGE[payload.serviceType];

    const createData: Record<string, unknown> = {
      name: oppName,
      pointOfContactId: personId,
      stage,
      disponibilidadeDoCliente: new Date().toISOString(),
      moradaDeServico: primaryOpp.moradaDeServico,
      notasImportantes: {
        markdown: payload.notes?.trim()
          ? payload.notes.trim()
          : `Serviço extra pedido no local durante a visita ${payload.taskId}.`,
      },
    };

    const created = await crmFetch<{ createOpportunity: { id: string } }>(
      `mutation createVisitOpp($data: OpportunityCreateInput!) {
        createOpportunity(data: $data) { id }
      }`,
      { data: createData }
    );

    const opportunityId = created.createOpportunity.id;

    await crmFetch(
      `mutation linkVisitOpp($data: TaskTargetCreateInput!) {
        createTaskTarget(data: $data) { id }
      }`,
      { data: { taskId: payload.taskId, targetOpportunityId: opportunityId } }
    );

    const record: VisitServiceMarkerRecord = {
      opportunityId,
      clientRequestId: payload.clientRequestId,
      serviceType: payload.serviceType,
      mode,
      createdAt: new Date().toISOString(),
    };
    const updatedMarkdown = writeVisitServicesMarker(markdown, [...existing, record]);

    await crmFetch(
      `mutation patchTaskVisitMarker($id: UUID!, $data: TaskUpdateInput!) {
        updateTask(id: $id, data: $data) { id }
      }`,
      { id: payload.taskId, data: { bodyV2: { markdown: updatedMarkdown } } }
    );

    await createOpportunityNote(
      opportunityId,
      personId || null,
      "Criado no local",
      `Criado no local por ${technicianName} durante a visita ${payload.taskId}.`
    );

    if (payload.measurements?.groups?.length) {
      const measureResult = await saveMeasurements(
        payload.taskId,
        opportunityId,
        payload.measurements
      );
      if (!measureResult.success) {
        return {
          success: false,
          error: measureResult.error || "Serviço criado, mas não foi possível guardar as medições.",
          opportunityId,
        };
      }
    }

    await invalidateAdminCrmCache();
    return { success: true, opportunityId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o serviço extra.";
    console.error("[createVisitService]", error);
    return { success: false, error: message };
  }
}

function taskLinksOpportunity(
  task: { taskTargets?: { edges?: Array<{ node?: { targetOpportunityId?: string } }> } },
  opportunityId: string
): boolean {
  return (
    task.taskTargets?.edges?.some(
      (edge) => edge.node?.targetOpportunityId === opportunityId
    ) ?? false
  );
}

function findOnSiteRecord(
  task: {
    bodyV2?: { markdown?: string | null };
    taskTargets?: { edges?: Array<{ node?: { targetOpportunityId?: string } }> };
  },
  opportunityId: string
): VisitServiceMarkerRecord | undefined {
  if (!taskLinksOpportunity(task, opportunityId)) return undefined;
  return parseVisitServicesMarker(task.bodyV2?.markdown).find(
    (r) => r.opportunityId === opportunityId
  );
}

function getPrimaryOpportunityFromTask(task: any) {
  const services = buildVisitServicesFromTaskNode(task);
  const primaryId = resolvePrimaryOpportunityId(services);
  return task.taskTargets?.edges
    ?.map((e: any) => e.node?.targetOpportunity)
    .find((o: any) => o?.id === primaryId);
}

export async function deleteVisitService(
  taskId: string,
  opportunityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await fetchTaskNode(taskId);
    if (!task) return { success: false, error: "Visita não encontrada." };

    const record = findOnSiteRecord(task, opportunityId);
    if (!record) {
      return { success: false, error: "Só pode apagar serviços extra criados no local." };
    }

    const primaryId = resolvePrimaryOpportunityId(buildVisitServicesFromTaskNode(task));
    if (opportunityId === primaryId) {
      return { success: false, error: "O serviço principal da visita não pode ser apagado." };
    }

    const markdown = task.bodyV2?.markdown || "";
    const targetNode = task.taskTargets?.edges?.find(
      (e: any) => e.node?.targetOpportunityId === opportunityId
    )?.node;

    if (targetNode?.id) {
      await crmFetch(
        `mutation delTaskTarget($id: UUID!) {
          deleteTaskTarget(id: $id) { id }
        }`,
        { id: targetNode.id }
      );
    }

    await crmFetch(
      `mutation delVisitOpp($id: UUID!) {
        deleteOpportunity(id: $id) { id }
      }`,
      { id: opportunityId }
    );

    const remaining = parseVisitServicesMarker(markdown).filter(
      (r) => r.opportunityId !== opportunityId
    );
    const updatedMarkdown = writeVisitServicesMarker(markdown, remaining);
    await crmFetch(
      `mutation patchTaskVisitMarker($id: UUID!, $data: TaskUpdateInput!) {
        updateTask(id: $id, data: $data) { id }
      }`,
      { id: taskId, data: { bodyV2: { markdown: updatedMarkdown } } }
    );

    await invalidateAdminCrmCache();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível apagar o serviço extra.";
    return { success: false, error: message };
  }
}

export async function updateVisitService(
  payload: UpdateVisitServicePayload,
  technicianName: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  try {
    const task = await fetchTaskNode(payload.taskId);
    if (!task) return { success: false, error: "Visita não encontrada." };

    const markdown = task.bodyV2?.markdown || "";
    const records = parseVisitServicesMarker(markdown);
    const existingRecord = findOnSiteRecord(task, payload.opportunityId);
    if (!existingRecord) {
      return { success: false, error: "Só pode editar serviços extra criados no local." };
    }
    const index = records.findIndex((r) => r.opportunityId === payload.opportunityId);

    const mode = payload.mode ?? records[index].mode ?? "now";
    if (
      (payload.serviceType === "TIRAR_MEDIDAS" || payload.serviceType === "REMEDICAO") &&
      mode === "later"
    ) {
      return { success: false, error: "Medição e remediação têm de ser feitas agora." };
    }

    const primaryOpp = getPrimaryOpportunityFromTask(task);
    const clientLabel =
      primaryOpp?.name?.split("—")[0]?.trim() || primaryOpp?.name || "Cliente";
    const oppName = `${getExtraServiceTypeLabel(payload.serviceType)} — ${clientLabel}`;
    const stage = SERVICE_TYPE_STAGE[payload.serviceType];

    await crmFetch(
      `mutation updateVisitOpp($id: UUID!, $data: OpportunityUpdateInput!) {
        updateOpportunity(id: $id, data: $data) { id }
      }`,
      {
        id: payload.opportunityId,
        data: {
          name: oppName,
          stage,
          notasImportantes: {
            markdown:
              payload.notes?.trim() ||
              `Serviço extra atualizado no local durante a visita ${payload.taskId}.`,
          },
        },
      }
    );

    records[index] = {
      ...records[index],
      serviceType: payload.serviceType,
      mode,
    };
    const updatedMarkdown = writeVisitServicesMarker(markdown, records);
    await crmFetch(
      `mutation patchTaskVisitMarker($id: UUID!, $data: TaskUpdateInput!) {
        updateTask(id: $id, data: $data) { id }
      }`,
      { id: payload.taskId, data: { bodyV2: { markdown: updatedMarkdown } } }
    );

    const personId =
      task.taskTargets?.edges?.find(
        (e: any) => e.node?.targetOpportunityId === payload.opportunityId
      )?.node?.targetOpportunity?.pointOfContact?.id ||
      primaryOpp?.pointOfContact?.id;

    await createOpportunityNote(
      payload.opportunityId,
      personId || null,
      "Serviço extra atualizado",
      `Atualizado no local por ${technicianName}.`
    );

    if (payload.measurements?.groups?.length) {
      const measureResult = await saveMeasurements(
        payload.taskId,
        payload.opportunityId,
        payload.measurements
      );
      if (!measureResult.success) {
        return {
          success: false,
          error: measureResult.error || "Serviço atualizado, mas não foi possível guardar as medições.",
          opportunityId: payload.opportunityId,
        };
      }
    }

    await invalidateAdminCrmCache();
    return { success: true, opportunityId: payload.opportunityId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o serviço extra.";
    return { success: false, error: message };
  }
}

export async function mergeTaskBodyWithObservations(
  taskId: string,
  observations?: string
): Promise<string | undefined> {
  const task = await fetchTaskNode(taskId);
  if (!task) return observations?.trim() || undefined;
  const existing = task.bodyV2?.markdown || "";
  const records = parseVisitServicesMarker(existing);
  const stripped = stripVisitServicesMarker(existing);
  let body = stripped;
  if (observations?.trim()) {
    const safeObservations = sanitizeUserMarkdown(observations);
    body = safeObservations;
    if (stripped && stripped !== safeObservations) {
      body = `${safeObservations}\n\n${stripped}`;
    }
  }
  return writeVisitServicesMarker(body, records);
}
