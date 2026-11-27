import { describe, expect, it } from "vitest";
import {
  assistantNamesFromCeoTask,
  creditTeamSupportVisits,
  teamSizeFromCeoTask,
} from "@/lib/ceo/teamStats";

describe("teamStats", () => {
  it("calcula tamanho da equipa a partir dos IDs delimitados", () => {
    expect(
      teamSizeFromCeoTask({
        equipaAuxiliarIds: "|a|b|",
      })
    ).toBe(3);
  });

  it("atribui visitas concluídas aos auxiliares no ranking de apoio", () => {
    const support: Record<string, number> = {};
    creditTeamSupportVisits(
      {
        status: "CONCLUIDO",
        equipaAuxiliarIds: "|id-1|",
        equipaAuxiliarNomes: "André Ribeiro",
      },
      support
    );
    expect(support["André Ribeiro"]).toBe(1);
    expect(assistantNamesFromCeoTask({ equipaAuxiliarIds: "|x|", equipaAuxiliarNomes: "Gabriel" })).toEqual([
      "Gabriel",
    ]);
  });
});