import { describe, expect, it } from "vitest";
import {
  addCalendarDaysYmd,
  historyFilterQuery,
  historyTechnicianFilterOptions,
  isValidHistoryYmd,
  matchesHistoryDateRange,
  matchesHistoryVisitDate,
  matchesTaskHistoryOutcomes,
  parseHistoryYmd,
  resolveHistoryDateRange,
  toLisbonYmd,
} from "../historyFilters";

const NOON_LISBON = new Date("2026-11-18T12:00:00.000Z");

describe("historyFilters", () => {
  it("aceita apenas datas civis YYYY-MM-DD", () => {
    expect(isValidHistoryYmd("2026-11-18")).toBe(true);
    expect(isValidHistoryYmd("2026-13-01")).toBe(false);
    expect(parseHistoryYmd(" 2026-11-18 ")).toBe("2026-11-18");
    expect(parseHistoryYmd("ontem")).toBeNull();
  });

  it("converte o instante para o dia em Lisboa", () => {
    expect(toLisbonYmd("2026-11-18T00:30:00.000Z")).toBe("2026-11-18");
    expect(toLisbonYmd("2026-11-17T23:30:00.000Z")).toBe("2026-11-17");
  });

  it("resolve atalhos de 7 e 30 dias inclusive", () => {
    expect(resolveHistoryDateRange("today", null, null, NOON_LISBON)).toEqual({
      from: "2026-11-18",
      to: "2026-11-18",
    });
    expect(resolveHistoryDateRange("7d", null, null, NOON_LISBON)).toEqual({
      from: "2026-11-12",
      to: "2026-11-18",
    });
    expect(addCalendarDaysYmd("2026-11-18", -29)).toBe("2026-10-20");
    expect(resolveHistoryDateRange("30d", null, null, NOON_LISBON)).toEqual({
      from: "2026-10-20",
      to: "2026-11-18",
    });
  });

  it("desde fica sem data final e entre troca se as datas vierem invertidas", () => {
    expect(resolveHistoryDateRange("from", "2026-01-01", "2026-12-31", NOON_LISBON)).toEqual({
      from: "2026-01-01",
    });
    expect(resolveHistoryDateRange("between", "2026-11-20", "2026-11-10", NOON_LISBON)).toEqual({
      from: "2026-11-10",
      to: "2026-11-20",
    });
    expect(resolveHistoryDateRange("all", "2026-01-01", "2026-02-01", NOON_LISBON)).toEqual({});
  });

  it("filtra visitas no intervalo inclusivo", () => {
    const range = { from: "2026-11-10", to: "2026-11-18" };
    expect(matchesHistoryDateRange("2026-11-10", range)).toBe(true);
    expect(matchesHistoryDateRange("2026-11-18", range)).toBe(true);
    expect(matchesHistoryDateRange("2026-11-09", range)).toBe(false);
    expect(matchesHistoryVisitDate({ historyAt: "2026-11-12T09:00:00.000Z" }, range)).toBe(true);
    expect(matchesHistoryVisitDate({ dueDate: "2026-11-01T09:00:00.000Z" }, range)).toBe(false);
    expect(matchesHistoryVisitDate({ historyAt: "2026-11-12T09:00:00.000Z" }, {})).toBe(true);
  });

  it("filtra o tipo da visita do técnico", () => {
    expect(matchesTaskHistoryOutcomes("CONCLUIDO", [])).toBe(true);
    expect(matchesTaskHistoryOutcomes("CONCLUIDO", ["completed"])).toBe(true);
    expect(matchesTaskHistoryOutcomes("CANCELADO", ["completed"])).toBe(false);
    expect(matchesTaskHistoryOutcomes("INCOMPLETO", ["incomplete", "cancelled"])).toBe(true);
  });

  it("monta a query do histórico admin", () => {
    expect(
      historyFilterQuery({
        page: 2,
        from: "2026-11-01",
        to: "2026-11-18",
        outcomes: ["completed", "cancelled"],
      })
    ).toBe("?page=2&from=2026-11-01&to=2026-11-18&outcomes=completed%2Ccancelled");
  });

  it("o filtro de técnico no Histórico inclui a equipa toda e os nomes das visitas", () => {
    expect(
      historyTechnicianFilterOptions(
        ["Hugo Lança", "Não Atribuído"],
        [{ technician: "Hugo Lança" }],
        ["David Monteiro", "Hugo Lança"]
      )
    ).toEqual(["David Monteiro", "Hugo Lança", "Não Atribuído"]);
  });
});
