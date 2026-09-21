import { describe, it, expect } from "vitest";
import { filterCeoServices, getMaxMonthTotal } from "../serviceFilters";
import type { CeoServiceItem } from "@/lib/schemas/ceoMetrics";

const baseItem: CeoServiceItem = {
  id: "1",
  name: "Cliente Alpha",
  stage: "ENTRADA",
  stageLabel: "Entrada",
  createdAt: "2026-01-01",
  formattedDate: "01/01/2026",
  year: 2026,
  month: 3,
  monthName: "Março",
  formattedAmount: "€100",
  financialStatus: "PIPELINE",
  nsi: "NSI-100",
  technician: "João",
  serviceType: "Medição",
};

describe("serviceFilters", () => {
  it("filters by month, stage and search query", () => {
    const items = [
      baseItem,
      { ...baseItem, id: "2", month: 4, name: "Cliente Beta", nsi: "NSI-200" },
    ];

    const result = filterCeoServices(items, {
      selectedMonth: 3,
      stageFilter: "ENTRADA",
      searchQuery: "alpha",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns max month total with floor of 1", () => {
    expect(getMaxMonthTotal([])).toBe(1);
    expect(getMaxMonthTotal([{ total: 0 }, { total: 5 }])).toBe(5);
  });
});
