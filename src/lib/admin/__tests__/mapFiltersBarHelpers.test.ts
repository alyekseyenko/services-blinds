import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  formatActiveTypeLabel,
  priorityLabel,
  withoutGpsHeading,
  withoutGpsIdentity,
} from "@/lib/admin/mapFiltersBarHelpers";

describe("mapFiltersBarHelpers", () => {
  it("countActiveFilters ignora unscheduled por defeito", () => {
    expect(
      countActiveFilters("unscheduled", [], "all", false, null, null, [])
    ).toBe(0);
    expect(
      countActiveFilters("scheduled", [], "all", false, null, null, [])
    ).toBe(1);
  });

  it("formatActiveTypeLabel resume multi-seleção", () => {
    expect(formatActiveTypeLabel([])).toBe("Todos os tipos");
    expect(formatActiveTypeLabel(["INSTALACAO", "MANUTENCAO"])).toBe("2 tipos");
  });

  it("priorityLabel em pt-PT", () => {
    expect(priorityLabel("Critical")).toBe("Crítica");
    expect(priorityLabel("Low")).toBe("Baixa");
  });

  it("withoutGpsHeading e identity", () => {
    const svc = {
      twentyId: "1",
      client: "Cliente A",
      title: "Visita",
      address: "Rua",
    };
    expect(withoutGpsHeading(svc)).toBe("Cliente A");
    expect(withoutGpsIdentity({ ...svc, serviceNumber: "42" })).toContain("N.º 42");
  });
});