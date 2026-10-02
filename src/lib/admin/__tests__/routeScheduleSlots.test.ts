import { describe, it, expect } from "vitest";
import { computeRouteSlots, findScheduleConflicts } from "../routeScheduleSlots";
import type { ConflictCheckOpportunity } from "../routeScheduleSlots";

function makeOpp(overrides: Partial<ConflictCheckOpportunity> = {}): ConflictCheckOpportunity {
  return {
    title: "Existing visit",
    status: "Open",
    scheduledAt: new Date("2026-09-25T10:00:00"),
    technician: "João Silva",
    ...overrides,
  };
}

describe("computeRouteSlots", () => {
  it("returns empty list for invalid input", () => {
    expect(computeRouteSlots("", 3)).toEqual([]);
    expect(computeRouteSlots("2026-09-25", 0)).toEqual([]);
  });

  it("creates sequential slots starting at 08:30", () => {
    const slots = computeRouteSlots("2026-09-25", 2);
    expect(slots).toHaveLength(2);
    expect(slots[0].dueAt.getHours()).toBe(8);
    expect(slots[0].dueAt.getMinutes()).toBe(30);
    expect(slots[1].dueAt.getHours()).toBe(10);
    expect(slots[1].dueAt.getMinutes()).toBe(15);
  });

  it("skips lunch break between 13:00 and 14:00", () => {
    const slots = computeRouteSlots("2026-09-25", 4);
    const lunchSlot = slots.find((slot) => {
      const hour = slot.dueAt.getHours();
      return hour >= 13 && hour < 14;
    });
    expect(lunchSlot).toBeUndefined();
  });
});

describe("findScheduleConflicts", () => {
  it("detects overlapping visits for the same technician", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:30:00") }],
      [makeOpp()],
      "João Silva"
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictingTitle).toBe("Existing visit");
  });

  it("ignores visits assigned to other technicians", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:30:00") }],
      [makeOpp({ technician: "Maria Costa" })],
      "João Silva"
    );

    expect(conflicts).toHaveLength(0);
  });

  it("ignores opportunities being scheduled in the same batch", () => {
    const conflicts = findScheduleConflicts(
      [
        { title: "Stop A", dueAt: new Date("2026-09-25T08:30:00"), opportunityId: "opp-a" },
        { title: "Stop B", dueAt: new Date("2026-09-25T10:15:00"), opportunityId: "opp-b" },
      ],
      [
        makeOpp({
          title: "Stop A",
          twentyId: "opp-a",
          scheduledAt: new Date("2026-09-25T08:30:00"),
        }),
        makeOpp({
          title: "Stop B",
          twentyId: "opp-b",
          scheduledAt: new Date("2026-09-25T10:15:00"),
        }),
      ],
      "João Silva",
      { excludeOpportunityIds: ["opp-a", "opp-b"] }
    );

    expect(conflicts).toHaveLength(0);
  });
});
