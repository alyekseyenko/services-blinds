import { describe, it, expect } from "vitest";
import {
  autoDistributedStopTimes,
  computeRouteSlots,
  duplicateMassStopTimeMessage,
  findScheduleConflicts,
  massStopDueAt,
} from "../routeScheduleSlots";
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

describe("mass stop times", () => {
  it("usa 09:00 quando a paragem ainda não tem hora própria", () => {
    const due = massStopDueAt("2026-09-25", {}, "opp-1");
    expect(due?.getHours()).toBe(9);
    expect(due?.getMinutes()).toBe(0);
  });

  it("reparte só quando pedido, a começar às 08:30", () => {
    const times = autoDistributedStopTimes("2026-09-25", ["a", "b"]);
    expect(times).toEqual({ a: "08:30", b: "10:15" });
  });

  it("avisa quando duas paragens ficam à mesma hora", () => {
    expect(
      duplicateMassStopTimeMessage([
        { title: "Medição", time: "09:00" },
        { title: "Reparação", time: "09:00" },
      ])
    ).toContain("mesma hora");
    expect(
      duplicateMassStopTimeMessage([
        { title: "Medição", time: "09:00" },
        { title: "Reparação", time: "11:00" },
      ])
    ).toBeNull();
  });
});

describe("findScheduleConflicts", () => {
  it("detects the same clock time for the same technician", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:00:00") }],
      [makeOpp({ technicianId: "tech-joao" })],
      "João Silva",
      { technicianId: "tech-joao" }
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictingTitle).toBe("Existing visit");
  });

  it("detecta sobreposição quando cai dentro do bloco de 1 h existente", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:30:00") }],
      [makeOpp({ technicianId: "tech-joao" })],
      "João Silva",
      { technicianId: "tech-joao" }
    );

    expect(conflicts).toHaveLength(1);
  });

  it("ignora visitas separadas no mesmo dia sem sobreposição", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T11:00:00") }],
      [makeOpp({ technicianId: "tech-joao" })],
      "João Silva",
      { technicianId: "tech-joao" }
    );

    expect(conflicts).toHaveLength(0);
  });

  it("detecta sobreposição com hora de fim no CRM", () => {
    const conflicts = findScheduleConflicts(
      [
        {
          title: "New stop",
          dueAt: new Date("2026-09-25T10:00:00"),
          endAt: new Date("2026-09-25T11:00:00"),
        },
      ],
      [
        makeOpp({
          technicianId: "tech-joao",
          scheduledAt: new Date("2026-09-25T08:00:00"),
          scheduledEndAt: new Date("2026-09-25T13:00:00"),
        }),
      ],
      "João Silva",
      { technicianId: "tech-joao" }
    );

    expect(conflicts).toHaveLength(1);
  });

  it("ignores the same hour when the technician is different", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:00:00") }],
      [makeOpp({ technician: "João Silva", technicianId: "tech-maria" })],
      "João Silva",
      { technicianId: "tech-joao" }
    );

    expect(conflicts).toHaveLength(0);
  });

  it("ignores visits assigned to other technicians", () => {
    const conflicts = findScheduleConflicts(
      [{ title: "New stop", dueAt: new Date("2026-09-25T10:00:00") }],
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
