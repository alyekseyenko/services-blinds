import "server-only";

import { crmFetch } from "@/lib/crm/client";
import {
  CRM_TASK_CLIENT_AVAILABILITY,
  CRM_TASK_STATUS,
} from "@/lib/crm/contract";

export const LUXURY_E2E_EMAIL_DOMAIN = "e2e.luxury.";
export const LUXURY_E2E_NSI_MIN = 880_000;
export const LUXURY_E2E_TITLE_PREFIX = "[E2E Luxury]";

export interface BrazilServiceTemplateInput {
  key: string;
  workflow: string;
  stage: string;
  title: string;
  city: string;
  state: string;
  street: string;
  postcode: string;
  lat: number;
  lng: number;
}

export async function createLuxuryE2ePerson(runId: string): Promise<{
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

export async function createLuxuryE2eOpportunity(
  personId: string,
  template: BrazilServiceTemplateInput,
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
          markdown: `${LUXURY_E2E_TITLE_PREFIX} automated workflow test for ${template.workflow} in ${template.city}.`,
        },
      },
    }
  );

  return {
    opportunityId: data.createOpportunity.id,
    nsi: data.createOpportunity.nsi ?? nsi,
  };
}

export async function deleteLuxuryE2eTask(taskId: string): Promise<void> {
  await crmFetch(
    `mutation deleteLuxuryTask($id: UUID!) {
      deleteTask(id: $id) { id }
    }`,
    { id: taskId }
  );
}

export async function deleteLuxuryE2eOpportunity(opportunityId: string): Promise<void> {
  await crmFetch(
    `mutation deleteLuxuryOpp($id: UUID!) {
      deleteOpportunity(id: $id) { id }
    }`,
    { id: opportunityId }
  );
}

export async function deleteLuxuryE2ePerson(personId: string): Promise<void> {
  await crmFetch(
    `mutation deleteLuxuryPerson($id: UUID!) {
      deletePerson(id: $id) { id }
    }`,
    { id: personId }
  );
}

export async function confirmLuxuryE2eVisit(taskId: string): Promise<void> {
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

export async function cleanupLuxuryArtifacts(params: {
  personId?: string;
  services: Array<{ opportunityId: string; taskId?: string }>;
}): Promise<void> {
  for (const service of params.services) {
    if (service.taskId) {
      try {
        await deleteLuxuryE2eTask(service.taskId);
      } catch {
        /* best effort */
      }
    }
    try {
      await deleteLuxuryE2eOpportunity(service.opportunityId);
    } catch {
      /* best effort */
    }
  }
  if (params.personId) {
    try {
      await deleteLuxuryE2ePerson(params.personId);
    } catch {
      /* best effort */
    }
  }
}

export async function cleanupStaleLuxuryE2eData(): Promise<{
  personsDeleted: number;
  opportunitiesDeleted: number;
  tasksDeleted: number;
  notesDeleted: number;
}> {
  const result = {
    personsDeleted: 0,
    opportunitiesDeleted: 0,
    tasksDeleted: 0,
    notesDeleted: 0,
  };

  const opps = await crmFetch<{
    opportunities: { edges: Array<{ node: { id: string; name?: string; nsi?: number } }> };
  }>(
    `query staleLuxuryOpps {
      opportunities(filter: { nsi: { gte: ${LUXURY_E2E_NSI_MIN} } }, first: 50) {
        edges { node { id name nsi } }
      }
    }`,
    {}
  );

  for (const edge of opps.opportunities.edges) {
    const node = edge.node;
    if (!node.name?.includes(LUXURY_E2E_TITLE_PREFIX)) continue;

    const tasks = await crmFetch<{
      tasks: { edges: Array<{ node: { id: string } }> };
    }>(
      `query luxuryOppTasks($oppId: UUID!) {
        tasks(filter: { opportunityId: { eq: $oppId } }, first: 20) {
          edges { node { id } }
        }
      }`,
      { oppId: node.id }
    );

    for (const taskEdge of tasks.tasks.edges) {
      try {
        await deleteLuxuryE2eTask(taskEdge.node.id);
        result.tasksDeleted += 1;
      } catch {
        /* ignore */
      }
    }

    try {
      await deleteLuxuryE2eOpportunity(node.id);
      result.opportunitiesDeleted += 1;
    } catch {
      /* ignore */
    }
  }

  const people = await crmFetch<{
    people: { edges: Array<{ node: { id: string; emails?: { primaryEmail?: string } } }> };
  }>(
    `query staleLuxuryPeople {
      people(filter: { emails: { primaryEmail: { ilike: "%${LUXURY_E2E_EMAIL_DOMAIN}%" } } }, first: 50) {
        edges { node { id emails { primaryEmail } } }
      }
    }`,
    {}
  );

  for (const edge of people.people.edges) {
    const email = edge.node.emails?.primaryEmail ?? "";
    if (!email.includes(LUXURY_E2E_EMAIL_DOMAIN)) continue;
    try {
      await deleteLuxuryE2ePerson(edge.node.id);
      result.personsDeleted += 1;
    } catch {
      /* ignore */
    }
  }

  return result;
}
