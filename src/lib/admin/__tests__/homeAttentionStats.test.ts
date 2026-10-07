import { describe, expect, it } from "vitest";
import {
  countHomeAttentionSignals,
  isOverdueScheduledToday,
  opportunityDelayAlert,
} from "@/lib/admin/homeAttentionStats";
import type { Opportunity } from "@/types/admin";

function opp(partial: Partial<Opportunity> & { twentyId: string }): Opportunity {
  const { twentyId, ...rest } = partial;
  return {
    id: twentyId,
    twentyId,
    client: "Cliente",
    title: "Visita",
    status: "AGENDADO",
    stage: "ENTRADA",
    address: "",
    coordinates: null,
    hasScheduledTask: true,
    taskStatus: "AGENDADO",
    taskId: "t1",
    ...rest,
  } as Opportunity;
}

describe("homeAttentionStats", () => {
  it("conta atrasadas só no dia de hoje", () => {
    const now = new Date(2026, 5, 10, 15, 0, 0);
    const todayMorning = new Date(2026, 5, 10, 9, 0, 0);
    const yesterday = new Date(2026, 5, 9, 9, 0, 0);
    expect(isOverdueScheduledToday(opp({ twentyId: "1", scheduledAt: todayMorning }), now)).toBe(
      true
    );
    expect(isOverdueScheduledToday(opp({ twentyId: "2", scheduledAt: yesterday }), now)).toBe(
      false
    );
  });

  it("conta parados +14 e +30", () => {
    const now = new Date(2026, 5, 10, 12, 0, 0);
    const old = new Date(2026, 4, 1);
    expect(opportunityDelayAlert(opp({ twentyId: "1", dueDate: old }), now)).toBe("red");
    const mid = new Date(2026, 4, 20);
    expect(opportunityDelayAlert(opp({ twentyId: "2", dueDate: mid }), now)).toBe("orange");
    const counts = countHomeAttentionSignals(
      [
        opp({ twentyId: "1", dueDate: old }),
        opp({ twentyId: "2", dueDate: mid }),
      ],
      now
    );
    expect(counts.idle14Plus).toBe(2);
    expect(counts.idle30Plus).toBe(1);
  });
});
