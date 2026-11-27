import { describe, expect, it } from "vitest";
import { collectLegendTechnicianNames } from "@/lib/map/legendTechnicians";

describe("collectLegendTechnicianNames", () => {
  it("lista nomes únicos ordenados e ignora não atribuído", () => {
    const names = collectLegendTechnicianNames({
      taskTechnicians: ["David Monteiro", "Hugo Lança", "Não atribuído", ""],
      liveTechnicianNames: ["Hugo Lança", "Elsa Brito"],
    });
    expect(names).toEqual(["David Monteiro", "Elsa Brito", "Hugo Lança"]);
  });

  it("trata David Maneiro como David Monteiro", () => {
    const names = collectLegendTechnicianNames({
      taskTechnicians: ["David Manteiro", "David Monteiro"],
      liveTechnicianNames: ["David Maneiro"],
    });
    expect(names).toEqual(["David Monteiro"]);
  });
});
