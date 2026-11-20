import { describe, expect, it } from "vitest";
import { filterMapOpportunities } from "@/lib/admin/opportunityFilters";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity>): Opportunity {
  return {
    id: partial.twentyId ?? "1",
    twentyId: "tw-1",
    title: "Serviço",
    client: "Cliente",
    address: "Rua 1",
    coordinates: [39.4, -9.1],
    stage: "TIRAR_MEDIDAS",
    status: "POR_AGENDAR",
    scheduledAt: null,
    dueDate: new Date("2026-11-01T10:00:00.000Z"),
    hasScheduledTask: false,
    taskStatus: "POR_AGENDAR",
    taskId: "task-1",
    ...partial,
  };
}

const baseOptions = {
  mapTab: "all",
  cityFilter: null,
  serviceTypeFilters: [],
} as const;

describe("filterMapOpportunities", () => {
  it("esconde Entrada em todos os separadores, mesmo com visita ainda activa", () => {
    const entrada = opp({ twentyId: "entrada", stage: "ENTRADA", hasScheduledTask: true });
    expect(
      filterMapOpportunities([entrada], { ...baseOptions, mapTab: "all" }).map((o) => o.twentyId)
    ).toEqual([]);
    expect(
      filterMapOpportunities([entrada], { ...baseOptions, mapTab: "unscheduled" }).map(
        (o) => o.twentyId
      )
    ).toEqual([]);
    expect(
      filterMapOpportunities([entrada], { ...baseOptions, mapTab: "scheduled" }).map(
        (o) => o.twentyId
      )
    ).toEqual([]);
  });

  it("mostra de novo quando a etapa passa a ser operacional", () => {
    const stages = ["TIRAR_MEDIDAS", "REMEDICAO", "REPARACAO", "MANUTENCAO", "MARCAR_INSTALACAO"];
    const visible = filterMapOpportunities(
      stages.map((stage) => opp({ twentyId: stage, stage, hasScheduledTask: false })),
      { ...baseOptions, mapTab: "unscheduled" }
    ).map((o) => o.twentyId);
    expect(visible).toEqual(stages);
  });
});
