import { describe, expect, it } from "vitest";
import { sortMapServicesForList } from "@/lib/admin/mapServicesListSort";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity> & { id: string }): Opportunity {
  return {
    twentyId: partial.id,
    title: partial.title ?? "Serviço",
    client: partial.client ?? "Cliente",
    address: partial.address ?? "Rua",
    coordinates: null,
    stage: partial.stage ?? "POR_AGENDAR",
    status: partial.status ?? "TODO",
    scheduledAt: partial.scheduledAt ?? null,
    dueDate: null,
    hasScheduledTask: partial.hasScheduledTask ?? false,
    taskStatus: partial.taskStatus ?? "",
    taskId: partial.taskId ?? "t1",
    ...partial,
  };
}

describe("sortMapServicesForList", () => {
  it("prioriza atrasos longos em por agendar", () => {
    const sorted = sortMapServicesForList(
      [
        opp({ id: "a", client: "A", delayAlert: null, delayDays: 5 }),
        opp({ id: "b", client: "B", delayAlert: "red", delayDays: 40 }),
      ],
      "unscheduled"
    );
    expect(sorted[0].id).toBe("b");
  });

  it("ordena agendados por data", () => {
    const sorted = sortMapServicesForList(
      [
        opp({
          id: "late",
          hasScheduledTask: true,
          scheduledAt: "2026-03-10T10:00:00Z",
        }),
        opp({
          id: "soon",
          hasScheduledTask: true,
          scheduledAt: "2026-03-08T10:00:00Z",
        }),
      ],
      "scheduled"
    );
    expect(sorted[0].id).toBe("soon");
  });
});
