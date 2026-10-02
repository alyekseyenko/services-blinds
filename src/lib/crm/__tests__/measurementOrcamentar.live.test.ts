import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const RUN_LIVE = process.env.SMOKE_LIVE_CRM === "1";

describe.runIf(RUN_LIVE)("live CRM: medição → ORCAMENTAR", () => {
  it(
    "agenda visita urgente (título Nazaré) e conclui com oportunidade tipo reparação",
    async () => {
      loadEnvLocal();
      if (process.env.TWENTY_API_URL_OVERRIDE) {
        process.env.TWENTY_API_URL = process.env.TWENTY_API_URL_OVERRIDE;
      }

      const { CRM_STAGES } = await import("@/lib/crm/contract");
      const { updateTaskStatus } = await import("@/lib/crm/tasks");
      const { crmFetch } = await import("@/lib/crm/client");
      const { scheduleVisitCore } = await import("@/lib/crm/scheduleVisit");
      const { fetchWorkspaceMembers } = await import("@/lib/crm/members");

      const suffix = String(Date.now()).slice(-6);
      const members = await fetchWorkspaceMembers();
      const tech = members[0];
      if (!tech?.id) throw new Error("Nenhum membro no Twenty para agendar.");

      const personRes = await crmFetch<{ createPerson: { id: string } }>(
        `mutation($data: PersonCreateInput!) { createPerson(data: $data) { id } }`,
        {
          data: {
            name: { firstName: "Smoke", lastName: `Medição ${suffix}` },
            emails: { primaryEmail: `smoke.medicao.${suffix}@example.invalid` },
          },
        }
      );
      const personId = personRes.createPerson.id;

      const oppRes = await crmFetch<{
        createOpportunity: { id: string; nsi: number; stage: string };
      }>(
        `mutation($data: OpportunityCreateInput!) {
          createOpportunity(data: $data) { id nsi stage }
        }`,
        {
          data: {
            name: `Reparação — Smoke ${suffix}`,
            pointOfContactId: personId,
            stage: CRM_STAGES.ENTRADA,
            moradaDeServico: {
              addressStreet1: "Apartamento praia — Nazaré (smoke)",
              addressCity: "Nazaré",
              addressCountry: "Portugal",
              addressLat: 39.6029,
              addressLng: -9.0701,
            },
          },
        }
      );
      const opportunityId = oppRes.createOpportunity.id;

      const taskTitle = `Visita Técnica - Tirar medidas apartamento praia — Nazaré (${suffix} smoke)`;
      const scheduled = await scheduleVisitCore({
        title: taskTitle,
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        notes: "[Smoke] teste automático pós-deploy medição → ORCAMENTAR.",
        assigneeId: tech.id,
        technicianName: tech.name,
        opportunityId,
        personId,
        currentStage: CRM_STAGES.ENTRADA,
        scheduledByName: "Smoke Bot",
        scheduledByMemberId: tech.id,
        urgent: true,
        morada: {
          addressStreet1: "Apartamento praia — Nazaré",
          addressCity: "Nazaré",
          addressCountry: "Portugal",
          addressLat: 39.6029,
          addressLng: -9.0701,
        },
      });

      const taskId = scheduled.taskId;
      expect(taskId).toBeTruthy();

      await updateTaskStatus(taskId, "EM_CURSO", "[Smoke] em curso.");
      await updateTaskStatus(taskId, "Concluído", "[Smoke] medição concluída.");

      const stageRes = await crmFetch<{
        opportunities: { edges: Array<{ node: { stage: string; nsi: number } }> };
      }>(
        `query($id: UUID!) {
          opportunities(filter: { id: { eq: $id } }, first: 1) {
            edges { node { stage nsi } }
          }
        }`,
        { id: opportunityId }
      );
      const stage = stageRes.opportunities.edges[0]?.node?.stage;
      const nsi = stageRes.opportunities.edges[0]?.node?.nsi;

      console.log(`[Smoke] opportunityId=${opportunityId} nsi=${nsi} stage=${stage} taskId=${taskId}`);
      expect(stage).toBe(CRM_STAGES.ORCAMENTAR);
    },
    120_000
  );
});
