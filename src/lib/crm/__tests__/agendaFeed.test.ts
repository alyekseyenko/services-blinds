import { describe, expect, it } from "vitest";
import { mapAgendaFeedTaskNode } from "../agendaFeed";

describe("mapAgendaFeedTaskNode", () => {
  it("maps primary opportunity and on-site service ids", () => {
    const mapped = mapAgendaFeedTaskNode({
      id: "task-1",
      title: "Medição",
      status: "EM_CURSO",
      dueAt: "2026-06-01T09:00:00.000Z",
      assigneeId: "tech-1",
      technicianName: "João",
      bodyV2: {
        markdown:
          'Cliente ausente\n\n<!-- [VISIT_SERVICES][{"opportunityId":"opp-extra","clientRequestId":"c1","serviceType":"REPARACAO","mode":"now","createdAt":"2026-06-01"}] -->',
      },
      taskTargets: {
        edges: [
          {
            node: {
              targetOpportunity: {
                id: "opp-main",
                name: "Serviço principal",
                nsi: 42,
                pointOfContact: {
                  name: { firstName: "Maria", lastName: "Silva" },
                },
              },
            },
          },
        ],
      },
    });

    expect(mapped.id).toBe("task-1");
    expect(mapped.opportunityId).toBe("opp-main");
    expect(mapped.client).toBe("Maria Silva");
    expect(mapped.onSiteOpportunityIds).toEqual(["opp-extra"]);
    expect(mapped.onSiteServices?.[0]).toMatchObject({
      opportunityId: "opp-extra",
      serviceType: "REPARACAO",
      mode: "now",
    });
    expect(mapped.statusNote).toBe("Cliente ausente");
  });
});
