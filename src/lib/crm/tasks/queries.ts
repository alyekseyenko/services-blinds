import "server-only";
import { crmFetch } from "../client";
import { CRM_ADDRESS_GRAPHQL_FIELDS, deriveWorkflowMarkerKey } from "../contract";
import type { AppTask } from "../schemas";
import { isTaskOverdue } from "@/lib/taskUtils";
import { formatServiceNumber } from "../serviceNumber";
import { normalizeClientNif } from "@/lib/crm/clientNif";
import { formatNavigationAddressLine, formatServiceAddressLine } from "@/lib/visits/serviceAddressLine";
import { extractPhonesFromTwenty, getPrimaryPhone } from "../phones";
import { buildVisitServicesFromTaskNode, resolvePrimaryOpportunityId } from "../visitServicesMarker";
import { resolveCalendarEventEnd } from "@/lib/visits/calendarVisitSpan";

export const PHONES_FIELDS = `
  primaryPhoneNumber
  primaryPhoneCallingCode
  additionalPhones {
    number
    callingCode
    countryCode
  }
`;

export const TASK_NODE_FIELDS = `
  id
  title
  status
  dueAt
  horaDeFim
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
          id
          nif
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
          numeroDeServico
          stage
          notasImportantes { markdown }
          pointOfContact {
            id
            nif
            name {
              firstName
              lastName
            }
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

export function displayClientName(person?: {
  name?: { firstName?: string | null; lastName?: string | null } | null;
} | null): string {
  return `${person?.name?.firstName || ""} ${person?.name?.lastName || ""}`.trim();
}

export function mapTaskNode(node: any): AppTask {
  const edges = node.taskTargets?.edges || [];
  const services = buildVisitServicesFromTaskNode(node);
  const primaryOppId = resolvePrimaryOpportunityId(services);
  const oppTarget =
    edges.find((e: any) => e.node?.targetOpportunity?.id === primaryOppId)?.node?.targetOpportunity ||
    edges.find((e: any) => e.node?.targetOpportunity)?.node?.targetOpportunity;
  const personTarget = edges.find((e: any) => e.node?.targetPerson)?.node?.targetPerson;
  const contactTarget = oppTarget?.pointOfContact;
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
    visitEndAt: (() => {
      const start = node.dueAt ? new Date(node.dueAt) : null;
      if (!start || Number.isNaN(start.getTime())) return undefined;
      const end = resolveCalendarEventEnd(start, node.horaDeFim ?? null);
      return end;
    })(),
    address: (() => {
      const oppMorada = oppTarget?.moradaDeServico;
      const taskMorada = node.moradaDaReparacao;
      const parts = {
        addressStreet1:
          oppMorada?.addressStreet1?.trim() || taskMorada?.addressStreet1?.trim() || "",
        addressStreet2:
          oppMorada?.addressStreet2?.trim() || taskMorada?.addressStreet2?.trim() || "",
        addressCity: oppMorada?.addressCity?.trim() || taskMorada?.addressCity?.trim() || "",
        addressPostcode:
          oppMorada?.addressPostcode?.trim() || taskMorada?.addressPostcode?.trim() || "",
      };
      return formatServiceAddressLine(parts, "Endereço não especificado");
    })(),
    navigationAddress: (() => {
      const oppMorada = oppTarget?.moradaDeServico;
      const taskMorada = node.moradaDaReparacao;
      return formatNavigationAddressLine(
        {
          addressStreet1:
            oppMorada?.addressStreet1?.trim() || taskMorada?.addressStreet1?.trim() || "",
          addressCity: oppMorada?.addressCity?.trim() || taskMorada?.addressCity?.trim() || "",
          addressPostcode:
            oppMorada?.addressPostcode?.trim() || taskMorada?.addressPostcode?.trim() || "",
        },
        "Endereço não especificado"
      );
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
    client: displayClientName(personTarget) || displayClientName(contactTarget) || 'Cliente',
    clientNif: normalizeClientNif(contactTarget, personTarget),
    report: node.bodyV2?.markdown || oppTarget?.notasImportantes?.markdown || '',
    opportunityId: oppTarget?.id,
    nsi:
      oppTarget?.nsi != null && String(oppTarget.nsi).trim() !== ""
        ? String(oppTarget.nsi)
        : "N/A",
    serviceNumber: formatServiceNumber(oppTarget?.numeroDeServico),
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
export type OpportunityPipelineContext = {
  id: string;
  name?: string | null;
  stage?: string | null;
  nsi?: number | string | null;
  pointOfContact?: {
    id?: string;
    emails?: { primaryEmail?: string };
  } | null;
};

export async function fetchOpportunityPipelineContext(
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
