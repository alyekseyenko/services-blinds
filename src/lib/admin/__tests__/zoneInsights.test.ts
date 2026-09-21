import { describe, it, expect } from "vitest";
import { computeZoneInsights } from "../zoneInsights";
import type { Opportunity } from "@/types/admin";

const HQ: [number, number] = [38.72, -9.14];

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "1",
    twentyId: "tw-1",
    title: "Test",
    client: "Client",
    address: "Rua X, Lisboa",
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

describe("computeZoneInsights", () => {
  it("returns empty array when no opportunities", () => {
    expect(computeZoneInsights([], HQ)).toEqual([]);
  });

  it("groups unscheduled opportunities by city", () => {
    const insights = computeZoneInsights(
      [
        makeOpp({ id: "1", addressCity: "Lisboa" }),
        makeOpp({ id: "2", addressCity: "Lisboa" }),
        makeOpp({ id: "3", addressCity: "Porto", coordinates: [41.15, -8.61] }),
      ],
      HQ
    );

    expect(insights.length).toBeGreaterThanOrEqual(2);
    const lisboa = insights.find((z) => z.name === "Lisboa");
    expect(lisboa?.count).toBe(2);
  });

  it("excludes already scheduled opportunities", () => {
    const insights = computeZoneInsights(
      [makeOpp({ hasScheduledTask: true })],
      HQ
    );
    expect(insights).toEqual([]);
  });
});
