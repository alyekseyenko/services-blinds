import { describe, it, expect } from "vitest";
import {
  yearToUtcRange,
  recentYears,
  ADMIN_HISTORY_PAGE_SIZE,
  isTerminalHistoryStatus,
} from "../dateFilters";

describe("dateFilters", () => {
  it("gera intervalo UTC para um ano", () => {
    const { gte, lte } = yearToUtcRange(2026);
    expect(gte).toBe("2026-01-01T00:00:00.000Z");
    expect(lte).toBe("2026-12-31T23:59:59.999Z");
  });

  it("lista anos recentes decrescentes", () => {
    expect(recentYears(3, 2026)).toEqual([2026, 2025, 2024]);
  });

  it("expõe tamanho de página do histórico admin", () => {
    expect(ADMIN_HISTORY_PAGE_SIZE).toBe(50);
  });

  it("identifica estados terminais do histórico", () => {
    expect(isTerminalHistoryStatus("CONCLUIDO")).toBe(true);
    expect(isTerminalHistoryStatus("AGENDADO")).toBe(false);
  });
});
