import { describe, it, expect, beforeEach } from "vitest";
import { syncTelemetryStore } from "../syncTelemetryStore";

describe("syncTelemetryStore", () => {
  beforeEach(() => {
    syncTelemetryStore.clear();
  });

  it("agrega pending e failed por técnico", () => {
    syncTelemetryStore.upsert({
      technicianId: "tech-1",
      technicianName: "João",
      pendingCount: 2,
      failedCount: 1,
      isOnline: true,
    });
    syncTelemetryStore.upsert({
      technicianId: "tech-2",
      technicianName: "Maria",
      pendingCount: 0,
      failedCount: 3,
      isOnline: false,
    });

    const summary = syncTelemetryStore.getSummary();
    expect(summary.technicianCount).toBe(2);
    expect(summary.totalPending).toBe(2);
    expect(summary.totalFailed).toBe(4);
    expect(summary.techniciansWithFailures).toBe(2);
    expect(summary.technicians[0].technicianName).toBe("Maria");
  });
});
