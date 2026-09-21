import { describe, it, expect } from "vitest";
import {
  calculateOptimizedRoute,
  selectRouteStopsForZone,
  selectRouteStopsNearLocation,
} from "../routeOptimization";
import type { Opportunity } from "@/types/admin";

const HQ: [number, number] = [38.72, -9.14];

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "1",
    twentyId: "tw-1",
    title: "Test",
    client: "Client",
    address: "Lisboa",
    coordinates: [38.73, -9.15],
    stage: "ENTRADA",
    status: "Open",
    scheduledAt: null,
    dueDate: new Date(),
    hasScheduledTask: false,
    taskStatus: "",
    taskId: "",
    addressCity: "Lisboa",
    ...overrides,
  };
}

describe("routeOptimization", () => {
  it("returns null when no stops selected", () => {
    expect(calculateOptimizedRoute([], HQ)).toBeNull();
  });

  it("orders stops and appends return-to-hq", () => {
    const stops = [
      {
        id: "a",
        twentyId: "tw-a",
        title: "A",
        client: "A",
        address: "A",
        coordinates: [38.73, -9.15] as [number, number],
      },
      {
        id: "b",
        twentyId: "tw-b",
        title: "B",
        client: "B",
        address: "B",
        coordinates: [38.74, -9.16] as [number, number],
      },
    ];

    const result = calculateOptimizedRoute(stops, HQ);
    expect(result).not.toBeNull();
    expect(result!.optimizedRoute.length).toBe(3);
    expect(result!.optimizedRoute[2].isReturn).toBe(true);
    expect(result!.savingRatio).toBeGreaterThan(0);
  });

  it("selects nearest stops for a zone", () => {
    const opps = [
      makeOpp({ id: "1", addressCity: "Lisboa", coordinates: [38.73, -9.15] }),
      makeOpp({ id: "2", addressCity: "Porto", coordinates: [41.15, -8.61] }),
      makeOpp({ id: "3", addressCity: "lisboa", coordinates: [38.731, -9.151] }),
    ];

    const selection = selectRouteStopsForZone(opps, "Lisboa", HQ, 2);
    expect(selection.length).toBe(2);
    expect(selection.length).toBeGreaterThan(0);
  });

  it("selects stops within radius of search location", () => {
    const opps = [
      makeOpp({ id: "near", coordinates: [38.73, -9.15] }),
      makeOpp({ id: "far", coordinates: [40.64, -8.65] }),
    ];

    const selection = selectRouteStopsNearLocation(opps, HQ, 40, 5);
    expect(selection.map((s) => s.id)).toEqual(["near"]);
  });
});
