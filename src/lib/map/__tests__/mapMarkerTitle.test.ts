import { describe, expect, it } from "vitest";
import { buildMapMarkerHoverTitle } from "@/lib/map/mapMarkerTitle";

describe("buildMapMarkerHoverTitle", () => {
  it("oportunidade em Entrada sem tarefa agendada", () => {
    const label = buildMapMarkerHoverTitle({
      title: "TIRAR MEDIDAS",
      stage: "ENTRADA",
      hasScheduledTask: false,
      dueDate: "2026-03-16T09:26:00.000Z",
    });
    expect(label).toMatch(/^Por agendar · criado /);
    expect(label).toContain("TIRAR MEDIDAS");
    expect(label).not.toMatch(/^Agendada/);
  });

  it("visita agendada usa scheduledAt, não createdAt", () => {
    const label = buildMapMarkerHoverTitle({
      title: "Instalação",
      stage: "AGENDAR_INSTALACAO",
      hasScheduledTask: true,
      dueDate: "2026-03-16T09:26:00.000Z",
      scheduledAt: "2026-03-20T14:30:00.000Z",
    });
    expect(label).toMatch(/^Agendada · /);
    expect(label).not.toContain("09:26");
  });

  it("atrasada com hora de visita", () => {
    const label = buildMapMarkerHoverTitle({
      title: "Medição",
      stage: "REMEDICAO",
      hasScheduledTask: true,
      scheduledAt: "2026-03-16T08:00:00.000Z",
      isLate: true,
    });
    expect(label).toMatch(/^Atrasada · /);
  });
});