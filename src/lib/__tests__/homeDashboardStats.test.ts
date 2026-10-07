import { describe, expect, it } from "vitest";
import { computeAdminHomeDashboardStats } from "@/lib/admin/homeDashboardStats";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity> & { twentyId: string }): Opportunity {
  const { twentyId, ...rest } = partial;
  return {
    id: twentyId,
    twentyId,
    client: "Cliente",
    title: "Visita",
    status: "AGENDADO",
    stage: "PREPARACAO",
    address: "",
    ...rest,
  } as Opportunity;
}

describe("computeAdminHomeDashboardStats", () => {
  it("conta por agendar e sem GPS", () => {
    const stats = computeAdminHomeDashboardStats([
      opp({ twentyId: "1", stage: "ENTRADA", status: "" }),
      opp({ twentyId: "2", status: "INCOMPLETO" }),
    ]);
    expect(stats.toSchedule).toBe(1);
    expect(stats.incomplete).toBe(1);
    expect(stats.activePipeline).toBe(2);
    expect(stats.statusChart.some((b) => b.id === "incomplete")).toBe(true);
  });

  it("agrupa tipos de serviço em aberto", () => {
    const stats = computeAdminHomeDashboardStats([
      opp({
        twentyId: "1",
        stage: "ENTRADA",
        status: "",
        serviceType: "TIRAR_MEDIDAS",
      }),
      opp({
        twentyId: "2",
        stage: "MARCAR_INSTALACAO",
        status: "",
        serviceType: "INSTALACAO",
      }),
      opp({ twentyId: "3", status: "CONCLUIDO", serviceType: "INSTALACAO" }),
    ]);
    expect(stats.serviceTypeChart).toHaveLength(2);
    expect(stats.serviceTypeChart.find((b) => b.id === "TIRAR_MEDIDAS")?.count).toBe(1);
    expect(stats.serviceTypeChart.find((b) => b.id === "INSTALACAO")?.count).toBe(1);
  });
});
