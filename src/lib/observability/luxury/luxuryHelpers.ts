import { crmFetch } from "@/lib/crm/client";
import {
  CRM_STAGES,
  CRM_TASK_CLIENT_AVAILABILITY,
  CRM_TASK_STATUS,
  canClientCancelTask,
} from "@/lib/crm/contract";
import { fetchWorkspaceMembers } from "@/lib/crm/members";
import { scheduleVisitCore } from "@/lib/crm/scheduleVisit";
import type { LuxuryServiceArtifact, LuxuryWorkflowActor } from "./luxuryTypes";

export const LUXURY_E2E_PREFIX = "[E2E Luxury]";

export interface BrazilServiceTemplate {
  key: string;
  workflow: LuxuryServiceArtifact["workflow"];
  stage: string;
  title: string;
  city: string;
  state: string;
  street: string;
  postcode: string;
  lat: number;
  lng: number;
}

export const BRAZIL_SERVICE_TEMPLATES: BrazilServiceTemplate[] = [
  {
    key: "measurement",
    workflow: "measurement",
    stage: CRM_STAGES.ENTRADA,
    title: `${LUXURY_E2E_PREFIX} Blinds Measurement`,
    city: "São Paulo",
    state: "SP",
    street: "Avenida Paulista, 1000",
    postcode: "01310-100",
    lat: -23.561414,
    lng: -46.655881,
  },
  {
    key: "repair",
    workflow: "repair",
    stage: CRM_STAGES.REPARACAO,
    title: `${LUXURY_E2E_PREFIX} Blind Repair`,
    city: "Rio de Janeiro",
    state: "RJ",
    street: "Rua Visconde de Pirajá, 500",
    postcode: "22410-002",
    lat: -22.9838,
    lng: -43.2096,
  },
  {
    key: "maintenance",
    workflow: "maintenance",
    stage: CRM_STAGES.MANUTENCAO,
    title: `${LUXURY_E2E_PREFIX} Preventive Maintenance`,
    city: "Salvador",
    state: "BA",
    street: "Rua Chile, 23",
    postcode: "40020-000",
    lat: -12.977749,
    lng: -38.501629,
  },
  {
    key: "installation",
    workflow: "installation",
    stage: CRM_STAGES.MARCAR_INSTALACAO,
    title: `${LUXURY_E2E_PREFIX} Thermal Blind Installation`,
    city: "Brasília",
    state: "DF",
    street: "SQN 308 Bloco A",
    postcode: "70747-010",
    lat: -15.7801,
    lng: -47.9292,
  },
  {
    key: "unscheduled",
    workflow: "unscheduled",
    stage: CRM_STAGES.ENTRADA,
    title: `${LUXURY_E2E_PREFIX} Forgot to Schedule`,
    city: "Curitiba",
    state: "PR",
    street: "Rua XV de Novembro, 100",
    postcode: "80020-310",
    lat: -25.4284,
    lng: -49.2733,
  },
];

export function isLuxuryE2EEnabled(): boolean {
  return process.env.LUXURY_E2E_ENABLED === "true";
}

export function buildLuxuryRunId(): string {
  const suffix = Math.floor(Math.random() * 900000) + 100000;
  return `luxury-${suffix}-${Date.now()}`;
}

export async function resolveLuxuryTechnician(): Promise<{ id: string; name: string }> {
  const envId = process.env.LUXURY_E2E_TECHNICIAN_ID;
  const envName = process.env.LUXURY_E2E_TECHNICIAN_NAME;
  if (envId && envName) {
    return { id: envId, name: envName };
  }

  const members = await fetchWorkspaceMembers();
  const technician = members[0];
  if (!technician) {
    throw new Error(
      "No technician found in Twenty CRM. Set LUXURY_E2E_TECHNICIAN_ID and LUXURY_E2E_TECHNICIAN_NAME."
    );
  }
  return { id: technician.id, name: technician.name };
}

export async function createLuxuryClient(runId: string): Promise<{
  personId: string;
  email: string;
  name: string;
}> {
  const suffix = runId.split("-")[1] ?? String(Date.now());
  const email = `e2e.luxury.${suffix}@example.com`;
  const data = await crmFetch<{ createPerson: { id: string } }>(
    `mutation createLuxuryPerson($data: PersonCreateInput!) {
      createPerson(data: $data) { id }
    }`,
    {
      data: {
        name: { firstName: "Luxury", lastName: `E2E Client ${suffix}` },
        emails: { primaryEmail: email },
        phones: { primaryPhoneCallingCode: "+55", primaryPhoneNumber: "11999990000" },
      },
    }
  );

  return {
    personId: data.createPerson.id,
    email,
    name: `Luxury E2E Client ${suffix}`,
  };
}

export async function createLuxuryOpportunity(
  personId: string,
  template: BrazilServiceTemplate,
  nsi: number
): Promise<{ opportunityId: string; nsi: number }> {
  const availability = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const data = await crmFetch<{ createOpportunity: { id: string; nsi: number } }>(
    `mutation createLuxuryOpp($data: OpportunityCreateInput!) {
      createOpportunity(data: $data) { id nsi }
    }`,
    {
      data: {
        name: `${template.title} — ${template.city}`,
        nsi,
        pointOfContactId: personId,
        stage: template.stage,
        disponibilidadeDoCliente: availability,
        moradaDeServico: {
          addressStreet1: template.street,
          addressCity: template.city,
          addressState: template.state,
          addressPostcode: template.postcode,
          addressCountry: "Brazil",
          addressLat: template.lat,
          addressLng: template.lng,
        },
        notasImportantes: {
          markdown: `${LUXURY_E2E_PREFIX} automated workflow test for ${template.workflow} in ${template.city}.`,
        },
      },
    }
  );

  return {
    opportunityId: data.createOpportunity.id,
    nsi: data.createOpportunity.nsi ?? nsi,
  };
}

export function futureDueAt(daysAhead: number, hourUtc = 14): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}

export async function scheduleLuxuryVisit(params: {
  actor: LuxuryWorkflowActor;
  technician: { id: string; name: string };
  template: BrazilServiceTemplate;
  opportunityId: string;
  personId: string;
  clientEmail: string;
  clientName: string;
  dueAt: Date;
}): Promise<string> {
  const result = await scheduleVisitCore({
    title: `${params.template.title} — ${params.template.city}`,
    dueAt: params.dueAt,
    notes: `${LUXURY_E2E_PREFIX} scheduling probe for ${params.template.workflow}.`,
    assigneeId: params.technician.id,
    technicianName: params.technician.name,
    morada: {
      addressStreet1: params.template.street,
      addressCity: params.template.city,
      addressState: params.template.state,
      addressPostcode: params.template.postcode,
      addressCountry: "Brazil",
      addressLat: params.template.lat,
      addressLng: params.template.lng,
    },
    opportunityId: params.opportunityId,
    personId: params.personId,
    pointOfContactEmail: params.clientEmail,
    clientName: params.clientName,
    currentStage: params.template.stage,
    scheduledByName: params.actor.userName,
    scheduledByMemberId: params.actor.userId,
    noteTitle: `${LUXURY_E2E_PREFIX} Schedule Note`,
    routeStopLabel: params.template.city,
  });

  return result.taskId;
}

export async function confirmLuxuryVisit(taskId: string): Promise<void> {
  await crmFetch(
    `mutation confirmLuxuryVisit($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) { id status }
    }`,
    {
      id: taskId,
      data: {
        status: CRM_TASK_STATUS.AGENDADO,
        disponibilidadeDoCliente: CRM_TASK_CLIENT_AVAILABILITY.CLIENT_CAN,
      },
    }
  );
}

export async function getTaskStatus(taskId: string): Promise<string | null> {
  const data = await crmFetch<{
    tasks: { edges: Array<{ node: { status?: string } }> };
  }>(
    `query luxuryTaskStatus($id: UUID!) {
      tasks(filter: { id: { eq: $id } }, first: 1) {
        edges { node { status } }
      }
    }`,
    { id: taskId }
  );
  return data.tasks.edges[0]?.node?.status ?? null;
}

export function trackN8nEvent(
  artifacts: { n8nEventsTriggered: string[] },
  eventType: string
): void {
  if (!artifacts.n8nEventsTriggered.includes(eventType)) {
    artifacts.n8nEventsTriggered.push(eventType);
  }
}

export function assertClientCannotCancel(status: string | null): boolean {
  return status ? !canClientCancelTask(status) : false;
}
