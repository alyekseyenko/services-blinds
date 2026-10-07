import { describe, expect, it } from "vitest";
import {
  opportunityMatchesSearch,
  scoreOpportunitySearchMatch,
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
  it("prioriza nome do cliente sobre NSI", () => {
    const list = [
      opp({ id: "nsi", nsi: "9999", client: "Outro", title: "Instalação" }),
      opp({ id: "cliente", nsi: "1111", client: "Silva & Filhos", title: "Manutenção" }),
    ];
    const results = searchOpportunities(list, "silva", 5);
    expect(results[0]?.id).toBe("cliente");
    expect(scoreOpportunitySearchMatch(list[1], "silva")).toBeGreaterThan(50);
    expect(scoreOpportunitySearchMatch(list[0], "9999")).toBeLessThan(40);
  });

  it("ainda encontra por NSI numérico (menor prioridade)", () => {
    const list = [
      opp({ id: "a", nsi: "NSI-2024-002", client: "B" }),
      opp({ id: "b", nsi: "NSI-2024-001", client: "A" }),
    ];
    const results = searchOpportunities(list, "NSI-2024-001", 5);
    expect(results[0]?.id).toBe("b");
  });

  it("aceita NSI numérico do CRM", () => {
    const row = opp({ id: "n", client: "Z" });
    const list: Opportunity[] = [{ ...row, nsi: 12345 as unknown as Opportunity["nsi"] }];
    expect(() => searchOpportunities(list, "1234", 5)).not.toThrow();
    expect(searchOpportunities(list, "12345", 5)[0]?.id).toBe("n");
  });

  it("não falha quando o cliente está em falta no CRM", () => {
    const list = [
      opp({ id: "a", client: "", title: "Morada Rua X" }),
      opp({ id: "b", client: "", title: "Morada Rua Y" }),
    ];
    expect(() => searchOpportunities(list, "rua", 5)).not.toThrow();
    expect(searchOpportunities(list, "rua", 5).length).toBe(2);
  });
});

describe("suggestMapTabForOpportunity", () => {
  it("usa scheduled quando há visita agendada", () => {
    expect(suggestMapTabForOpportunity(opp({ hasScheduledTask: true }))).toBe("scheduled");
    expect(suggestMapTabForOpportunity(opp({ hasScheduledTask: false }))).toBe("unscheduled");
  });
});
