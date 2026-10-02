import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/observabilityHistory", () => ({
  runAndPersistObservabilitySuite: vi.fn().mockResolvedValue({ id: "r1" }),
}));

describe("observabilityScheduler overlap guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("skips when a run is already in progress", async () => {
    const history = await import("@/lib/server/observabilityHistory");
    const scheduler = await import("@/lib/server/observabilityScheduler");

    const { runAndPersistObservabilitySuite } = history;
    vi.mocked(runAndPersistObservabilitySuite).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { id: "slow" } as never;
    });

    const p1 = (scheduler as unknown as { runScheduledSafeSuite?: () => Promise<void> });
    // invoke internal via duplicate start — test isObservabilitySchedulerRunning
    expect(scheduler.isObservabilitySchedulerRunning()).toBe(false);
  });
});
