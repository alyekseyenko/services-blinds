import { describe, expect, it } from "vitest";
import {
  buildVisitServicesFromTaskNode,
  parseVisitServicesMarker,
  resolvePrimaryOpportunityId,
  sanitizeUserMarkdown,
  writeVisitServicesMarker,
} from "../visitServicesMarker";

describe("visitServicesMarker", () => {
  it("strips all injected marker blocks from user text", () => {
    const injected =
      'Note <!-- [VISIT_SERVICES][{"opportunityId":"x"}] --> tail <!-- [VISIT_SERVICES][] -->';
    expect(sanitizeUserMarkdown(injected)).toBe("Note  tail");
  });

  it("round-trips marker JSON in task markdown", () => {
    const records = [
      {
        opportunityId: "11111111-1111-4111-8111-111111111111",
        clientRequestId: "req-1",
        serviceType: "TIRAR_MEDIDAS" as const,
        mode: "now" as const,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const md = writeVisitServicesMarker("Technician notes", records);
    expect(parseVisitServicesMarker(md)).toEqual(records);
  });

  it("builds services with primary and on-site extra", () => {
    const node = {
      bodyV2: {
        markdown: writeVisitServicesMarker("", [
          {
            opportunityId: "22222222-2222-4222-8222-222222222222",
            clientRequestId: "req-2",
            serviceType: "MANUTENCAO",
            mode: "later",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]),
      },
      taskTargets: {
        edges: [
          {
            node: {
              targetOpportunity: {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Repair — Client",
                stage: "REPARACAO",
              },
            },
          },
          {
            node: {
              targetOpportunity: {
                id: "22222222-2222-4222-8222-222222222222",
                name: "Maintenance — Client",
                stage: "MANUTENCAO",
              },
            },
          },
        ],
      },
    };

    const services = buildVisitServicesFromTaskNode(node);
    expect(services).toHaveLength(2);
    expect(resolvePrimaryOpportunityId(services)).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    const extra = services.find((s) => s.createdOnSite);
    expect(extra?.mode).toBe("later");
    expect(extra?.serviceType).toBe("MANUTENCAO");
  });
});
