import { describe, expect, it } from "vitest";
import {
  opportunityMatchesSearch,
  searchOpportunities,
  suggestMapTabForOpportunity,
} from "@/lib/admin/opportunitySearch";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity>): Opportunity {
  return {
    id: "1",
    twentyId: "tw-1",
    title: "Instalação",
    client: "Cliente Alpha",
    address: "Rua das Flores 10, Lisboa",
    coordinates: null,
    stage: "AGENDADO",
    status: "open",
    scheduledAt: null,
    dueDate: null,
    hasScheduledTask: false,
    taskStatus: "TODO",
    taskId: "task-99",
    nsi: "NSI-2024-001",
    technician: "João Silva",
    ...partial,
  };
}

describe("opportunityMatchesSearch", () => {
  it("matches NSI, cliente e morada", () => {
    const o = opp({});
    expect(opportunityMatchesSearch(o, "NSI-2024")).toBe(true);
    expect(opportunityMatchesSearch(o, "alpha")).toBe(true);
    expect(opportunityMatchesSearch(o, "flores")).toBe(true);
    expect(opportunityMatchesSearch(o, "inexistente")).toBe(false);
  });
});

describe("searchOpportunities", () => {
  it("ordena correspondência exacta de NSI primeiro", () => {
    const list = [
      opp({ id: "a", nsi: "NSI-2024-002", client: "B" }),
      opp({ id: "b", nsi: "NSI-2024-001", client: "A" }),
    ];
    const results = searchOpportunities(list, "NSI-2024-001", 5);
    expect(results[0]?.id).toBe("b");
  });
});

describe("suggestMapTabForOpportunity", () => {
  it("usa scheduled quando há visita agendada", () => {
    expect(suggestMapTabForOpportunity(opp({ hasScheduledTask: true }))).toBe("scheduled");
    expect(suggestMapTabForOpportunity(opp({ hasScheduledTask: false }))).toBe("unscheduled");
  });
});
