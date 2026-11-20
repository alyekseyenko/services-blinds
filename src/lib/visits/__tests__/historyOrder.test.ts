import { describe, expect, it } from "vitest";
import { technicianHistorySortTime } from "../historyOrder";

describe("technicianHistorySortTime", () => {
  it("ordena pela data da visita e ignora um updatedAt mais recente", () => {
    const olderVisit = technicianHistorySortTime({
      dueDate: new Date("2026-10-02T10:00:00.000Z"),
      updatedAt: new Date("2026-11-18T12:00:00.000Z"),
    });
    const newerVisit = technicianHistorySortTime({
      dueDate: new Date("2026-11-17T10:00:00.000Z"),
      updatedAt: new Date("2026-11-01T12:00:00.000Z"),
    });
    expect(newerVisit).toBeGreaterThan(olderVisit);
  });
});
