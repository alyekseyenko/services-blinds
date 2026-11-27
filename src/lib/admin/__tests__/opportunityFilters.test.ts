import { describe, expect, it } from "vitest";
import {
  buildAdminTechnicianRoster,
  buildMapTechnicianOptions,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
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

describe("filtros de técnicos no painel admin", () => {
  it("inclui todos os técnicos registados no mapa mesmo sem visitas ativas e põe Não Atribuído no fim", () => {
    const options = buildMapTechnicianOptions(
      [
        opp({ twentyId: "1", technician: "Hugo Lança" }),
        opp({ twentyId: "2", technician: "Não Atribuído" }),
      ],
      [],
      ["David Monteiro", "Hugo Lança"]
    );
    expect(options).toEqual([
      { name: "David Monteiro", isLive: false },
      { name: "Hugo Lança", isLive: false },
      { name: "Não Atribuído", isLive: false },
    ]);
  });

  it("gera a lista de técnicos para Calendário e pesquisa com a equipa toda e sem Não Atribuído", () => {
    const roster = buildAdminTechnicianRoster({
      workspaceMembers: [{ name: "David Monteiro" }, { name: "Hugo Lança" }],
      opportunities: [opp({ twentyId: "1", technician: "Não Atribuído" })],
      techniciansLocations: [],
    });
    expect(roster).toEqual(["David Monteiro", "Hugo Lança"]);
  });
});
