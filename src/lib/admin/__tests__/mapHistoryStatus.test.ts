import { describe, expect, it } from "vitest";
import {
  classifyHistoryOutcome,
  matchesHistoryOutcomeFilter,
} from "@/lib/admin/mapHistoryStatus";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity>): Opportunity {
  return {
    id: "1",
    twentyId: "tw-1",
    title: "Serviço",
    client: "Cliente",
    address: "Rua 1",
    coordinates: [39.4, -9.1],
    stage: "ORCAMENTAR",
    status: "ORCAMENTAR",
    scheduledAt: null,
    dueDate: null,
    hasScheduledTask: false,
    taskStatus: "CONCLUIDO",
    taskId: "task-1",
    ...partial,
  };
}

describe("classifyHistoryOutcome", () => {
  it("usa o estado da visita quando a etapa já avançou", () => {
    expect(classifyHistoryOutcome("ORCAMENTAR", "CONCLUIDO")).toBe("completed");
    expect(classifyHistoryOutcome("TIRAR_MEDIDAS", "INCOMPLETO")).toBe("incomplete");
    expect(classifyHistoryOutcome("ENTRADA", "CANCELADO")).toBe("cancelled");
    expect(classifyHistoryOutcome("CONCLUIDO", null)).toBe("completed");
    expect(classifyHistoryOutcome("DONE")).toBe("completed");
  });

  it("o filtro do mapa aceita concluído pela tarefa", () => {
    expect(matchesHistoryOutcomeFilter(opp({}), ["completed"])).toBe(true);
    expect(matchesHistoryOutcomeFilter(opp({}), ["cancelled"])).toBe(false);
  });
});
