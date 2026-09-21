import { describe, it, expect } from "vitest";
import {
  computeWarehouseStats,
  filterWarehouseServices,
  getWarehouseGreeting,
} from "../preparationStats";
import type { WarehouseService } from "@/lib/warehouse/types";

const baseService: WarehouseService = {
  id: "1",
  title: "Cliente Alpha",
  nsi: "NSI-100",
  client: "Alpha Lda",
  createdAt: "2026-01-01",
  measurements: {
    groups: [
      {
        id: "g1",
        type: "Rolo",
        measurements: [
          {
            id: "m1",
            qty: 1,
            width: 100,
            height: 120,
            isPrepared: true,
            estadoDoArmazem: "PREPARADO",
          },
        ],
      },
    ],
  },
};

describe("preparationStats", () => {
  it("returns greeting by time of day", () => {
    expect(getWarehouseGreeting(new Date("2026-01-01T09:00:00"))).toBe("Bom dia");
    expect(getWarehouseGreeting(new Date("2026-01-01T15:00:00"))).toBe("Boa tarde");
    expect(getWarehouseGreeting(new Date("2026-01-01T21:00:00"))).toBe("Boa noite");
  });

  it("filters services by title, nsi or client", () => {
    const services = [
      baseService,
      { ...baseService, id: "2", title: "Cliente Beta", client: "Beta", nsi: "NSI-200" },
    ];
    expect(filterWarehouseServices(services, "alpha")).toHaveLength(1);
    expect(filterWarehouseServices(services, "NSI-100")).toHaveLength(1);
    expect(filterWarehouseServices(services, "beta")).toHaveLength(1);
  });

  it("computes warehouse stats", () => {
    const problemService: WarehouseService = {
      ...baseService,
      id: "2",
      measurements: {
        groups: [
          {
            id: "g2",
            type: "Rolo",
            measurements: [
              {
                id: "m2",
                qty: 1,
                width: 100,
                height: 120,
                isPrepared: false,
                estadoDoArmazem: "PROBLEMAS",
              },
            ],
          },
        ],
      },
    };

    const stats = computeWarehouseStats([baseService, problemService]);
    expect(stats.pending).toBe(2);
    expect(stats.fullyPrepared).toBe(1);
    expect(stats.withProblems).toBe(1);
  });
});
