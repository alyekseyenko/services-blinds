import { describe, expect, it } from "vitest";
import {
  MAP_LEGEND_ROUTE_ITEMS,
  MAP_LEGEND_STATUS_ITEMS,
  MAP_LEGEND_TECH_DOT_TITLE,
  MAP_LEGEND_UNASSIGNED_TECH_LABEL,
  mapLegendHowToRead,
} from "@/lib/map/mapLegendCopy";

describe("mapLegendCopy", () => {
  it("explica a bolinha do técnico como visita agendada", () => {
    const scheduled = MAP_LEGEND_STATUS_ITEMS.find((i) => i.label === "Agendada");
    expect(scheduled?.technicianDot).toBe(true);
    expect(scheduled?.detail.toLowerCase()).toContain("técnico");
    expect(mapLegendHowToRead("admin").some((line) => line.includes("bolinha"))).toBe(true);
  });

  it("a secção de técnicos pede a lista por pessoa", () => {
    expect(MAP_LEGEND_TECH_DOT_TITLE.toLowerCase()).toContain("técnicos");
  });

  it("lista concluída, incompleta e cancelada", () => {
    const labels = MAP_LEGEND_STATUS_ITEMS.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Concluída", "Incompleta", "Cancelada", "Atrasada"])
    );
  });

  it("explica histórico ao filtrar técnico no admin", () => {
    const lines = mapLegendHowToRead("admin").join(" ");
    expect(lines.toLowerCase()).toContain("histórico");
    expect(lines.toLowerCase()).toContain("cancelado");
  });

  it("explica a carrinha GPS e o logótipo da sede", () => {
    const lines = mapLegendHowToRead("admin").join(" ").toLowerCase();
    expect(lines).toContain("carrinha");
    expect(lines).toContain("logótipo");
  });

  it("explica os pinos do percurso ao escolher um técnico", () => {
    const labels = MAP_LEGEND_ROUTE_ITEMS.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Por fazer", "Próxima", "Atrasada", "Concluída", "Incompleta", "Cancelada"])
    );
  });

  it("explica a bolinha verde como nenhum técnico atribuído", () => {
    expect(MAP_LEGEND_UNASSIGNED_TECH_LABEL.toLowerCase()).toContain("nenhum técnico");
    const unscheduled = MAP_LEGEND_STATUS_ITEMS.find((i) => i.label === "Por agendar");
    expect(unscheduled?.technicianColor).toBe("unassigned");
    const lines = mapLegendHowToRead("admin").join(" ").toLowerCase();
    expect(lines).toContain("verde");
    expect(lines).toContain("nenhum técnico");
  });

});