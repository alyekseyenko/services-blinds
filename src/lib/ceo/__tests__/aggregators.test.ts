import { describe, it, expect } from "vitest";
import { CRM_STAGES } from "@/lib/crm/contract";
import {
  computeCeoFinancialMetrics,
  computeCeoMonthlyEvolution,
  computeCeoFieldEfficiencyAndRankings,
  computeCeoUpcomingFollowUps,
  computeCeoWarehouseStats,
} from "@/lib/ceo/aggregators";

describe("computeCeoFinancialMetrics", () => {
  it("calcula win rate financeiro e forecast ponderado", () => {
    const opps = [
      { stage: CRM_STAGES.CONCLUIDO, amount: { amountMicros: 100_000_000 } },
      { stage: "CANCELADO", amount: { amountMicros: 50_000_000 } },
      { stage: CRM_STAGES.ORCAMENTAR, amount: { amountMicros: 200_000_000 } },
    ];
    const fin = computeCeoFinancialMetrics(opps);
    expect(fin.wonRevenue).toBe(100);
    expect(fin.lostRevenue).toBe(50);
    expect(fin.forecastPipeline).toBe(200);
    expect(fin.financialWinRate).toBeCloseTo(66.7, 0);
    expect(fin.weightedForecast).toBeGreaterThan(0);
  });
});

describe("computeCeoMonthlyEvolution", () => {
  it("agrega receita no mês de criação", () => {
    const jan = new Date(2025, 0, 15).toISOString();
    const opps = [{ createdAt: jan, stage: CRM_STAGES.CONCLUIDO, amount: { amountMicros: 10_000_000 } }];
    const months = computeCeoMonthlyEvolution(opps);
    expect(months[0].completed).toBe(1);
    expect(months[0].revenue).toBe(10);
  });
});

describe("computeCeoFieldEfficiencyAndRankings", () => {
  it("ordena técnicos por concluídos e taxa de sucesso", () => {
    const tasks = [
      { status: "CONCLUIDO", technicianName: "Ana" },
      { status: "CONCLUIDO", technicianName: "Ana" },
      { status: "INCOMPLETO", technicianName: "Bruno" },
      { status: "CONCLUIDO", technicianName: "Bruno" },
    ];
    const { technicianRankings } = computeCeoFieldEfficiencyAndRankings(tasks, []);
    expect(technicianRankings[0].name).toBe("Ana");
    expect(technicianRankings[0].completedCount).toBe(2);
  });
});

describe("computeCeoUpcomingFollowUps", () => {
  it("classifica follow-up atrasado", () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    const opps = [{ id: "1", name: "Cliente", dataDeFollowUp: past.toISOString(), stage: CRM_STAGES.ENTRADA }];
    const list = computeCeoUpcomingFollowUps(opps);
    expect(list[0].urgencyStatus).toBe("OVERDUE");
    expect(list[0].daysRemaining).toBeLessThan(0);
  });
});

describe("computeCeoWarehouseStats", () => {
  it("usa stats da BD quando disponíveis", () => {
    const db = { preparedItems: 8, totalItems: 10, pendingItems: 2, preparationRate: 80 };
    expect(computeCeoWarehouseStats(db, [])).toEqual(db);
  });

  it("calcula a partir de nós CRM", () => {
    const items = [{ preparado: true }, { preparado: false, estadoDoArmazem: "PREPARADO" }, {}];
    const stats = computeCeoWarehouseStats(null, items);
    expect(stats.preparedItems).toBe(2);
    expect(stats.totalItems).toBe(3);
    expect(stats.preparationRate).toBeCloseTo(66.7, 0);
  });
});